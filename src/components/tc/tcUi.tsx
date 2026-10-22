import { useEffect, useState, type ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2 } from 'lucide-react';
import { formatFCFA, formatFCFACompact } from '@/lib/currency';
import type { AlertLevel } from '@/lib/tc/aggregates';
import type { PaymentStatus, SaleStatus } from '@/lib/tc/sales';

// ---------------------------------------------------------------------
// Formats
// ---------------------------------------------------------------------
export const money = (v: number | null | undefined) => formatFCFA(v ?? 0);
export const moneyShort = (v: number | null | undefined) => formatFCFACompact(v ?? 0);
export const pct = (v: number | null | undefined, digits = 0) =>
  v === null || v === undefined || !Number.isFinite(v) ? '—' : `${(v * 100).toFixed(digits).replace('.', ',')}\u00a0%`;
export const qty = (v: number | null | undefined) =>
  v === null || v === undefined ? '—' : v.toLocaleString('fr-FR', { maximumFractionDigits: 2 });

const MONTH_FMT = new Intl.DateTimeFormat('fr-FR', { month: 'short', year: '2-digit', timeZone: 'UTC' });
const MONTH_LONG = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
export const monthLabel = (m: string) => MONTH_FMT.format(new Date(`${m.slice(0, 7)}-01T00:00:00Z`));
export const monthLong = (m: string) => MONTH_LONG.format(new Date(`${m.slice(0, 7)}-01T00:00:00Z`));
export const currentMonth = () => `${new Date().toISOString().slice(0, 7)}-01`;

// ---------------------------------------------------------------------
// Badges
// ---------------------------------------------------------------------
const STATUS_CLASS: Record<SaleStatus, string> = {
  'Devis en cours': 'bg-[hsl(var(--sky))]/15 text-[hsl(var(--sky))]',
  Vendu: 'bg-[hsl(var(--gold))]/15 text-[hsl(var(--gold))]',
  Livré: 'bg-[hsl(var(--sage))]/15 text-[hsl(var(--sage))]',
  Perdu: 'bg-muted text-muted-foreground',
};
export function SaleStatusBadge({ status }: { status: SaleStatus }) {
  return <Badge variant="outline" className={`border-0 text-[11px] whitespace-nowrap ${STATUS_CLASS[status]}`}>{status}</Badge>;
}

const PAY_CLASS: Record<Exclude<PaymentStatus, ''>, string> = {
  'Non payé': 'bg-destructive/10 text-destructive',
  Partiel: 'bg-[hsl(var(--gold))]/15 text-[hsl(var(--gold))]',
  Soldé: 'bg-[hsl(var(--sage))]/15 text-[hsl(var(--sage))]',
};
export function PaymentBadge({ status }: { status: PaymentStatus }) {
  if (!status) return <span className="text-muted-foreground">—</span>;
  return <Badge variant="outline" className={`border-0 text-[11px] whitespace-nowrap ${PAY_CLASS[status]}`}>{status}</Badge>;
}

const ALERT_CLASS: Record<AlertLevel, string> = {
  OK: 'bg-[hsl(var(--sage))]/15 text-[hsl(var(--sage))]',
  Vigilance: 'bg-[hsl(var(--gold))]/15 text-[hsl(var(--gold))]',
  Alerte: 'bg-destructive/10 text-destructive',
  'À définir': 'bg-muted text-muted-foreground',
};
export function AlertBadge({ level }: { level: AlertLevel }) {
  return <Badge variant="outline" className={`border-0 text-[11px] whitespace-nowrap ${ALERT_CLASS[level]}`}>{level}</Badge>;
}

/** Couleur d'un % d'objectif : vert ≥ 100 %, orange 70–99 %, rouge < 70 % (code couleur du classeur). */
export function objectiveClass(v: number | null | undefined) {
  if (v === null || v === undefined) return 'text-muted-foreground';
  return v >= 1 ? 'text-[hsl(var(--sage))] font-semibold' : v >= 0.7 ? 'text-[hsl(var(--gold))] font-semibold' : 'text-destructive font-semibold';
}

