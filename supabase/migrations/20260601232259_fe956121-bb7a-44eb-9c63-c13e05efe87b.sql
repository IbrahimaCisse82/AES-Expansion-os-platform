UPDATE public.user_roles SET role='admin' WHERE user_id='f2eca82b-fd22-40d4-9ff1-673f1037dcaf';
INSERT INTO public.user_roles (user_id, role)
SELECT 'f2eca82b-fd22-40d4-9ff1-673f1037dcaf', 'admin'
WHERE NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id='f2eca82b-fd22-40d4-9ff1-673f1037dcaf');