-- Force author identity on audit/log tables
CREATE OR REPLACE FUNCTION public.force_log_author()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _col text := TG_ARGV[0];
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF; -- server-side inserts
  IF _col = 'user_id' THEN NEW.user_id := auth.uid();
  ELSIF _col = 'author_id' THEN NEW.author_id := auth.uid();
  ELSIF _col = 'changed_by' THEN NEW.changed_by := auth.uid();
  ELSIF _col = 'uploaded_by' THEN NEW.uploaded_by := auth.uid();
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.force_log_author() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_force_author BEFORE INSERT ON public.activity_log FOR EACH ROW EXECUTE FUNCTION public.force_log_author('user_id');
CREATE TRIGGER trg_force_author BEFORE INSERT ON public.budget_audit_log FOR EACH ROW EXECUTE FUNCTION public.force_log_author('user_id');
CREATE TRIGGER trg_force_author BEFORE INSERT ON public.risk_history FOR EACH ROW EXECUTE FUNCTION public.force_log_author('changed_by');
CREATE TRIGGER trg_force_author BEFORE INSERT ON public.budget_line_comments FOR EACH ROW EXECUTE FUNCTION public.force_log_author('author_id');
CREATE TRIGGER trg_force_author BEFORE INSERT ON public.comment_attachments FOR EACH ROW EXECUTE FUNCTION public.force_log_author('uploaded_by');

-- Inserts limited to items the user can access
DROP POLICY "Audit log insertable by authenticated" ON public.budget_audit_log;
CREATE POLICY "Audit log insertable by scoped users" ON public.budget_audit_log FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.budget_lines bl WHERE bl.id = budget_line_id AND (bl.country_id IS NULL OR public.can_access_country(auth.uid(), bl.country_id))));

DROP POLICY "Line comments insertable" ON public.budget_line_comments;
CREATE POLICY "Line comments insertable by scoped users" ON public.budget_line_comments FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.budget_lines bl WHERE bl.id = budget_line_id AND (bl.country_id IS NULL OR public.can_access_country(auth.uid(), bl.country_id))));

DROP POLICY "Risk history insertable" ON public.risk_history;
CREATE POLICY "Risk history insertable by scoped users" ON public.risk_history FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.risks r WHERE r.id = risk_id AND (r.country_id IS NULL OR public.can_access_country(auth.uid(), r.country_id))));

DROP POLICY "Activity insertable by authenticated" ON public.activity_log;
CREATE POLICY "Activity insertable by scoped users" ON public.activity_log FOR INSERT TO authenticated
WITH CHECK (market_flag IS NULL OR market_flag = '' OR public.can_access_country(auth.uid(), market_flag));

-- Notifications: no forging for others
DROP POLICY "Notifications insertable by authenticated" ON public.notifications;
CREATE POLICY "Notifications insertable for self" ON public.notifications FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY "Notifications insertable" ON public.budget_notifications;
CREATE POLICY "Budget notifications insertable for approvers" ON public.budget_notifications FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() OR user_id IN (SELECT a.user_id FROM public.approver_user_ids() a));

-- Subtasks scoped by parent task country
DROP POLICY "Subtasks readable" ON public.subtasks;
DROP POLICY "Subtasks insertable" ON public.subtasks;
DROP POLICY "Subtasks updatable" ON public.subtasks;
DROP POLICY "Subtasks deletable" ON public.subtasks;
CREATE POLICY "Subtasks readable by scoped users" ON public.subtasks FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND public.can_access_country(auth.uid(), t.country_id)));
CREATE POLICY "Subtasks insertable by scoped users" ON public.subtasks FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND public.can_access_country(auth.uid(), t.country_id)));
CREATE POLICY "Subtasks updatable by scoped users" ON public.subtasks FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND public.can_access_country(auth.uid(), t.country_id)));
CREATE POLICY "Subtasks deletable by scoped users" ON public.subtasks FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND public.can_access_country(auth.uid(), t.country_id)));

-- Scenario versions & segments scoped by scenario country
DROP POLICY "Versions readable" ON public.budget_scenario_versions;
CREATE POLICY "Versions readable by scoped users" ON public.budget_scenario_versions FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.budget_scenarios s WHERE s.id = scenario_id AND (s.country_scope IS NULL OR public.can_access_country(auth.uid(), s.country_scope))));
DROP POLICY "Seg readable" ON public.budget_segments;
CREATE POLICY "Seg readable by scoped users" ON public.budget_segments FOR SELECT TO authenticated
USING (public.user_scope_country(auth.uid()) IS NULL OR public.user_scope_country(auth.uid()) = ANY(country_ids));

-- Comment attachments scoped by comment market
DROP POLICY "Attachments readable" ON public.comment_attachments;
CREATE POLICY "Attachments readable by scoped users" ON public.comment_attachments FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.comments c WHERE c.id = comment_id AND (c.market_id IS NULL OR public.can_access_country(auth.uid(), c.market_id))));
DROP POLICY "Attachments insertable" ON public.comment_attachments;
CREATE POLICY "Attachments insertable by comment author" ON public.comment_attachments FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.comments c WHERE c.id = comment_id AND c.author_id = auth.uid()));

DROP POLICY "Comment attachments readable by authenticated" ON storage.objects;
CREATE POLICY "Comment attachments readable by scoped users" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'comment-attachments' AND EXISTS (
  SELECT 1 FROM public.comments c
  WHERE c.id::text = (storage.foldername(name))[1]
    AND (c.market_id IS NULL OR public.can_access_country(auth.uid(), c.market_id))));
DROP POLICY "Comment attachments uploadable by authenticated" ON storage.objects;
CREATE POLICY "Comment attachments uploadable by comment author" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'comment-attachments' AND EXISTS (
  SELECT 1 FROM public.comments c
  WHERE c.id::text = (storage.foldername(name))[1] AND c.author_id = auth.uid()));