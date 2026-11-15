// Affichage des dates stockées en base (type DATE, renvoyé en "AAAA-MM-JJ").

const FORMATTER = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

/**
 * "2025-07-30" -> "30 juil. 2025". Toute autre valeur est renvoyée telle
 * quelle (données historiques non converties), une valeur vide donne "".
 */
export function formatDateFr(value: string | null | undefined): string {
  if (!value) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!m) return value;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return Number.isNaN(d.getTime()) ? value : FORMATTER.format(d);
}
