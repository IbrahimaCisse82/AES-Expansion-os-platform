ALTER TABLE public.milestones 
ADD COLUMN start_date text NULL DEFAULT '',
ADD COLUMN end_date text NULL DEFAULT '';