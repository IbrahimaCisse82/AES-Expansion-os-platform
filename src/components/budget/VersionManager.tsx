import { useState } from 'react';
import { useScenarioVersions, useCreateVersion } from '@/hooks/useBudgetConsolidation';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { History, Plus, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface VersionManagerProps {
  scenarioId: string;
  scenarioName: string;
  canWrite: boolean;
}

export default function VersionManager({ scenarioId, scenarioName, canWrite }: VersionManagerProps) {
  const { data: versions = [] } = useScenarioVersions(scenarioId);
  const createVersion = useCreateVersion();
  const [open, setOpen] = useState(false);
  const [nameVal, setNameVal] = useState('');
  const [previewVersion, setPreviewVersion] = useState<string | null>(null);

  const handleSave = () => {
    if (!nameVal.trim()) { toast.error('Nom de version requis'); return; }
    createVersion.mutate(
      { scenarioId, versionName: nameVal.trim() },
      {
        onSuccess: () => { toast.success('Snapshot sauvegardé'); setOpen(false); setNameVal(''); },
        onError: (err: Error) => toast.error(err.message),
      }
    );
  };

  const previewData = versions.find(v => v.id === previewVersion);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History size={16} className="text-primary" />
          <h3 className="text-[14px] font-bold text-foreground">Historique des versions</h3>
          <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{versions.length} version{versions.length !== 1 ? 's' : ''}</span>
        </div>
        {canWrite && (
          <Button size="sm" variant="outline" onClick={() => { setNameVal(`v${versions.length + 1} — ${new Date().toLocaleDateString('fr-FR')}`); setOpen(true); }} className="gap-1.5 text-[12px]">
            <Plus size={14} /> Sauvegarder version
          </Button>
        )}
      </div>

      {versions.length === 0 ? (
        <div className="bg-muted/30 border border-border rounded-lg p-6 text-center">
          <p className="text-[12px] text-muted-foreground">Aucune version sauvegardée. Créez un snapshot pour garder un historique de ce scénario.</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {versions.map(v => (
            <div key={v.id} className="flex items-center justify-between bg-card border border-border rounded-lg px-3 py-2 hover:bg-muted/20 transition-colors">
              <div>
                <div className="text-[12px] font-semibold text-foreground">{v.version_name}</div>
                <div className="text-[10px] text-muted-foreground">
                  Version #{v.version_number} · {format(new Date(v.created_at), 'dd MMM yyyy HH:mm', { locale: fr })} · {Array.isArray(v.snapshot_data) ? v.snapshot_data.length : 0} lignes
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPreviewVersion(previewVersion === v.id ? null : v.id)}
                className="gap-1 text-[11px] h-7"
              >
                <Eye size={12} /> Aperçu
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Preview */}
      {previewData && Array.isArray(previewData.snapshot_data) && (
        <div className="bg-muted/30 border border-border rounded-lg p-3">
          <div className="text-[11px] font-bold text-foreground mb-2">
            Aperçu : {previewData.version_name} ({previewData.snapshot_data.length} lignes)
          </div>
          <div className="max-h-[200px] overflow-y-auto text-[10px]">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left px-2 py-1 text-[9px]">Pays</th>
                  <th className="text-left px-2 py-1 text-[9px]">Type</th>
                  <th className="text-right px-2 py-1 text-[9px]">M1-M12 Total</th>
                </tr>
              </thead>
              <tbody>
                {previewData.snapshot_data.slice(0, 20).map((line: Record<string, unknown>, i: number) => {
                  const total = ['m1','m2','m3','m4','m5','m6','m7','m8','m9','m10','m11','m12']
                    .reduce((s, k) => s + Number(line[k] || 0), 0);
                  return (
                    <tr key={i} className="border-b border-border/30">
                      <td className="px-2 py-0.5">{String(line.country_label || 'Global')}</td>
                      <td className="px-2 py-0.5">{String(line.line_type || '')}</td>
                      <td className="text-right px-2 py-0.5 font-semibold">{Math.round(total)}K</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Save Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">📸 Sauvegarder un snapshot</DialogTitle>
          </DialogHeader>
          <p className="text-[11px] text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
            Un snapshot capture l'état actuel de toutes les lignes du scénario « {scenarioName} ».
          </p>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-[12px]">Nom de la version *</Label>
              <Input value={nameVal} onChange={e => setNameVal(e.target.value)} className="mt-1" placeholder="Ex: v3 — avant reforecast Q2" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Annuler</Button>
              <Button size="sm" onClick={handleSave} disabled={createVersion.isPending}>Sauvegarder</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
