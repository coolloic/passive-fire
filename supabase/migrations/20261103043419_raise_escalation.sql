-- Raise an escalation, its shortage lines and an optional note in one transaction.
-- security invoker: runs with the caller's rights, so every RLS policy still applies.
-- Idempotent on the device-created id (offline retries), and reports an existing Open
-- escalation for the same planned work instead of failing (spec AC-7.3, AC-10.3).
create function public.raise_escalation(
  p_id uuid,
  p_planned_work_id uuid,
  p_lines jsonb,
  p_note text,
  p_shortage_cleared boolean
)
returns table (status text, escalation_id uuid)
language plpgsql volatile security invoker set search_path = ''
as $$
declare
  found_id uuid;
begin
  select e.id into found_id from public.escalations e where e.id = p_id;
  if found_id is not null then
    return query select 'duplicate'::text, found_id;
    return;
  end if;

  select e.id into found_id
  from public.escalations e
  where e.planned_work_id = p_planned_work_id and e.state = 'open';
  if found_id is not null then
    return query select 'already_open'::text, found_id;
    return;
  end if;

  insert into public.escalations (id, planned_work_id, shortage_cleared_at_sync)
  values (p_id, p_planned_work_id, coalesce(p_shortage_cleared, false));

  insert into public.escalation_lines (escalation_id, product_id, quantity_short, reason)
  select
    p_id,
    nullif(line ->> 'product_id', '')::uuid,
    (line ->> 'quantity_short')::numeric,
    (line ->> 'reason')::public.escalation_line_reason
  from jsonb_array_elements(coalesce(p_lines, '[]'::jsonb)) as line;

  if p_note is not null and char_length(btrim(p_note)) > 0 then
    insert into public.escalation_notes (escalation_id, body) values (p_id, btrim(p_note));
  end if;

  return query select 'created'::text, p_id;
exception
  when unique_violation then
    -- Lost a race with another request for the same planned work or the same id.
    select e.id into found_id
    from public.escalations e
    where e.id = p_id or (e.planned_work_id = p_planned_work_id and e.state = 'open')
    limit 1;
    return query select case when found_id = p_id then 'duplicate' else 'already_open' end::text, found_id;
end;
$$;

revoke execute on function public.raise_escalation(uuid, uuid, jsonb, text, boolean) from public, anon;
grant execute on function public.raise_escalation(uuid, uuid, jsonb, text, boolean) to authenticated;
