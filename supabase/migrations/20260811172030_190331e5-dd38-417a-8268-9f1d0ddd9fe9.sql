
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.can_access_country(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_country(uuid, text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.user_scope_country(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_scope_country(uuid) TO authenticated, service_role;
