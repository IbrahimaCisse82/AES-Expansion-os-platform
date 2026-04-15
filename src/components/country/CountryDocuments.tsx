import { useState, useRef } from 'react';
import { useCountryDocuments, useUploadDocument, useDeleteDocument } from '@/hooks/useCountryDocuments';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Upload, FileText, Trash2, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const mimeIcons: Record<string, string> = {
  'application/pdf': '📄',
  'image/': '🖼️',
  'application/vnd': '📊',
  'text/': '📝',
};

function getIcon(mime: string): string {
  for (const [prefix, icon] of Object.entries(mimeIcons)) {
    if (mime.startsWith(prefix)) return icon;
  }
  return '📎';
}

interface Props {
  countryId: string;
  canWrite: boolean;
}

export default function CountryDocuments({ countryId, canWrite }: Props) {
  const { user } = useAuth();
  const { data: docs = [], isLoading } = useCountryDocuments(countryId);
  const uploadDoc = useUploadDocument();
  const deleteDoc = useDeleteDocument();
  const fileRef = useRef<HTMLInputElement>(null);
  const [deleteId, setDeleteId] = useState<{ id: string; path: string } | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { toast.error('Fichier trop volumineux (max 20 MB)'); return; }
    uploadDoc.mutate(
      { countryId, file, userName: user?.user_metadata?.full_name || user?.email || '' },
      {
        onSuccess: () => toast.success('Document ajouté'),
        onError: (err: Error) => toast.error(err.message),
      }
    );
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleDownload = async (filePath: string, fileName: string) => {
    const { data, error } = await supabase.storage.from('country-documents').download(filePath);
    if (error) { toast.error('Erreur de téléchargement'); return; }
    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteDoc.mutate(
      { id: deleteId.id, filePath: deleteId.path, countryId },
      {
        onSuccess: () => { toast.success('Document supprimé'); setDeleteId(null); },
        onError: (err: Error) => toast.error(err.message),
      }
    );
  };

  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-[15.5px] font-semibold text-primary">Documents</h3>
        {canWrite && (
          <>
            <Button onClick={() => fileRef.current?.click()} variant="outline" size="sm" className="gap-1 text-[11px] h-7" disabled={uploadDoc.isPending}>
              <Upload className="w-3.5 h-3.5" /> {uploadDoc.isPending ? 'Envoi…' : 'Ajouter'}
            </Button>
            <input ref={fileRef} type="file" className="hidden" onChange={handleUpload} accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.txt,.csv" />
          </>
        )}
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : docs.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">Aucun document</p>
      ) : (
        <div className="space-y-1.5">
          {docs.map(d => (
            <div key={d.id} className="flex items-center gap-2 py-2 px-2 rounded-lg hover:bg-muted/50 transition-colors group">
              <span className="text-lg">{getIcon(d.mime_type)}</span>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium truncate">{d.name}</div>
                <div className="text-[10.5px] text-muted-foreground">
                  {formatSize(d.file_size)} · {new Date(d.created_at).toLocaleDateString('fr-FR')}
                  {d.uploaded_by_name && ` · ${d.uploaded_by_name}`}
                </div>
              </div>
              <button onClick={() => handleDownload(d.file_path, d.name)} className="p-1 rounded hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity">
                <Download className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
              {canWrite && (
                <button onClick={() => setDeleteId({ id: d.id, path: d.file_path })} className="p-1 rounded hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce document ?</AlertDialogTitle>
            <AlertDialogDescription>Le fichier sera définitivement supprimé.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
