-- Access rules: deny by default, explicit grants, RLS on every table.
-- Design: docs/technical-design.md §4 "Access rules"; ADR 0002 for allocation_demand.

-- Start from nothing: remove Supabase's default broad grants.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, authenticated, public;

alter table public.profiles enable row level security;
alter table public.solutions enable row level security;
alter table public.products enable row level security;
alter table public.product_requirements enable row level security;
alter table public.sites enable row level security;
alter table public.scenarios enable row level security;
alter table public.nominated_solutions enable row level security;
alter table public.crews enable row level security;
alter table public.planned_work enable row level security;
alter table public.planned_work_items enable row level security;
alter table public.stock enable row level security;
alter table public.expected_deliveries enable row level security;
alter table public.escalations enable row level security;
alter table public.escalation_lines enable row level security;
alter table public.escalation_notes enable row level security;
alter table public.assistant_usage enable row level security;

-- Helper functions ---------------------------------------------------------
-- security definer so policies can look up roles and crews without recursion.

create function public.is_project_manager()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'project_manager'
  );
$$;

create function public.leads_crew(target_crew_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.crews
    where id = target_crew_id and team_leader_id = auth.uid()
  );
$$;

create function public.can_read_planned_work(target_planned_work_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.is_project_manager() or exists (
    select 1 from public.planned_work pw
    join public.crews c on c.id = pw.crew_id
    where pw.id = target_planned_work_id and c.team_leader_id = auth.uid()
  );
$$;

create function public.can_read_site(target_site_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.is_project_manager() or exists (
    select 1 from public.planned_work pw
    join public.crews c on c.id = pw.crew_id
    where pw.site_id = target_site_id and c.team_leader_id = auth.uid()
  );
$$;

create function public.can_read_escalation(target_escalation_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.is_project_manager() or exists (
    select 1 from public.escalations e
    where e.id = target_escalation_id and e.raised_by = auth.uid()
  );
$$;

grant execute on function
  public.is_project_manager(),
  public.leads_crew(uuid),
  public.can_read_planned_work(uuid),
  public.can_read_site(uuid),
  public.can_read_escalation(uuid)
to authenticated;

-- Profiles -----------------------------------------------------------------

grant select (id, display_name, role, is_sample) on public.profiles to authenticated;
create policy "profiles: read own, project managers read all"
  on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_project_manager());

-- Catalogue: readable by any signed-in user --------------------------------

grant select on public.solutions, public.products, public.product_requirements to authenticated;
create policy "solutions: signed-in read" on public.solutions
  for select to authenticated using (true);
create policy "products: signed-in read" on public.products
  for select to authenticated using (true);
create policy "product_requirements: signed-in read" on public.product_requirements
  for select to authenticated using (true);

-- Sites and planning -------------------------------------------------------

grant select on public.sites, public.scenarios, public.nominated_solutions to authenticated;
create policy "sites: own crews' sites or project manager" on public.sites
  for select to authenticated using (public.can_read_site(id));
create policy "scenarios: own crews' sites or project manager" on public.scenarios
  for select to authenticated using (public.can_read_site(site_id));
create policy "nominated_solutions: own crews' sites or project manager" on public.nominated_solutions
  for select to authenticated using (
    exists (
      select 1 from public.scenarios s
      where s.id = scenario_id and public.can_read_site(s.site_id)
    )
  );

grant select on public.crews, public.planned_work, public.planned_work_items to authenticated;
create policy "crews: own or project manager" on public.crews
  for select to authenticated
  using (team_leader_id = auth.uid() or public.is_project_manager());
create policy "planned_work: own crews or project manager" on public.planned_work
  for select to authenticated
  using (public.leads_crew(crew_id) or public.is_project_manager());
create policy "planned_work_items: own crews or project manager" on public.planned_work_items
  for select to authenticated using (public.can_read_planned_work(planned_work_id));

-- Supply: readable by any signed-in user -----------------------------------

grant select on public.stock, public.expected_deliveries to authenticated;
create policy "stock: signed-in read" on public.stock
  for select to authenticated using (true);
create policy "expected_deliveries: signed-in read" on public.expected_deliveries
  for select to authenticated using (true);

-- Escalations --------------------------------------------------------------

grant select on public.escalations to authenticated;
grant insert (id, planned_work_id, shortage_cleared_at_sync) on public.escalations to authenticated;
grant update (state, resolution, resolution_comment, resolved_by, resolved_at)
  on public.escalations to authenticated;

create policy "escalations: raiser or project manager reads" on public.escalations
  for select to authenticated
  using (raised_by = auth.uid() or public.is_project_manager());

create policy "escalations: team leader raises on own crews' planned work" on public.escalations
  for insert to authenticated
  with check (
    raised_by = auth.uid()
    and state = 'open'
    and not public.is_project_manager()
    and exists (
      select 1 from public.planned_work pw
      where pw.id = planned_work_id and public.leads_crew(pw.crew_id)
    )
  );

create policy "escalations: project manager resolves" on public.escalations
  for update to authenticated
  using (public.is_project_manager() and state = 'open')
  with check (public.is_project_manager() and state = 'resolved' and resolved_by = auth.uid());

grant select on public.escalation_lines to authenticated;
grant insert (escalation_id, product_id, quantity_short, reason) on public.escalation_lines to authenticated;
create policy "escalation_lines: readable with the escalation" on public.escalation_lines
  for select to authenticated using (public.can_read_escalation(escalation_id));
create policy "escalation_lines: raiser adds to own open escalation" on public.escalation_lines
  for insert to authenticated
  with check (
    exists (
      select 1 from public.escalations e
      where e.id = escalation_id and e.raised_by = auth.uid() and e.state = 'open'
    )
  );

grant select on public.escalation_notes to authenticated;
grant insert (escalation_id, body) on public.escalation_notes to authenticated;
create policy "escalation_notes: readable with the escalation" on public.escalation_notes
  for select to authenticated using (public.can_read_escalation(escalation_id));
create policy "escalation_notes: raiser or project manager adds" on public.escalation_notes
  for insert to authenticated
  with check (author_id = auth.uid() and public.can_read_escalation(escalation_id));

-- Assistant usage: no direct table access; only through this function ------

create function public.record_assistant_message(max_per_hour integer)
returns table (allowed boolean, retry_at timestamptz)
language plpgsql volatile security definer set search_path = ''
as $$
declare
  current_window timestamptz := date_trunc('hour', now());
  used integer;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  insert into public.assistant_usage (user_id, window_start, message_count)
  values (auth.uid(), current_window, 0)
  on conflict (user_id, window_start) do nothing;

  select message_count into used
  from public.assistant_usage
  where user_id = auth.uid() and window_start = current_window
  for update;

  if used >= max_per_hour then
    return query select false, current_window + interval '1 hour';
    return;
  end if;

  update public.assistant_usage
  set message_count = message_count + 1
  where user_id = auth.uid() and window_start = current_window;

  return query select true, null::timestamptz;
end;
$$;
grant execute on function public.record_assistant_message(integer) to authenticated;

-- Allocation demand across all crews (ADR 0002) ----------------------------
-- Returns product demand for every planned work from from_date onwards.
-- Rows for other crews carry no crew, site or scenario details.
-- Quantities are unrounded sums; rounding up per planned work happens in the readiness module.

create function public.allocation_demand(from_date date)
returns table (
  planned_work_id uuid,
  work_date date,
  created_at timestamptz,
  product_id uuid,
  quantity numeric,
  is_own boolean
)
language sql stable security definer set search_path = ''
as $$
  select
    pw.id,
    pw.work_date,
    pw.created_at,
    pr.product_id,
    sum(pwi.penetration_count * pr.quantity_per_penetration),
    bool_or(c.team_leader_id = auth.uid())
  from public.planned_work pw
  join public.crews c on c.id = pw.crew_id
  join public.planned_work_items pwi on pwi.planned_work_id = pw.id
  join public.nominated_solutions ns on ns.scenario_id = pwi.scenario_id
  join public.product_requirements pr on pr.solution_id = ns.solution_id
  where auth.uid() is not null and pw.work_date >= from_date
  group by pw.id, pw.work_date, pw.created_at, pr.product_id;
$$;
grant execute on function public.allocation_demand(date) to authenticated;

-- New functions get EXECUTE for PUBLIC (and Supabase's API roles) by default.
-- Close that again so signed-out users cannot call any of them.
revoke execute on all functions in schema public from public, anon;
