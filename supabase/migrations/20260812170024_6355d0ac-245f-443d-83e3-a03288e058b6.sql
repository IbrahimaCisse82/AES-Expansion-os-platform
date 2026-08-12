DROP POLICY IF EXISTS "Auth users can view docs" ON storage.objects;
DROP POLICY IF EXISTS "Auth users can upload docs" ON storage.objects;

CREATE POLICY "Country docs viewable by scoped users"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'country-documents' AND public.can_access_country(auth.uid(), split_part(name, '/', 1)));

CREATE POLICY "Country docs uploadable by scoped users"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'country-documents' AND public.can_access_country(auth.uid(), split_part(name, '/', 1)));

DROP POLICY IF EXISTS "Comment attachments readable" ON storage.objects;
DROP POLICY IF EXISTS "Comment attachments uploadable" ON storage.objects;
DROP POLICY IF EXISTS "Comment attachments deletable" ON storage.objects;

CREATE POLICY "Comment attachments readable by authenticated"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'comment-attachments');

CREATE POLICY "Comment attachments uploadable by authenticated"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'comment-attachments' AND auth.uid() IS NOT NULL);

CREATE POLICY "Comment attachments deletable by owner or admin"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'comment-attachments'
  AND (
    owner = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.comment_attachments ca
      WHERE ca.file_path = storage.objects.name AND ca.uploaded_by = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Lines readable" ON public.budget_lines;
CREATE POLICY "Lines readable by scoped users" ON public.budget_lines FOR SELECT TO authenticated
USING (country_id IS NULL OR public.can_access_country(auth.uid(), country_id));

DROP POLICY IF EXISTS "Budget readable" ON public.budget_entries;
CREATE POLICY "Budget readable by scoped users" ON public.budget_entries FOR SELECT TO authenticated
USING (country_id IS NULL OR public.can_access_country(auth.uid(), country_id));

DROP POLICY IF EXISTS "JE readable" ON public.budget_journal_entries;
CREATE POLICY "JE readable by scoped users" ON public.budget_journal_entries FOR SELECT TO authenticated
USING (country_id IS NULL OR public.can_access_country(auth.uid(), country_id));

DROP POLICY IF EXISTS "CapEx readable" ON public.budget_capex_items;
CREATE POLICY "CapEx readable by scoped users" ON public.budget_capex_items FOR SELECT TO authenticated
USING (country_id IS NULL OR public.can_access_country(auth.uid(), country_id));

DROP POLICY IF EXISTS "IC readable" ON public.budget_intercompany;
CREATE POLICY "IC readable by scoped users" ON public.budget_intercompany FOR SELECT TO authenticated
USING (
  public.can_access_country(auth.uid(), source_country_id)
  AND public.can_access_country(auth.uid(), target_country_id)
);

DROP POLICY IF EXISTS "Inv readable" ON public.budget_investments;
CREATE POLICY "Inv readable by consolidators" ON public.budget_investments FOR SELECT TO authenticated
USING (public.user_scope_country(auth.uid()) IS NULL);

DROP POLICY IF EXISTS "Alloc readable" ON public.budget_cost_allocations;
CREATE POLICY "Alloc readable by consolidators" ON public.budget_cost_allocations FOR SELECT TO authenticated
USING (public.user_scope_country(auth.uid()) IS NULL);

DROP POLICY IF EXISTS "Activity readable" ON public.activity_log;
CREATE POLICY "Activity readable by scoped users" ON public.activity_log FOR SELECT TO authenticated
USING (market_flag IS NULL OR market_flag = '' OR public.can_access_country(auth.uid(), market_flag));

DROP POLICY IF EXISTS "Audit log readable by authenticated" ON public.budget_audit_log;
CREATE POLICY "Audit log readable by scoped users" ON public.budget_audit_log FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.budget_lines bl
    WHERE bl.id = budget_audit_log.budget_line_id
      AND (bl.country_id IS NULL OR public.can_access_country(auth.uid(), bl.country_id))
  )
);