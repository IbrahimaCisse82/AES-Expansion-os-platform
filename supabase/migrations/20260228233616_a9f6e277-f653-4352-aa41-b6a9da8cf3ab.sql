
-- Fix permissive INSERT policies for comments and activity_log
DROP POLICY "Comments insertable" ON public.comments;
CREATE POLICY "Comments insertable by authenticated" ON public.comments FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY "Activity insertable" ON public.activity_log;
CREATE POLICY "Activity insertable by authenticated" ON public.activity_log FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
