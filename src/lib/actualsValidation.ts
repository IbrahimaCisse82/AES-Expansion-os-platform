import { BudgetLine, MONTH_KEYS, MONTHS } from '@/hooks/useBudgetData';

export const MAX_AMOUNT_FCFA = 1_000_000_000_000; // 10^12
/** Écart significatif vs prévisionnel : > 20 % → avertissement non bloquant (§5.9.3) */
export const VARIANCE_WARNING_PCT = 20;
export const VARIANCE_WARNING_RATIO = 1 + VARIANCE_WARNING_PCT / 100;

export type ActualIssueLevel = 'error' | 'warning';

export interface ActualIssue {
  level: ActualIssueLevel;
  message: string;
}

export interface ValidateActualInput {
  raw: string;
  monthIndex: number; // 0-11
  fiscalYear: number;
  budgetValue: number;
}

/**
 * Valide un montant réalisé saisi (format, période, cohérence vs prévu).
 * Retourne la valeur numérique (K FCFA) + issues éventuelles.
 */
export function validateActualInput({
  raw, monthIndex, fiscalYear, budgetValue,
}: ValidateActualInput): { value: number; issues: ActualIssue[] } {
  const issues: ActualIssue[] = [];
  const trimmed = raw.trim().replace(/\s/g, '').replace(',', '.');

  if (trimmed === '') return { value: 0, issues };

  // Format numérique strict
  if (!/^-?\d+(\.\d+)?$/.test(trimmed)) {
    issues.push({ level: 'error', message: 'Format invalide : chiffres uniquement (ex. 1250 ou 1250.50)' });
    return { value: 0, issues };
  }

  const value = Number(trimmed);

  if (!Number.isFinite(value)) {
    issues.push({ level: 'error', message: 'Valeur non finie' });
    return { value: 0, issues };
  }
  if (value < 0) {
    issues.push({ level: 'error', message: 'Le réalisé doit être ≥ 0 FCFA' });
  }
  if (value > MAX_AMOUNT_FCFA / 1000) {
    issues.push({ level: 'error', message: `Montant supérieur au plafond (${MAX_AMOUNT_FCFA.toLocaleString('fr-FR')} FCFA)` });
  }

  // Validation de période : on n'autorise pas de réalisé pour un mois futur
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-11
  const isFuture =
    fiscalYear > currentYear ||
    (fiscalYear === currentYear && monthIndex > currentMonth);
  if (isFuture && value > 0) {
    issues.push({
      level: 'error',
      message: `Période future : impossible de saisir un réalisé pour ${MONTHS[monthIndex]} ${fiscalYear}`,
    });
  }

  // Cohérence budget vs réalisé (avertissement non bloquant, appelle un commentaire)
  if (budgetValue > 0) {
    const ecart = Math.abs(value - budgetValue) / budgetValue * 100;
    if (ecart > VARIANCE_WARNING_PCT) {
      issues.push({
        level: 'warning',
        message: `Écart significatif de ${Math.round(ecart)} % vs prévisionnel — justifiez par un commentaire`,
      });
    }
  }

  return { value, issues };
}

/**
 * Contrôle de cohérence des totaux : la somme des 12 mois saisis doit
 * correspondre au total annuel saisi (tolérance d'arrondi 1 K FCFA).
 * Une divergence est bloquante (§5.9.3).
 */
export function validateRowTotal(
  monthlyValues: number[],
  declaredTotal: number | null | undefined,
): ActualIssue[] {
  if (declaredTotal === null || declaredTotal === undefined || !Number.isFinite(declaredTotal)) return [];
  const sum = monthlyValues.reduce((s, v) => s + (Number.isFinite(v) ? v : 0), 0);
  if (Math.abs(sum - declaredTotal) > 1) {
    return [{
      level: 'error',
      message: `Incohérence des totaux : somme des 12 mois = ${sum.toLocaleString('fr-FR')} K FCFA, total saisi = ${declaredTotal.toLocaleString('fr-FR')} K FCFA`,
    }];
  }
  return [];
}

/** Vrai si le mois est strictement futur par rapport à aujourd'hui pour l'exercice donné. */
export function isFutureMonth(monthIndex: number, fiscalYear: number): boolean {
  const now = new Date();
  const cy = now.getFullYear();
  const cm = now.getMonth();
  return fiscalYear > cy || (fiscalYear === cy && monthIndex > cm);
}

/** Calcule le total d'une ligne sur les 12 mois. */
export function lineTotal(line: BudgetLine): number {
  return MONTH_KEYS.reduce((s, k) => s + Number(line[k] || 0), 0);
}

/** Somme mensuelle sur un ensemble de lignes. */
export function sumByMonth(lines: BudgetLine[]): number[] {
  return MONTH_KEYS.map(k => lines.reduce((s, l) => s + Number(l[k] || 0), 0));
}

/** Variance % vs prévu (signe = réalisé - prévu). */
export function variancePercent(actual: number, budget: number): number | null {
  if (budget === 0) return actual === 0 ? 0 : null;
  return Math.round(((actual - budget) / Math.abs(budget)) * 100);
}