// ---------------------------------------------------------------------
// Mise en page
// ---------------------------------------------------------------------
export function Section({ title, description, actions, children }: { title: string; description?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="text-sm">{title}</CardTitle>
          {description && <p className="text-[11.5px] text-muted-foreground mt-1">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function Stat({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className={`text-lg font-bold mt-1 tabular-nums ${tone ?? 'text-primary'}`}>{value}</p>
        {hint && <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>}
      </CardContent>
    </Card>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted-foreground py-8 text-center">{children}</p>;
}

export function ReadOnlyNote({ show }: { show: boolean }) {
  if (!show) return null;
  return <p className="text-[11.5px] text-muted-foreground">Lecture seule : votre rôle ne permet pas de modifier ces données.</p>;
}

export function MonthSelect({ value, months, onChange, label = 'Mois analysé' }: { value: string; months: string[]; onChange: (m: string) => void; label?: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          {months.map(m => <SelectItem key={m} value={m} className="text-xs capitalize">{monthLong(m)}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

// ---------------------------------------------------------------------
// Tableau éditable (référentiels)
// ---------------------------------------------------------------------
export type ColumnType = 'text' | 'number' | 'percent' | 'date' | 'money';
export interface EditableColumn<R> {
  key: keyof R & string;
  label: string;
  type?: ColumnType;
  width?: string;
  readOnly?: boolean;
  /** Valeur calculée affichée (lecture seule). */
  render?: (row: R) => ReactNode;
  align?: 'right' | 'left';
}

function toInput(v: unknown, type: ColumnType): string {
  if (v === null || v === undefined) return '';
  if (type === 'percent') return String(Math.round(Number(v) * 10000) / 100);
  return String(v);
}
function fromInput(s: string, type: ColumnType): unknown {
  if (type === 'text' || type === 'date') return s.trim() === '' ? null : s.trim();
  if (s.trim() === '') return type === 'percent' || type === 'number' || type === 'money' ? 0 : null;
  const n = Number(s.replace(/\s/g, '').replace(',', '.'));
  if (!Number.isFinite(n)) return undefined;
  return type === 'percent' ? n / 100 : n;
}

function EditableCell({ value, type, onCommit, disabled }: { value: unknown; type: ColumnType; onCommit: (v: unknown) => void; disabled: boolean }) {
  const [draft, setDraft] = useState(toInput(value, type));
  useEffect(() => setDraft(toInput(value, type)), [value, type]);
  if (disabled) {
    const shown = type === 'money' ? money(Number(value)) : type === 'percent' ? pct(Number(value), 1) : type === 'number' ? qty(Number(value)) : (value ?? '—');
    return <span className={type === 'text' || type === 'date' ? '' : 'tabular-nums'}>{String(shown)}</span>;
  }
  return (
    <Input
      value={draft}
      type={type === 'date' ? 'date' : 'text'}
      inputMode={type === 'text' || type === 'date' ? undefined : 'decimal'}
      className={`h-8 text-xs ${type === 'text' || type === 'date' ? '' : 'text-right tabular-nums'}`}
      onChange={e => setDraft(e.target.value)}
      onBlur={() => {
        if (draft === toInput(value, type)) return;
        const v = fromInput(draft, type);
        if (v === undefined) { setDraft(toInput(value, type)); return; }
        onCommit(v);
      }}
      onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
    />
  );
}

export function EditableTable<R extends { id: string }>({
  rows, columns, canEdit, onSave, onAdd, onDelete, addLabel = 'Ajouter', empty = 'Aucune ligne.',
}: {
  rows: R[];
  columns: EditableColumn<R>[];
  canEdit: boolean;
  onSave: (id: string, patch: Partial<R>) => void;
  onAdd?: () => void;
  onDelete?: (row: R) => void;
  addLabel?: string;
  empty?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((c, ci) => (
                <TableHead key={`${c.key}-${ci}`} className={`text-xs ${c.align === 'right' || (c.type && c.type !== 'text' && c.type !== 'date') ? 'text-right' : ''}`} style={{ width: c.width }}>{c.label}</TableHead>
              ))}
              {canEdit && onDelete && <TableHead className="w-10" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow><TableCell colSpan={columns.length + 1} className="text-center text-sm text-muted-foreground py-6">{empty}</TableCell></TableRow>
            )}
            {rows.map(r => (
              <TableRow key={r.id}>
                {columns.map((c, ci) => (
                  <TableCell key={`${c.key}-${ci}`} className={`text-xs py-1.5 ${c.render && c.align === 'right' ? 'text-right tabular-nums' : ''}`}>
                    {c.render ? c.render(r) : (
                      <EditableCell value={r[c.key]} type={c.type ?? 'text'} disabled={!canEdit || !!c.readOnly}
                        onCommit={v => onSave(r.id, { [c.key]: v } as Partial<R>)} />
                    )}
                  </TableCell>
                ))}
                {canEdit && onDelete && (
                  <TableCell className="py-1.5">
                    <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Supprimer" onClick={() => onDelete(r)}>
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {canEdit && onAdd && (
        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={onAdd}><Plus className="h-3.5 w-3.5" />{addLabel}</Button>
      )}
    </div>
  );
}

/** Export Excel d'un tableau simple. */
export async function exportRows(fileName: string, sheet: string, header: string[], rows: (string | number)[][]) {
  const { downloadXlsx } = await import('@/lib/spreadsheet');
  await downloadXlsx([{ name: sheet.slice(0, 31), rows: [header, ...rows], widths: header.map(h => Math.max(10, Math.min(40, h.length + 4))) }], fileName);
}
