-- 0033 — The edge's bookkeeping RPCs are service-role only.
--
-- ask_quota, ask_log and ask_record_tier are SECURITY DEFINER and were called
-- by the worker with the public anon key, so anyone could call them too:
-- ~300 POSTs to /rest/v1/rpc/ask_quota used up daily_global_cap and switched
-- /ask off for everyone, and ask_log accepted forged conversations of any size.
-- ask_eval_budget / ask_eval_record were revoked from anon and authenticated in
-- 0022, but Postgres grants EXECUTE to PUBLIC on every new function, and anon
-- inherits PUBLIC — so resetting the judge's monthly spend counter still worked.
--
-- Every overload is covered by name (ask_quota and ask_log were each redefined
-- with new parameters), so a signature added later does not slip through.
--
-- Deploy the Functions that call these with the service-role key BEFORE
-- applying this, or /ask refuses every question until they are.

do $$
declare
  f regprocedure;
begin
  for f in
    select p.oid::regprocedure
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in ('ask_quota', 'ask_log', 'ask_record_tier', 'ask_eval_budget', 'ask_eval_record')
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end
$$;
