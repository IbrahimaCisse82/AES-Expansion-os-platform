import { useState } from 'react';
import { useExchangeRates, useUpsertExchangeRate, useDeleteExchangeRate } from '@/hooks/useExchangeRates';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { formatFCFA } from '@/lib/currency';

const SUPPORTED_CURRENCIES = ['EUR', 'USD', 'GBP', 'NGN', 'KES', 'ZAR', 'MAD', 'EGP', 'GHS'];

export default function ExchangeRatesSettings() {
  const { data: rates = [], isLoading } = useExchangeRates();
  const upsert = useUpsertExchangeRate();
  const remove = useDeleteExchangeRate();

  const [currency, setCurrency] = useState('EUR');
  const [rate, setRate] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [source, setSource] = useState('manual');

  // Garde uniquement le taux le plus récent par devise pour l'affichage principal
  const latest = rates.reduce<typeof rates>((acc, r) => {
    if (!acc.find(x => x.currency_code === r.currency_code)) acc.push(r);
    return acc;
  }, []);

  const handleAdd = () => {
    const r = parseFloat(rate);
    if (!Number.isFinite(r) || r <= 0) { toast.error('Taux invalide'); return; }
    upsert.mutate({ currency_code: currency, rate_to_fcfa: r, effective_date: date, source }, {
      onSuccess: () => { toast.success('Taux enregistré'); setRate(''); },
      onError: (e: Error) => toast.error(e.message),
    });
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <RefreshCw className="w-4 h-4 text-accent" />
          <h3 className="font-display text-[16px] font-semibold text-primary">Taux de change vers FCFA</h3>
        </div>
        <p className="text-[12px] text-muted-foreground">
          Le FCFA est la devise pivot. Les autres montants sont convertis avec le taux à la date la plus récente.
        </p>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Chargement…</p>
      ) : (
        <div className="space-y-1.5 mb-4">
          {latest.map(r => (
            <div key={r.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-muted/30 group">
              <span className="text-[13px] font-semibold text-primary w-12">{r.currency_code}</span>
              <span className="text-[12.5px] text-muted-foreground flex-1">
                1 {r.currency_code} = {formatFCFA(r.rate_to_fcfa)}
              </span>
              <span className="text-[11px] text-muted-foreground">{r.effective_date}</span>
              <span className="text-[10px] uppercase tracking-wide bg-secondary text-muted-foreground px-1.5 py-0.5 rounded">
                {r.source}
              </span>
              {r.currency_code !== 'FCFA' && r.currency_code !== 'XOF' && r.currency_code !== 'XAF' && (
                <button
                  onClick={() => remove.mutate(r.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded transition-opacity"
                  aria-label="Supprimer"
                >
                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="border-t border-border pt-4">
        <Label className="text-[12px] font-semibold text-foreground mb-2 block">Ajouter / mettre à jour un taux</Label>
        <div className="grid grid-cols-[100px_1fr_140px_100px_auto] gap-2 items-end">
          <div>
            <Label className="text-[11px] text-muted-foreground">Devise</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger className="h-9 text-[12.5px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SUPPORTED_CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[11px] text-muted-foreground">Taux vers FCFA</Label>
            <Input
              type="number"
              step="0.001"
              min="0"
              value={rate}
              onChange={e => setRate(e.target.value)}
              placeholder="ex: 655.957"
              className="h-9 text-[12.5px]"
            />
          </div>
          <div>
            <Label className="text-[11px] text-muted-foreground">Date effective</Label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-9 text-[12.5px]" />
          </div>
          <div>
            <Label className="text-[11px] text-muted-foreground">Source</Label>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger className="h-9 text-[12.5px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="BCEAO">BCEAO</SelectItem>
                <SelectItem value="ECB">BCE</SelectItem>
                <SelectItem value="manual">Manuel</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleAdd} size="sm" disabled={upsert.isPending} className="gap-1.5 text-[12.5px]">
            <Plus className="w-4 h-4" /> Enregistrer
          </Button>
        </div>
      </div>
    </div>
  );
}