/**
 * Lit un montant ou un indicateur saisi en texte libre, tel qu'on le trouve
 * dans les anciennes fiches pays : "284K€", "2.0M€", "1,8 M€", "1 240",
 * "1,240", "4,940 Mds$", "89%", "72".
 *
 * Règles :
 *  - suffixes K / M / Md(s) / B (milliers, millions, milliards) ;
 *  - séparateur de milliers : espace (y compris insécable), ou virgule/point
 *    suivi d'exactement 3 chiffres sans autre séparateur décimal ;
 *  - sinon virgule ou point = séparateur décimal.
 * Renvoie null si aucune valeur n'est lisible.
 */
export function parseAmount(raw: string | number | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
  let s = raw.trim().toLowerCase();
  if (!s || s === 'n/a' || s === '-') return null;

  let mult = 1;
  const suffix = /(\d)\s*(mds?|mrds?|milliards?|bn|b|m|millions?|k)\b/.exec(s.replace(/[€$£%]|fcfa|xof|eur|usd/g, ' '));
  if (suffix) {
    const u = suffix[2];
    mult = u.startsWith('md') || u.startsWith('mrd') || u.startsWith('milliard') || u === 'b' || u === 'bn' ? 1e9 : u.startsWith('m') ? 1e6 : 1e3;
  }

  s = s.replace(/[\s  ]/g, '');
  const num = /-?[\d.,]+/.exec(s)?.[0];
  if (!num) return null;

  let normalized: string;
  const commas = (num.match(/,/g) ?? []).length;
  const dots = (num.match(/\./g) ?? []).length;
  if (commas && dots) {
    // le dernier séparateur rencontré est le décimal
    const decimal = num.lastIndexOf(',') > num.lastIndexOf('.') ? ',' : '.';
    const thousands = decimal === ',' ? '.' : ',';
    normalized = num.split(thousands).join('').replace(decimal, '.');
  } else if (commas + dots === 1) {
    const sep = commas ? ',' : '.';
    const [intPart, frac] = num.split(sep);
    // "1,240" ou "4.940" sans suffixe = milliers ; "2.0", "1,8" = décimal
    normalized = frac.length === 3 && mult === 1 && intPart.replace('-', '').length <= 3 ? intPart + frac : `${intPart}.${frac}`;
  } else if (commas + dots > 1) {
    normalized = num.replace(/[.,]/g, ''); // "1,240,000"
  } else {
    normalized = num;
  }

  const n = Number(normalized) * mult;
  return Number.isFinite(n) ? n : null;
}
