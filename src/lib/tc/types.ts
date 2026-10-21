// Types de l'environnement Technico-Commercial (tables tc_*).
// Les champs reprennent les colonnes SQL (snake_case) pour éviter toute
// couche de conversion entre Supabase et le moteur de calcul.

export interface TcSettings {
  margin_rate: number;
  vat_rate: number;
  contingency_rate: number;
  currency: string;
  inventory_date: string | null;
  payment_delay_days: number;
  cost_per_km: number;
  per_diem: number;
  lodging_per_night: number;
  default_mission_people: number;
  warranty_rate: number;
  commission_rate: number;
  bonus_threshold: number;
  bonus_rate: number;
  default_probability: number;
}

export const DEFAULT_SETTINGS: TcSettings = {
  margin_rate: 0.25,
  vat_rate: 0.18,
  contingency_rate: 0.05,
  currency: 'FCFA',
  inventory_date: null,
  payment_delay_days: 30,
  cost_per_km: 350,
  per_diem: 10000,
  lodging_per_night: 15000,
  default_mission_people: 2,
  warranty_rate: 0.03,
  commission_rate: 0.02,
  bonus_threshold: 1,
  bonus_rate: 0.01,
  default_probability: 0.5,
};

export interface TcSolution {
  code: string;
  label: string;
  description?: string | null;
  reservation_priority: number;
  color: string;
  active: boolean;
}

export interface TcLaborProfile {
  id: string;
  name: string;
  hourly_rate: number;
  comment?: string | null;
  sort_order: number;
}

export interface TcZone {
  id: string;
  name: string;
  distance_km: number;
  mission_days: number;
  nights: number;
  sort_order: number;
}

export interface TcTeam {
  id: string;
  name: string;
  manager?: string | null;
  region?: string | null;
  technicians: number;
  hours_per_day: number;
  working_days: number;
  availability_rate: number;
  sort_order: number;
  active: boolean;
}

export interface TcStockItem {
  id: string;
  designation: string;
  inventory_category?: string | null;
  solution_code?: string | null;
  quantity: number;
  unit_cost: number;
  unit: string;
}

export interface TcSupplierPrice {
  id: string;
  designation: string;
  supplier: string;
  contact?: string | null;
  unit_price: number;
  lead_days?: number | null;
  quote_date?: string | null;
  remark?: string | null;
}

export interface TcKit {
  id: string;
  code: string;
  solution_code: string;
  variant: string;
  name: string;
  customer_need?: string | null;
  transport_cost: number;
  margin_rate?: number | null;
  sort_order: number;
  active: boolean;
}

export interface TcKitItem {
  id: string;
  kit_id: string;
  line_no: number;
  designation: string;
  unit: string;
  quantity: number;
}

export interface TcKitLabor {
  id: string;
  kit_id: string;
  line_no: number;
  profile_id: string;
  people: number;
  hours_per_person: number;
}

export interface TcObjective {
  id: string;
  team_id: string;
  solution_code: string;
  month: string; // AAAA-MM-01
  kits_target: number;
  revenue_target: number;
}

export interface TcSale {
  id: string;
  quote_no: string;
  quote_date: string;
  team_id: string;
  salesperson?: string | null;
  client: string;
  kit_id: string;
  quantity: number;
  applied_price?: number | null;
  discount_rate: number;
  sale_date?: string | null;
  delivery_date?: string | null;
  lost: boolean;
  remark?: string | null;
  deposit_amount: number;
  deposit_date?: string | null;
  balance_amount: number;
  balance_date?: string | null;
  zone_id?: string | null;
  mission_people?: number | null;
  probability?: number | null;
  planned_install_date?: string | null;
  unit_cost_snapshot?: number | null;
  catalog_price_snapshot?: number | null;
  install_hours_snapshot?: number | null;
  created_by?: string | null;
}

export interface TcRaci {
  id: string;
  sort_order: number;
  process: string;
  activity: string;
  screen?: string | null;
  frequency?: string | null;
  assignments: Record<string, string>;
}

/** Données de référence nécessaires à tous les calculs. */
export interface TcData {
  settings: TcSettings;
  solutions: TcSolution[];
  labor: TcLaborProfile[];
  zones: TcZone[];
  teams: TcTeam[];
  stock: TcStockItem[];
  supplierPrices: TcSupplierPrice[];
  kits: TcKit[];
  kitItems: TcKitItem[];
  kitLabor: TcKitLabor[];
  objectives: TcObjective[];
  sales: TcSale[];
}

export const VARIANT_ORDER = ['PETIT', 'MOYEN', 'GRAND'];
