-- Resolve an Open escalation (spec FR-8). Runs with the caller's rights so RLS applies; the
-- resolver and time are set here, never taken from the client.
create function public.resolve_escalation(
  p_id uuid,
  p_resolution public.escalation_resolution,
  p_comment text
)
returns text
language plpgsql volatile security invoker set search_path = ''
as $$
declare
  current_state public.escalation_state;
begin
  if not public.is_project_manager() then
    raise exception 'only project managers can resolve escalations' using errcode = '42501';
  end if;

  update public.escalations
  set state = 'resolved',
      resolution = p_resolution,
      resolution_comment = nullif(btrim(coalesce(p_comment, '')), ''),
      resolved_by = auth.uid(),
      resolved_at = now()
  where id = p_id and state = 'open';
  if found then
    return 'resolved';
  end if;

  select e.state into current_state from public.escalations e where e.id = p_id;
  return case when current_state is null then 'not_found' else 'not_open' end;
end;
$$;

revoke execute on function public.resolve_escalation(uuid, public.escalation_resolution, text) from public, anon;
grant execute on function public.resolve_escalation(uuid, public.escalation_resolution, text) to authenticated;
