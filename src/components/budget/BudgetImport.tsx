import { useState, useRef } from 'react';
import { BudgetCategory, MONTH_KEYS, useCreateBudgetLine } from '@/hooks/useBudgetData';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface BudgetImportProps {
  scenarioId: string;
  categories: BudgetCategory[];
  countries: { id: string; name: string; flag: string }[];
  onComplete: () => void;
}

interface ParsedLine {
  category: string;
  country: string;
  lineType: string;
  m1: number; m2: number; m3: number; m4: number;
  m5: number; m6: number; m7: number; m8: number;
  m9: number; m10: number; m11: number; m12: number;
  matched: boolean;
  categoryId?: string;
  countryId?: string | null;
}

export default function BudgetImport({ scenarioId, categories, countries, onComplete }: BudgetImportProps) {
  const [open, setOpen] = useState(false);
  const [parsedLines, setParsedLines] = useState<ParsedLine[]>([]);
  const [importing, setImporting] = useState(false);
  const [defaultLineType, setDefaultLineType] = useState<string>('budget');
  const fileRef = useRef<HTMLInputElement>(null);
  const createLine = useCreateBudgetLine();

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);

        const lines: ParsedLine[] = json.map(row => {
          const catName = String(row['Catégorie'] || row['Category'] || row['categorie'] || '').trim();
          const countryName = String(row['Marché'] || row['Pays'] || row['Country'] || row['market'] || '').trim();
          const lineType = String(row['Type ligne'] || row['Line Type'] || row['type'] || defaultLineType).toLowerCase();

          // Match category
          const matchedCat = categories.find(c => c.name.toLowerCase() === catName.toLowerCase());
          // Match country
          const matchedCountry = countries.find(c =>
            c.name.toLowerCase() === countryName.toLowerCase() ||
            countryName.includes(c.name) ||
            countryName.includes(c.flag)
          );

          const monthValues: Record<string, number> = {};
          MONTH_KEYS.forEach((k, i) => {
            const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
            monthValues[k] = Number(row[monthNames[i]] || row[k] || row[`M${i + 1}`] || row[`m${i + 1}`] || 0);
          });

          return {
            category: catName,
            country: countryName || 'Global',
            lineType: lineType === 'actual' ? 'actual' : lineType === 'forecast' ? 'forecast' : 'budget',
            ...monthValues,
            matched: !!matchedCat,
            categoryId: matchedCat?.id,
            countryId: matchedCountry?.id ?? null,
          } as ParsedLine;
        });

        setParsedLines(lines);
        toast.success(`${lines.length} lignes détectées`);
      } catch (err) {
        toast.error('Erreur de lecture du fichier Excel');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImport = async () => {
    const validLines = parsedLines.filter(l => l.matched && l.categoryId);
    if (validLines.length === 0) {
      toast.error('Aucune ligne valide à importer');
      return;
    }

    setImporting(true);
    let success = 0;
    let failed = 0;

    for (const line of validLines) {
      try {
        const country = countries.find(c => c.id === line.countryId);
        await createLine.mutateAsync({
          scenario_id: scenarioId,
          category_id: line.categoryId!,
          country_id: line.countryId ?? null,
          country_label: country ? `${country.flag} ${country.name}` : line.country,
          line_type: line.lineType as 'budget' | 'actual' | 'forecast',
          m1: line.m1, m2: line.m2, m3: line.m3, m4: line.m4,
          m5: line.m5, m6: line.m6, m7: line.m7, m8: line.m8,
          m9: line.m9, m10: line.m10, m11: line.m11, m12: line.m12,
          notes: `Importé depuis Excel`,
        });
        success++;
      } catch {
        failed++;
      }
    }

    setImporting(false);
    toast.success(`${success} lignes importées${failed > 0 ? `, ${failed} échouées` : ''}`);
    setParsedLines([]);
    setOpen(false);
    onComplete();
  };

  const matchedCount = parsedLines.filter(l => l.matched).length;

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-1.5 text-[12px] h-[34px]">
        <Upload className="w-3.5 h-3.5" /> Import XLSX
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">📥 Importer depuis Excel</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="bg-muted/50 rounded-md px-3 py-2 text-[11px] text-muted-foreground">
              <p className="font-semibold mb-1">Format attendu :</p>
              <p>Colonnes : Catégorie, Marché (ou Pays), Type ligne, Jan, Fév, Mar, …, Déc</p>
              <p>Les catégories doivent correspondre aux noms existants dans le système.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[12px]">Type de ligne par défaut</Label>
                <Select value={defaultLineType} onValueChange={setDefaultLineType}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="budget">Budget</SelectItem>
                    <SelectItem value="actual">Réel</SelectItem>
                    <SelectItem value="forecast">Prévision</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[12px]">Fichier Excel *</Label>
                <div className="mt-1">
                  <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFile} className="hidden" />
                  <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} className="gap-1.5 w-full">
                    <FileSpreadsheet size={14} /> Sélectionner fichier
                  </Button>
                </div>
              </div>
            </div>

            {parsedLines.length > 0 && (
              <>
                <div className="flex items-center gap-2 text-[11px]">
                  <CheckCircle2 size={14} className="text-accent" />
                  <span className="text-accent font-semibold">{matchedCount} lignes reconnues</span>
                  {parsedLines.length - matchedCount > 0 && (
                    <>
                      <AlertCircle size={14} className="text-destructive ml-2" />
                      <span className="text-destructive font-semibold">{parsedLines.length - matchedCount} non reconnues</span>
                    </>
                  )}
                </div>

                <div className="max-h-[200px] overflow-y-auto bg-card border border-border rounded-lg">
                  <table className="w-full text-[10px] border-collapse">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="text-left px-2 py-1">Statut</th>
                        <th className="text-left px-2 py-1">Catégorie</th>
                        <th className="text-left px-2 py-1">Pays</th>
                        <th className="text-left px-2 py-1">Type</th>
                        <th className="text-right px-2 py-1">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedLines.map((line, i) => (
                        <tr key={i} className={`border-b border-border/30 ${line.matched ? '' : 'bg-destructive/5'}`}>
                          <td className="px-2 py-0.5">
                            {line.matched ? <CheckCircle2 size={10} className="text-accent" /> : <AlertCircle size={10} className="text-destructive" />}
                          </td>
                          <td className="px-2 py-0.5">{line.category}</td>
                          <td className="px-2 py-0.5">{line.country}</td>
                          <td className="px-2 py-0.5">{line.lineType}</td>
                          <td className="text-right px-2 py-0.5">
                            {MONTH_KEYS.reduce((s, k) => s + (line[k as keyof ParsedLine] as number || 0), 0)}K
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => { setOpen(false); setParsedLines([]); }}>Annuler</Button>
              <Button size="sm" onClick={handleImport} disabled={importing || matchedCount === 0}>
                {importing ? 'Import en cours…' : `Importer ${matchedCount} lignes`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
