import { useState } from 'react';
import { useCountryNotes, useCreateCountryNote, useDeleteCountryNote } from '@/hooks/useCountryNotes';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Trash2, FileText, AlertTriangle, CheckCircle, Info } from 'lucide-react';

const NOTE_TYPES = [
  { value: 'info', label: 'Information', icon: Info, color: 'text-[hsl(var(--sky))]', bg: 'bg-[hsl(var(--sky))]/10' },
  { value: 'decision', label: 'Décision', icon: CheckCircle, color: 'text-accent', bg: 'bg-accent/10' },
  { value: 'action', label: 'Action', icon: FileText, color: 'text-[hsl(var(--gold))]', bg: 'bg-[hsl(var(--gold))]/10' },
  { value: 'alert', label: 'Alerte', icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10' },
];

interface CountryNotesProps {
  countryId: string;
  canWrite: boolean;
}

export default function CountryNotes({ countryId, canWrite }: CountryNotesProps) {
  const { user } = useAuth();
  const profileName = user?.user_metadata?.full_name || user?.email || '';
  const { data: notes = [], isLoading } = useCountryNotes(countryId);
  const createNote = useCreateCountryNote();
  const deleteNote = useDeleteCountryNote();
  const [showForm, setShowForm] = useState(false);
  const [content, setContent] = useState('');
  const [noteType, setNoteType] = useState('info');

  const handleSubmit = () => {
    if (!content.trim()) return;
    createNote.mutate({
      country_id: countryId,
      content: content.trim(),
      note_type: noteType,
      author_id: user?.id,
      author_name: profileName,
    }, {
      onSuccess: () => { toast.success('Note ajoutée'); setContent(''); setShowForm(false); },
      onError: (err: Error) => toast.error(err.message),
    });
  };

  const handleDelete = (id: string) => {
    deleteNote.mutate({ id, countryId }, {
      onSuccess: () => toast.success('Note supprimée'),
      onError: (err: Error) => toast.error(err.message),
    });
  };

  return (
    <div className="bg-card border border-border rounded-lg p-5 col-span-2">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-[15.5px] font-semibold text-primary flex items-center gap-2">
          <FileText className="w-4 h-4" /> Journal de Bord
        </h3>
        {canWrite && (
          <Button onClick={() => setShowForm(!showForm)} variant="outline" size="sm" className="gap-1 text-[11px] h-7">
            <Plus className="w-3.5 h-3.5" /> Ajouter
          </Button>
        )}
      </div>

      {showForm && (
        <div className="border border-border rounded-lg p-3 mb-4 space-y-3">
          <div className="flex gap-2">
            <Select value={noteType} onValueChange={setNoteType}>
              <SelectTrigger className="w-[140px] h-8 text-[12px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {NOTE_TYPES.map(nt => <SelectItem key={nt.value} value={nt.value}>{nt.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Saisissez votre note…" className="text-[13px] min-h-[80px]" />
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Annuler</Button>
            <Button size="sm" onClick={handleSubmit} disabled={!content.trim() || createNote.isPending}>Enregistrer</Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : notes.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">Aucune note pour ce marché</p>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {notes.map(note => {
            const typeConfig = NOTE_TYPES.find(nt => nt.value === note.note_type) || NOTE_TYPES[0];
            const Icon = typeConfig.icon;
            return (
              <div key={note.id} className="flex gap-3 py-2.5 border-b border-border last:border-b-0 group">
                <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${typeConfig.bg}`}>
                  <Icon className={`w-3.5 h-3.5 ${typeConfig.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12.5px] leading-relaxed whitespace-pre-wrap">{note.content}</div>
                  <div className="text-[10.5px] text-muted-foreground mt-1">
                    {note.author_name} · {new Date(note.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                {canWrite && (
                  <button onClick={() => handleDelete(note.id)} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded transition-opacity self-start">
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
