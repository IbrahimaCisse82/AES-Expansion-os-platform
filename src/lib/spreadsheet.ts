// Lecture / écriture de classeurs Excel (.xlsx).
// Remplace la bibliothèque `xlsx` 0.18.x (SheetJS), abandonnée sur npm et
// affectée de vulnérabilités sans correctif (prototype pollution, ReDoS).

export type CellValue = string | number | boolean | Date | null;

export interface SheetSpec {
  name: string;
  rows: (string | number)[][];
  /** Largeur des colonnes en caractères (équivalent de `wch`). */
  widths?: number[];
}

/**
 * Transforme un tableau de lignes (1re ligne = en-têtes) en objets indexés
 * par en-tête — comportement de `XLSX.utils.sheet_to_json`.
 * Les lignes entièrement vides sont ignorées.
 */
export function rowsToObjects(rows: CellValue[][]): Record<string, unknown>[] {
  if (rows.length === 0) return [];
  const headers = rows[0].map((h) => (h == null ? '' : String(h).trim()));
  return rows
    .slice(1)
    .filter((row) => row.some((cell) => cell !== null && cell !== undefined && cell !== ''))
    .map((row) => {
      const obj: Record<string, unknown> = {};
      headers.forEach((h, i) => {
        if (!h) return;
        const value = row[i];
        if (value !== null && value !== undefined && value !== '') obj[h] = value;
      });
      return obj;
    });
}

/** Lit la première feuille d'un fichier .xlsx sous forme d'objets. */
export async function readFirstSheetAsObjects(file: File): Promise<Record<string, unknown>[]> {
  const { readSheet } = await import('read-excel-file/browser');
  const rows = (await readSheet(file)) as CellValue[][];
  return rowsToObjects(rows);
}

/** Génère un classeur multi-feuilles et déclenche son téléchargement. */
export async function downloadXlsx(sheets: SheetSpec[], fileName: string): Promise<void> {
  const { default: writeXlsxFile } = await import('write-excel-file/browser');
  await writeXlsxFile(
    sheets.map((s) => ({
      sheet: s.name,
      data: s.rows.map((row) => row.map((value) => (value === '' ? null : { value }))),
      columns: s.widths?.map((width) => ({ width })),
    })),
  ).toFile(fileName);
}
