ALTER TABLE public.budget_scenarios
ADD COLUMN IF NOT EXISTS rejected_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS rejected_by uuid;

ALTER TABLE public.budget_scenarios
DROP CONSTRAINT IF EXISTS budget_scenarios_status_check;

ALTER TABLE public.budget_scenarios
ADD CONSTRAINT budget_scenarios_status_check
CHECK (status IN ('draft','submitted','approved','locked','rejected'));