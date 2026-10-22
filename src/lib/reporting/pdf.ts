// Export PDF d'un rapport A1–A12, mis en page comme l'onglet du classeur (en-tête, sections, signatures).
import { computeCell, hotAverage, isGroupRow, periodLabel, weightedEvaluation, type ReportData, type ReportTemplate, type TableColumn, type TableRow } from './templates';

/** Les polices PDF standard ne couvrent que WinAnsi : on remplace les quelques caractères hors jeu. */
export const pdfSafe = (s: string) => s
  .replace(/[\u00a0\u202f]/g, ' ').replace(/\u2192/g, '->').replace(/\u2265/g, '>=').replace(/\u2264/g, '<=')
  .replace(/\u2191/g, 'hausse').replace(/\u2193/g, 'baisse').replace(/\u25ce/g, 'cible')
  // eslint-disable-next-line no-control-regex
  .replace(/[^\u0000-\u00ff\u20ac\u0153\u0152\u2014\u2013\u2019\u2018\u201c\u201d\u2026\u2022]/gu, '');

const fmtNum = (v: number) => v.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
export function cellText(col: TableColumn, row: TableRow): string {
  if (col.computed) {
    const v = computeCell(col.computed, row);
    if (v === null) return '';
    return col.computed === 'gap' ? fmtNum(v) : `${(v * 100).toFixed(1).replace('.', ',')} %`;
  }
  const v = row[col.key];
  if (v === null || v === undefined || v === '') return '';
  if (typeof v === 'number') return fmtNum(v);
  if ((col.type === 'date') && /^\d{4}-\d{2}-\d{2}$/.test(String(v))) { const s = String(v); return `${s.slice(8)}/${s.slice(5, 7)}/${s.slice(0, 4)}`; }
  return String(v);
}

export async function exportReportPdf(t: ReportTemplate, r: { period: string; data: ReportData; author_name: string | null; status: string; review_comment?: string | null }, statusLabel: string) {
  const [{ default: JsPDF }, autoTable] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const doc = new JsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const S = pdfSafe;
  let y = 14;
  const ensure = (h: number) => { if (y + h > doc.internal.pageSize.getHeight() - 12) { doc.addPage(); y = 14; } };
  doc.setFillColor(28, 43, 58); doc.rect(0, 0, W, 22, 'F');
  doc.setTextColor(255, 255, 255); doc.setFontSize(13);
  doc.text(S(`AES BURKINA — ${t.code} · ${t.name.toUpperCase()}`), 12, 10);
  doc.setFontSize(8.5);
  doc.text(S(`Réf. ${t.code} | ${t.reference}${t.confidential ? ' | CONFIDENTIEL' : ''}`), 12, 16);
  doc.setTextColor(30, 30, 30);
  y = 30;
  doc.setFontSize(9);
  doc.text(S(`Période : ${periodLabel(r.period)}    Auteur : ${r.author_name ?? '—'}    Statut : ${statusLabel}`), 12, y);
  y += 6;
  if (r.review_comment) { doc.setTextColor(170, 40, 40); doc.text(S(`Observation du valideur : ${r.review_comment}`), 12, y); doc.setTextColor(30, 30, 30); y += 6; }
  const head = (title: string) => { ensure(14); doc.setFontSize(10.5); doc.setFont('helvetica', 'bold'); doc.text(S(title), 12, y); doc.setFont('helvetica', 'normal'); y += 3; };
  const table = (h: string[], body: string[][], bold: number[] = []) => {
    autoTable.default(doc, {
      head: [h.map(S)], body: body.map(row => row.map(S)), startY: y, margin: { left: 12, right: 12 },
      styles: { fontSize: 7.5, cellPadding: 1.4, overflow: 'linebreak' }, headStyles: { fillColor: [46, 74, 98], fontSize: 7.5 },
      didParseCell: d => { if (d.section === 'body' && bold.includes(d.row.index)) { d.cell.styles.fontStyle = 'bold'; d.cell.styles.fillColor = [238, 240, 243]; } },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
  };
  for (const s of t.sections) {
    if (s.kind === 'fields') {
      if (s.title) head(s.title);
      table(['Champ', 'Valeur'], s.fields.map(f => [f.label, String(r.data[f.key] ?? '')]));
    } else if (s.kind === 'text') {
      head(s.title);
      doc.setFontSize(8.5);
      const lines = doc.splitTextToSize(S(String(r.data[s.key] ?? '') || '—'), W - 24) as string[];
      for (const l of lines) { ensure(5); y += 4; doc.text(l, 12, y); }
      y += 6;
    } else if (s.kind === 'table') {
      head(s.title);
      const rows = ((r.data[s.key] as TableRow[] | undefined) ?? []).filter(row => Object.values(row).some(v => v !== null && v !== ''));
      const extra = t.code === 'A8' && s.key === 'hot' ? ['Note moy.'] : [];
      const body = rows.map(row => isGroupRow(row.label) ? [String(row.label).slice(2), ...s.columns.slice(1).map(() => ''), ...extra.map(() => '')]
        : [...s.columns.map(c => cellText(c, row)), ...extra.map(() => { const a = hotAverage(row); return a === null ? '' : fmtNum(Math.round(a * 100) / 100); })]);
      table([...s.columns.map(c => c.label), ...extra], body.length ? body : [s.columns.map(() => '')], rows.map((row, i) => (isGroupRow(row.label) ? i : -1)).filter(i => i >= 0));
      if (t.code === 'A6' && s.key === 'grid') {
        const w = weightedEvaluation(rows);
        doc.setFontSize(9); doc.setFont('helvetica', 'bold');
        doc.text(S(`Score global pondéré : ${w.score === null ? '—' : w.score.toFixed(2).replace('.', ',')} / 4 — niveau ${w.level ?? '—'}`), 12, y); doc.setFont('helvetica', 'normal'); y += 7;
      }
    } else {
      head(s.title);
      const v = r.data[s.key];
      const chosen = Array.isArray(v) ? v as string[] : v ? [String(v)] : [];
      doc.setFontSize(8.5);
      for (const o of s.options) { ensure(5); y += 4; doc.text(S(`${chosen.includes(o) ? '[X]' : '[  ]'} ${o}`), 14, y); }
      y += 6;
    }
  }
  ensure(24);
  const colW = (W - 24) / Math.max(1, t.signatures.length);
  doc.setFontSize(8.5);
  t.signatures.forEach((sig, i) => { doc.text(S(sig), 12 + i * colW, y + 4); doc.line(12 + i * colW, y + 18, 12 + i * colW + colW - 10, y + 18); });
  doc.save(`${t.code}_${r.period}.pdf`);
}
