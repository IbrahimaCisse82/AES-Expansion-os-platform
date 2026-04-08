
-- Budget audit log for cell-level change tracking
CREATE TABLE public.budget_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_line_id uuid NOT NULL,
  field_name text NOT NULL,
  old_value text,
  new_value text,
  user_id uuid,
  user_name text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.budget_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Audit log readable by authenticated"
  ON public.budget_audit_log FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Audit log insertable by authenticated"
  ON public.budget_audit_log FOR INSERT
  TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE INDEX idx_audit_log_line ON public.budget_audit_log(budget_line_id);
CREATE INDEX idx_audit_log_created ON public.budget_audit_log(created_at DESC);

-- Budget line comments
CREATE TABLE public.budget_line_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_line_id uuid NOT NULL,
  content text NOT NULL,
  author_id uuid,
  author_name text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.budget_line_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Line comments readable"
  ON public.budget_line_comments FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Line comments insertable"
  ON public.budget_line_comments FOR INSERT
  TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Line comments updatable by author or admin"
  ON public.budget_line_comments FOR UPDATE
  TO authenticated USING (auth.uid() = author_id OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Line comments deletable by author or admin"
  ON public.budget_line_comments FOR DELETE
  TO authenticated USING (auth.uid() = author_id OR has_role(auth.uid(), 'admin'));

CREATE INDEX idx_line_comments_line ON public.budget_line_comments(budget_line_id);

-- Budget notifications
CREATE TABLE public.budget_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id uuid NOT NULL,
  scenario_name text DEFAULT '',
  user_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'info',
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.budget_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own notifications"
  ON public.budget_notifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Notifications insertable"
  ON public.budget_notifications FOR INSERT
  TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own notifications"
  ON public.budget_notifications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications"
  ON public.budget_notifications FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_budget_notifs_user ON public.budget_notifications(user_id, is_read);
