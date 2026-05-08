
ALTER TABLE public.tasks ALTER COLUMN country_id SET NOT NULL;
ALTER TABLE public.tasks ALTER COLUMN milestone_id SET NOT NULL;
ALTER TABLE public.tasks ALTER COLUMN assigned_to SET NOT NULL;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'Africa/Ouagadougou';
