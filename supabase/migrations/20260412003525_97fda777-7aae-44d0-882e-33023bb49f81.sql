CREATE TABLE public.comment_mentions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL,
  mentioned_name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_comment_mentions_user ON public.comment_mentions(mentioned_user_id);
CREATE INDEX idx_comment_mentions_comment ON public.comment_mentions(comment_id);

ALTER TABLE public.comment_mentions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mentions readable by authenticated"
ON public.comment_mentions FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Mentions insertable by authenticated"
ON public.comment_mentions FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Mentions deletable by admin"
ON public.comment_mentions FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

ALTER PUBLICATION supabase_realtime ADD TABLE public.comment_mentions;