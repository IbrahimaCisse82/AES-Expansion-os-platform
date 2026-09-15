/** Profils autorisés à accéder au module Business Intelligence (/app/bi). */
export const BI_ALLOWED_ROLES = [
  'admin',
  'director',
  'country_manager',
  'dhr',
  'technical_director',
  'commercial_director',
  'analyst',
  'raf',
] as const;

export function canAccessBi(role?: string | null): boolean {
  return BI_ALLOWED_ROLES.includes((role ?? 'observer') as (typeof BI_ALLOWED_ROLES)[number]);
}
