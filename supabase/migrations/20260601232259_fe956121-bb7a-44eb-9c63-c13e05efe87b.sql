-- Attribution du rôle admin au compte propriétaire de la production.
-- (Audit 2026-10-21) rendue conditionnelle : sans effet sur une base neuve
-- où ce compte n'existe pas, pour que le schéma se rejoue de zéro.
UPDATE public.user_roles SET role='admin' WHERE user_id='f2eca82b-fd22-40d4-9ff1-673f1037dcaf';
INSERT INTO public.user_roles (user_id, role)
SELECT 'f2eca82b-fd22-40d4-9ff1-673f1037dcaf', 'admin'
WHERE EXISTS (SELECT 1 FROM auth.users WHERE id='f2eca82b-fd22-40d4-9ff1-673f1037dcaf')
  AND NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id='f2eca82b-fd22-40d4-9ff1-673f1037dcaf');
