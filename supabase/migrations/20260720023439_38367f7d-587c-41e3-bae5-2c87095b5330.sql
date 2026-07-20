
-- Pin search_path on remaining functions
alter function public.set_updated_at() set search_path = public;
alter function public.handle_new_user() set search_path = public;
alter function public.audit_trigger() set search_path = public;

-- Revoke default PUBLIC execute on SECURITY DEFINER helpers; allow authenticated only
do $$
declare fn text;
begin
  foreach fn in array array[
    'public.has_role(uuid, public.app_role)',
    'public.is_admin(uuid)',
    'public.is_org_member(uuid, uuid)',
    'public.owns_company(uuid, uuid)',
    'public.can_access_order(uuid, uuid)',
    'public.is_thread_member(uuid, uuid)',
    'public.handle_new_user()',
    'public.audit_trigger()',
    'public.set_updated_at()'
  ]
  loop
    execute format('revoke all on function %s from public, anon;', fn);
    execute format('grant execute on function %s to authenticated, service_role;', fn);
  end loop;
end $$;
