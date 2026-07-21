import { BudgetLine, MONTH_KEYS, MONTHS } from '@/hooks/useBudgetData';

export const MAX_AMOUNT_FCFA = 1_000_000_000_000; // 10^12
export const VARIANCE_WARNING_RATIO = 3; // écart > 300 %

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

  // Cohérence budget vs réalisé (warning uniquement)
  if (budgetValue > 0 && value > budgetValue * VARIANCE_WARNING_RATIO) {
    issues.push({
      level: 'warning',
      message: `Écart important : ${Math.round((value / budgetValue) * 100)} % du prévu — vérifiez la saisie`,
    });
  }

  return { value, issues };
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
