
REVOKE ALL ON FUNCTION public.create_notification(uuid, text, text, text, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_new_member() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_role_changed() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_document_uploaded() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_market_status_changed() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_budget_threshold() FROM PUBLIC, anon, authenticated;
