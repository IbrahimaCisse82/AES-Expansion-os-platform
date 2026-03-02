
-- Allow comment authors and admins to update comments
CREATE POLICY "Comments updatable by author or admin"
  ON public.comments FOR UPDATE
  USING ((auth.uid() = author_id) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK ((auth.uid() = author_id) OR has_role(auth.uid(), 'admin'::app_role));
