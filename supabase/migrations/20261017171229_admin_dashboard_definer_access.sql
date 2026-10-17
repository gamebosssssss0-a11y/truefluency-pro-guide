-- The admin stats RPC reads a few server-private tables. Keep those source
-- tables inaccessible to clients and expose only its role-checked aggregates.
ALTER FUNCTION public.admin_dashboard_stats() SECURITY DEFINER;
ALTER FUNCTION public.admin_dashboard_stats() SET search_path = pg_catalog, public;

-- The function checks has_role(auth.uid(), 'admin') before reading or returning
-- any metrics. Allow only signed-in callers to reach that check.
REVOKE ALL ON FUNCTION public.admin_dashboard_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_dashboard_stats() TO authenticated, service_role;
