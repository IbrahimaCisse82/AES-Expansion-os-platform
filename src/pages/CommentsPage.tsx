import { useState, useEffect } from 'react';
import { useComments, useCountries } from '@/hooks/useExpansionData';
import { useCreateComment, useUpdateComment, useDeleteComment } from '@/hooks/useCommentMutations';
import { useCurrentUserRole } from '@/hooks/useUserRoles';
import { useAuth } from '@/hooks/useAuth';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Trash2, Pencil, X, Check } from 'lucide-react';

export default function CommentsPage({ addSignal, searchQuery = '' }: { addSignal?: number; searchQuery?: string }) {
  const { user } = useAuth();
  const { data: myRole } = useCurrentUserRole();
  const { data: comments = [], isLoading } = useComments();
  const { data: countries = [] } = useCountries();
  const createComment = useCreateComment();
  const updateComment = useUpdateComment();
  const deleteComment = useDeleteComment();

  const isAdmin = myRole === 'admin';

  const [content, setContent] = useState('');
  const [marketId, setMarketId] = useState('');
  const [filterMarket, setFilterMarket] = useState('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const profile = user?.user_metadata;
  const fullName = profile?.full_name || user?.email || 'Utilisateur';
  const initials = fullName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);

  const marketFiltered = filterMarket === 'all' ? comments : comments.filter(c => c.market_id === filterMarket);
  const filtered = searchQuery ? marketFiltered.filter(c => c.content.toLowerCase().includes(searchQuery.toLowerCase()) || c.author_name.toLowerCase().includes(searchQuery.toLowerCase())) : marketFiltered;

  useEffect(() => {
    if (addSignal && addSignal > 0) {
      const ta = document.querySelector<HTMLTextAreaElement>('#comment-input');
      ta?.focus();
    }
  }, [addSignal]);

  const handlePublish = () => {
    const trimmed = content.trim();
    if (!trimmed) { toast.error('Le commentaire ne peut pas être vide'); return; }
    if (trimmed.length > 1000) { toast.error('Le commentaire est trop long (max 1000 caractères)'); return; }

    const country = countries.find(c => c.id === marketId);
    const payload = {
      content: trimmed,
      author_id: user?.id ?? null,
      author_name: fullName,
      author_initials: initials,
      author_color: '#1C2B3A',
      market_id: marketId || null,
      market_label: country ? `${country.flag} ${country.name}` : null,
      tags: [] as string[],
    };

    createComment.mutate(payload, {
      onSuccess: () => { toast.success('Commentaire publié'); setContent(''); setMarketId(''); },
      onError: (err: any) => toast.error(err.message),
    });
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteComment.mutate(deleteId, {
      onSuccess: () => { toast.success('Commentaire supprimé'); setDeleteId(null); },
      onError: (err: any) => toast.error(err.message),
    });
  };

  const startEdit = (c: typeof comments[0]) => {
    setEditingId(c.id);
    setEditContent(c.content);
  };

  const handleUpdate = () => {
    if (!editingId) return;
    const trimmed = editContent.trim();
    if (!trimmed) { toast.error('Le commentaire ne peut pas être vide'); return; }
    updateComment.mutate({ id: editingId, content: trimmed }, {
      onSuccess: () => { toast.success('Commentaire modifié'); setEditingId(null); },
      onError: (err: any) => toast.error(err.message),
    });
  };

  if (isLoading) return <div className="text-muted-foreground text-sm p-8">Chargement…</div>;

  return (
    <div className="animate-page-enter">
      <div className="mb-6">
        <h2 className="font-display text-[23px] font-bold text-primary mb-1">Commentaires & Discussions</h2>
        <p className="text-[12.5px] text-muted-foreground">Échanges de l'équipe sur les marchés et tâches</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4">
        <div className="bg-card border border-border rounded-lg p-5">
          {filtered.length === 0 && <div className="text-sm text-muted-foreground py-4 text-center">Aucun commentaire</div>}
          {filtered.map(c => {
            const canEdit = c.author_id === user?.id || isAdmin;
            const isEditing = editingId === c.id;
            return (
              <div key={c.id} className="flex gap-3 py-3.5 border-b border-ivory last:border-b-0 group">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[12px] font-bold flex-shrink-0 mt-0.5" style={{ background: c.author_color }}>
                  {c.author_initials}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[13px] font-semibold text-primary">{c.author_name}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(c.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="text-[11px] text-muted-foreground ml-auto">{c.market_label}</span>
                    {canEdit && !isEditing && (
                      <>
                        <button onClick={() => startEdit(c)} className="p-1 rounded hover:bg-muted transition-colors opacity-0 group-hover:opacity-100">
                          <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                        <button onClick={() => setDeleteId(c.id)} className="p-1 rounded hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100">
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </button>
                      </>
                    )}
                  </div>
                  {isEditing ? (
                    <div>
                      <textarea
                        value={editContent}
                        onChange={e => setEditContent(e.target.value)}
                      className="w-full p-2 border border-border rounded-lg text-[13px] bg-background outline-none focus:border-accent transition-colors resize-none font-sans"
                        rows={2}
                      />
                      <div className="flex gap-1 mt-1">
                        <button onClick={handleUpdate} disabled={updateComment.isPending} className="p-1 rounded hover:bg-accent/10 transition-colors">
                          <Check className="w-4 h-4 text-accent" />
                        </button>
                        <button onClick={() => setEditingId(null)} className="p-1 rounded hover:bg-muted transition-colors">
                          <X className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-[13px] leading-relaxed">{c.content}</div>
                  )}
                  <div className="flex gap-1.5 mt-1.5">
                    {(c.tags || []).map(t => (
                      <span key={t} className="text-[10.5px] font-medium bg-ivory text-muted-foreground px-2 py-0.5 rounded-md">{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}

          {user && (
            <div className="mt-4 pt-4 border-t border-ivory">
              <textarea
                id="comment-input"
                value={content}
                onChange={e => setContent(e.target.value)}
                maxLength={1000}
                className="w-full p-3 border-[1.5px] border-border rounded-lg text-[13.5px] bg-background outline-none focus:border-accent focus:bg-card transition-colors resize-none font-sans"
                rows={3}
                placeholder="Ajouter un commentaire…"
              />
              <div className="flex gap-2 mt-2 items-center">
                <Select value={marketId || '_none'} onValueChange={v => setMarketId(v === '_none' ? '' : v)}>
                  <SelectTrigger className="w-[180px] h-8 text-[12px]"><SelectValue placeholder="Marché (optionnel)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Aucun marché</SelectItem>
                    {countries.map(c => <SelectItem key={c.id} value={c.id}>{c.flag} {c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <span className="text-[11px] text-muted-foreground ml-auto">{content.length}/1000</span>
                <button
                  onClick={handlePublish}
                  disabled={createComment.isPending || !content.trim()}
                  className="px-4 py-2 bg-primary text-primary-foreground text-[13px] font-medium rounded-lg hover:bg-navy-mid transition-colors disabled:opacity-50"
                >
                  Publier →
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="bg-card border border-border rounded-lg p-5 h-fit">
          <h3 className="font-display text-sm font-semibold text-primary mb-3">Filtrer par marché</h3>
          <div className="space-y-1.5">
            <button
              onClick={() => setFilterMarket('all')}
              className={`w-full text-left px-3 py-2 rounded-lg border text-[13px] transition-colors ${filterMarket === 'all' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-foreground border-border hover:bg-ivory'}`}
            >
              Tous les marchés
            </button>
            {countries.map(c => (
              <button
                key={c.id}
                onClick={() => setFilterMarket(c.id)}
                className={`w-full text-left px-3 py-2 rounded-lg border text-[13px] transition-colors ${filterMarket === c.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-foreground border-border hover:bg-ivory'}`}
              >
                {c.flag} {c.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce commentaire ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
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
