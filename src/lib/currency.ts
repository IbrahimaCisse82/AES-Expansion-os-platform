/**
 * ExpansionOS — Currency utilities (FCFA pivot)
 *
 * Toutes les valeurs financières sont stockées et affichées en FCFA.
 * Les autres devises sont converties au taux courant via la table `exchange_rates`.
 */

export type CurrencyCode =
  | 'FCFA' | 'XOF' | 'XAF' | 'EUR' | 'USD' | 'GBP'
  | 'NGN' | 'KES' | 'ZAR' | 'MAD' | 'EGP' | 'GHS';

export interface ExchangeRate {
  currency_code: string;
  rate_to_fcfa: number;
  effective_date: string;
}

/**
 * Convertit un montant depuis n'importe quelle devise vers FCFA.
 * Utilise le taux le plus récent <= date fournie (ou aujourd'hui).
 */
export function toFCFA(
  amount: number,
  currency: string,
  rates: ExchangeRate[],
  date?: string,
): number {
  if (!Number.isFinite(amount)) return 0;
  const code = currency.toUpperCase();
  if (code === 'FCFA' || code === 'XOF' || code === 'XAF') return Math.round(amount);

  const ref = date ?? new Date().toISOString().slice(0, 10);
  const eligible = rates
    .filter(r => r.currency_code.toUpperCase() === code && r.effective_date <= ref)
    .sort((a, b) => b.effective_date.localeCompare(a.effective_date));

  const rate = eligible[0]?.rate_to_fcfa;
  if (!rate || rate <= 0) {
    // Devise inconnue : on ne devine pas, on retourne 0 et on log côté appelant
    return 0;
  }
  return Math.round(amount * rate);
}

/**
 * Formate un montant en FCFA avec séparateurs d'espaces insécables et le suffixe "FCFA".
 * Pas de décimales (le FCFA n'a pas de subdivision usuelle en gestion).
 */
export function formatFCFA(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) return '— FCFA';
  const rounded = Math.round(amount);
  // Espaces insécables (\u202f) pour les milliers, conformes à la typographie FR
  const formatted = Math.abs(rounded)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f');
  return `${rounded < 0 ? '-' : ''}${formatted}\u00a0FCFA`;
}

/**
 * Format compact pour les graphiques : 1.2 M FCFA, 850 k FCFA, etc.
 */
export function formatFCFACompact(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) return '— FCFA';
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  if (abs >= 1_000_000_000) return `${sign}${(amount / 1_000_000_000).toFixed(1)}\u202fMd\u00a0FCFA`;
  if (abs >= 1_000_000) return `${sign}${(amount / 1_000_000).toFixed(1)}\u202fM\u00a0FCFA`;
  if (abs >= 1_000) return `${sign}${(amount / 1_000).toFixed(0)}\u202fk\u00a0FCFA`;
  return formatFCFA(amount);
}

/**
 * Parse un texte du type "1 250 000 FCFA" ou "1250000" en nombre.
 */
export function parseFCFA(text: string): number {
  if (!text) return 0;
  const cleaned = text
    .replace(/FCFA|XOF|XAF/gi, '')
    .replace(/[\s\u00a0\u202f]/g, '')
    .replace(',', '.')
    .trim();
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}