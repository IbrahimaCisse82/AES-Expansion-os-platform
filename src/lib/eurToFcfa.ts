/**
 * ExpansionOS — Conversion EUR → FCFA pour les libellés statiques (Market Intel).
 *
 * Le FCFA (XOF/XAF) est arrimé à l'euro à parité fixe : 1 EUR = 655,957 FCFA.
 * On expose un helper qui détecte les patterns « X millions EUR », « X milliards EUR »
 * et retourne une chaîne enrichie « <original> (≈ <équivalent FCFA>) ».
 */

export const EUR_TO_FCFA = 655.957;

const MULTIPLIERS: Record<string, number> = {
  milliards: 1_000_000_000,
  milliard: 1_000_000_000,
  millions: 1_000_000,
  million: 1_000_000,
  milliers: 1_000,
  millier: 1_000,
  k: 1_000,
  m: 1_000_000,
  md: 1_000_000_000,
};

function formatFcfaShort(amount: number): string {
  const abs = Math.abs(amount);
  if (abs >= 1_000_000_000_000) return `${(amount / 1_000_000_000_000).toFixed(1)}\u202fbillions\u00a0FCFA`;
  if (abs >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)}\u202fmilliards\u00a0FCFA`;
  if (abs >= 1_000_000) return `${(amount / 1_000_000).toFixed(0)}\u202fmillions\u00a0FCFA`;
  if (abs >= 1_000) return `${(amount / 1_000).toFixed(0)}\u202fk\u00a0FCFA`;
  return `${Math.round(amount)}\u00a0FCFA`;
}

/**
 * Tente de parser un libellé EUR et retourne l'équivalent en FCFA (nombre).
 * Retourne null si le pattern n'est pas reconnu.
 */
export function parseEurAmount(label: string): number | null {
  if (!label) return null;
  // Capture: nombre + (millions|milliards|k|M|Md)? + EUR
  const m = label.match(/([\d]+(?:[.,]\d+)?)\s*(milliards?|millions?|milliers?|Md|M|k)?\s*EUR/i);
  if (!m) return null;
  const value = parseFloat(m[1].replace(',', '.'));
  if (!Number.isFinite(value)) return null;
  const mult = m[2] ? (MULTIPLIERS[m[2].toLowerCase()] ?? 1) : 1;
  return value * mult;
}

/**
 * Retourne le libellé original enrichi d'un équivalent FCFA approximatif.
 * Si aucun montant EUR n'est détecté, retourne le libellé inchangé.
 */
export function withFcfaEquivalent(label: string | null | undefined): string {
  if (!label) return label ?? '';
  const eur = parseEurAmount(label);
  if (eur === null) return label;
  const fcfa = eur * EUR_TO_FCFA;
  return `${label} (≈ ${formatFcfaShort(fcfa)})`;
}