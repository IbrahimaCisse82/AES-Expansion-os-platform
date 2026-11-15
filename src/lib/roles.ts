// Rôles de la plateforme (enum public.app_role) : libellés, périmètre et couleurs, partagés par tous les écrans.
export interface RoleDef { value: string; label: string; scope: string; color: string }

export const ROLES: RoleDef[] = [
  { value: 'admin', label: 'Administrateur', scope: 'Tous les environnements, gestion des utilisateurs', color: 'bg-destructive/15 text-destructive' },
  { value: 'director', label: 'Directeur général', scope: 'Pilotage, validation des rapports et budgets', color: 'bg-[hsl(var(--plum))]/15 text-[hsl(var(--plum))]' },
  { value: 'raf', label: 'RAF (Resp. Admin. & Financier)', scope: 'Finance, encaissements, validation A4', color: 'bg-[hsl(var(--terracotta))]/15 text-[hsl(var(--terracotta))]' },
  { value: 'commercial_director', label: 'Directeur commercial', scope: 'Technico-commercial, objectifs, ventes', color: 'bg-[hsl(var(--gold))]/15 text-[hsl(var(--gold))]' },
  { value: 'technical_director', label: 'Directeur technique', scope: 'Kits, stock, capacité, livraisons', color: 'bg-[hsl(var(--sky))]/15 text-[hsl(var(--sky))]' },
  { value: 'dhr', label: 'DRH', scope: 'KPI RH, rapports A5–A8, A11', color: 'bg-[hsl(var(--plum))]/15 text-[hsl(var(--plum))]' },
  { value: 'sales_rep', label: 'Commercial', scope: 'Devis et ventes (les siens)', color: 'bg-[hsl(var(--gold))]/15 text-[hsl(var(--gold))]' },
  { value: 'technician', label: 'Technicien', scope: 'Livraisons et installations, fiches A12', color: 'bg-[hsl(var(--sky))]/15 text-[hsl(var(--sky))]' },
  { value: 'logistics', label: 'Logistique / magasin', scope: 'Stock et achats', color: 'bg-[hsl(var(--sage))]/15 text-[hsl(var(--sage))]' },
  { value: 'country_manager', label: 'Country Manager', scope: 'Pilotage pays (expansion)', color: 'bg-[hsl(var(--sky))]/15 text-[hsl(var(--sky))]' },
  { value: 'analyst', label: 'Analyste', scope: 'Lecture et analyses BI', color: 'bg-[hsl(var(--gold))]/15 text-[hsl(var(--gold))]' },
  { value: 'observer', label: 'Observateur', scope: 'Lecture seule', color: 'bg-muted text-muted-foreground' },
  { value: 'partner', label: 'Partenaire', scope: 'Lecture seule, accès limité', color: 'bg-[hsl(var(--sage))]/15 text-[hsl(var(--sage))]' },
];

export const ROLE_LABEL: Record<string, string> = Object.fromEntries(ROLES.map(r => [r.value, r.label]));
export const ROLE_COLOR: Record<string, string> = Object.fromEntries(ROLES.map(r => [r.value, r.color]));
