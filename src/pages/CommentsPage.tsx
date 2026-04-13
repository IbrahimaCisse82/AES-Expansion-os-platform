import { useState, useEffect, useMemo } from 'react';
import { useComments, useCountries } from '@/hooks/useExpansionData';
import { useCreateComment, useUpdateComment, useDeleteComment } from '@/hooks/useCommentMutations';
import { useCurrentUserRole, useAllUsersWithRoles } from '@/hooks/useUserRoles';
import { useAuth } from '@/hooks/useAuth';
import { useCommentReactions, useToggleReaction } from '@/hooks/useCommentReactions';
import { supabase } from '@/integrations/supabase/client';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Trash2, Pencil, X, Check, MessageSquare, SmilePlus } from 'lucide-react';
import MentionInput, { extractMentions, renderMentionedText } from '@/components/MentionInput';

const EMOJI_OPTIONS = ['👍', '❤️', '🎉', '😂', '🤔', '👏'];

interface CommentItemProps {
  c: any;
  user: any;
  isAdmin: boolean;
  reactions: any[];
  allUsers: any[];
  knownNames: string[];
  depth?: number;
  replies: any[];
  allComments: any[];
  allReactions: any[];
  onDelete: (id: string) => void;
  onEdit: (c: any) => void;
  onReply: (id: string) => void;
  onMentionClick: (name: string) => void;
  onToggleReaction: (commentId: string, emoji: string) => void;
  editingId: string | null;
  editContent: string;
  setEditContent: (s: string) => void;
  handleUpdate: () => void;
  setEditingId: (id: string | null) => void;
  updatePending: boolean;
  replyingTo: string | null;
  replyContent: string;
  setReplyContent: (s: string) => void;
  handleReply: () => void;
  createPending: boolean;
  setReplyingTo: (id: string | null) => void;
  replyMarketId: string;
  setReplyMarketId: (s: string) => void;
}

function CommentItem({
  c, user, isAdmin, reactions, allUsers, knownNames, depth = 0, replies, allComments, allReactions,
  onDelete, onEdit, onReply, onMentionClick, onToggleReaction,
  editingId, editContent, setEditContent, handleUpdate, setEditingId, updatePending,
  replyingTo, replyContent, setReplyContent, handleReply, createPending, setReplyingTo, replyMarketId, setReplyMarketId,
}: CommentItemProps) {
  const canEdit = c.author_id === user?.id || isAdmin;
  const isEditing = editingId === c.id;
  const isReplying = replyingTo === c.id;
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Group reactions by emoji
  const grouped = useMemo(() => {
    const map = new Map<string, { count: number; userIds: string[] }>();
    reactions.forEach(r => {
      const e = map.get(r.emoji) || { count: 0, userIds: [] };
      e.count++;
      e.userIds.push(r.user_id);
      map.set(r.emoji, e);
    });
    return Array.from(map.entries());
  }, [reactions]);

  const childReplies = allComments.filter(r => r.parent_id === c.id);

  return (
    <div className={`${depth > 0 ? 'ml-8 border-l-2 border-border pl-3' : ''}`}>
      <div className="flex gap-3 py-3 group">
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[12px] font-bold flex-shrink-0 mt-0.5" style={{ background: c.author_color }}>
          {c.author_initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-[13px] font-semibold text-primary">{c.author_name}</span>
            <span className="text-[11px] text-muted-foreground">
              {new Date(c.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </span>
            {c.market_label && <span className="text-[11px] text-muted-foreground">{c.market_label}</span>}
            <div className="ml-auto flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="p-1 rounded hover:bg-muted transition-colors" title="Réagir">
                <SmilePlus className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
              {depth === 0 && (
                <button onClick={() => onReply(c.id)} className="p-1 rounded hover:bg-muted transition-colors" title="Répondre">
                  <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              )}
              {canEdit && !isEditing && (
                <>
                  <button onClick={() => onEdit(c)} className="p-1 rounded hover:bg-muted transition-colors">
                    <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                  <button onClick={() => onDelete(c.id)} className="p-1 rounded hover:bg-destructive/10 transition-colors">
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Emoji picker */}
          {showEmojiPicker && (
            <div className="flex gap-1 mb-2 p-1.5 bg-muted rounded-lg w-fit">
              {EMOJI_OPTIONS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => { onToggleReaction(c.id, emoji); setShowEmojiPicker(false); }}
                  className="text-lg hover:scale-125 transition-transform px-1"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          {isEditing ? (
            <div>
              <MentionInput value={editContent} onChange={setEditContent} className="w-full p-2 border border-border rounded-lg text-[13px] bg-background outline-none focus:border-accent transition-colors resize-none font-sans" rows={2} />
              <div className="flex gap-1 mt-1">
                <button onClick={handleUpdate} disabled={updatePending} className="p-1 rounded hover:bg-accent/10"><Check className="w-4 h-4 text-accent" /></button>
                <button onClick={() => setEditingId(null)} className="p-1 rounded hover:bg-muted"><X className="w-4 h-4 text-muted-foreground" /></button>
              </div>
            </div>
          ) : (
            <div className="text-[13px] leading-relaxed">
              {renderMentionedText(c.content, knownNames, onMentionClick)}
            </div>
          )}

          {/* Reactions display */}
          {grouped.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {grouped.map(([emoji, data]) => {
                const hasReacted = user && data.userIds.includes(user.id);
                return (
                  <button
                    key={emoji}
                    onClick={() => user && onToggleReaction(c.id, emoji)}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[12px] border transition-colors ${
                      hasReacted ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-muted border-border text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    <span>{emoji}</span>
                    <span className="font-medium">{data.count}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Tags */}
          {(c.tags || []).length > 0 && (
            <div className="flex gap-1.5 mt-1.5">
              {c.tags.map((t: string) => <span key={t} className="text-[10.5px] font-medium bg-secondary text-muted-foreground px-2 py-0.5 rounded-md">{t}</span>)}
            </div>
          )}

          {/* Reply count */}
          {depth === 0 && childReplies.length > 0 && !isReplying && (
            <button onClick={() => onReply(c.id)} className="text-[11px] text-accent font-medium mt-1.5 hover:underline">
              {childReplies.length} réponse{childReplies.length > 1 ? 's' : ''}
            </button>
          )}
        </div>
      </div>

      {/* Thread replies */}
      {(isReplying || childReplies.length > 0) && depth === 0 && (
        <div>
          {childReplies.map(reply => (
            <CommentItem
              key={reply.id}
              c={reply}
              user={user}
              isAdmin={isAdmin}
              reactions={allReactions.filter(r => r.comment_id === reply.id)}
              allUsers={allUsers}
              knownNames={knownNames}
              depth={1}
              replies={[]}
              allComments={allComments}
              allReactions={allReactions}
              onDelete={onDelete}
              onEdit={onEdit}
              onReply={onReply}
              onMentionClick={onMentionClick}
              onToggleReaction={onToggleReaction}
              editingId={editingId}
              editContent={editContent}
              setEditContent={setEditContent}
              handleUpdate={handleUpdate}
              setEditingId={setEditingId}
              updatePending={updatePending}
              replyingTo={replyingTo}
              replyContent={replyContent}
              setReplyContent={setReplyContent}
              handleReply={handleReply}
              createPending={createPending}
              setReplyingTo={setReplyingTo}
              replyMarketId={replyMarketId}
              setReplyMarketId={setReplyMarketId}
            />
          ))}
          {isReplying && user && (
            <div className="ml-8 border-l-2 border-accent pl-3 py-2">
              <MentionInput
                value={replyContent}
                onChange={setReplyContent}
                className="w-full p-2 border border-border rounded-lg text-[13px] bg-background outline-none focus:border-accent transition-colors resize-none font-sans"
                rows={2}
                placeholder="Répondre dans le thread…"
              />
              <div className="flex gap-2 mt-1.5 items-center">
                <button onClick={handleReply} disabled={createPending || !replyContent.trim()} className="px-3 py-1.5 bg-primary text-primary-foreground text-[12px] font-medium rounded-lg hover:bg-primary/80 disabled:opacity-50">
                  Répondre
                </button>
                <button onClick={() => setReplyingTo(null)} className="text-[12px] text-muted-foreground hover:text-foreground">Annuler</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function CommentsPage({ addSignal, searchQuery = '' }: { addSignal?: number; searchQuery?: string }) {
  const { user } = useAuth();
  const { data: myRole } = useCurrentUserRole();
  const { data: comments = [], isLoading } = useComments();
  const { data: countries = [] } = useCountries();
  const { data: allUsers = [] } = useAllUsersWithRoles();
  const createComment = useCreateComment();
  const updateComment = useUpdateComment();
  const deleteComment = useDeleteComment();
  const toggleReaction = useToggleReaction();

  const isAdmin = myRole === 'admin';

  const [content, setContent] = useState('');
  const [marketId, setMarketId] = useState('');
  const [filterMarket, setFilterMarket] = useState('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [profileUser, setProfileUser] = useState<any>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');

  const commentIds = useMemo(() => comments.map(c => c.id), [comments]);
  const { data: allReactions = [] } = useCommentReactions(commentIds);

  const profile = user?.user_metadata;
  const fullName = profile?.full_name || user?.email || 'Utilisateur';
  const initials = fullName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
  const knownNames = allUsers.map((u: any) => u.full_name);

  // Only show top-level comments (no parent_id)
  const topLevel = comments.filter(c => !c.parent_id);
  const marketFiltered = filterMarket === 'all' ? topLevel : topLevel.filter(c => c.market_id === filterMarket);
  const filtered = searchQuery ? marketFiltered.filter(c => c.content.toLowerCase().includes(searchQuery.toLowerCase()) || c.author_name.toLowerCase().includes(searchQuery.toLowerCase())) : marketFiltered;

  useEffect(() => {
    if (addSignal && addSignal > 0) {
      document.querySelector<HTMLTextAreaElement>('#comment-input')?.focus();
    }
  }, [addSignal]);

  const handleMentionClick = (name: string) => {
    const found = allUsers.find((u: any) => u.full_name === name);
    if (found) setProfileUser(found);
  };

  const publishComment = async (text: string, parentId?: string) => {
    const trimmed = text.trim();
    if (!trimmed) { toast.error('Le commentaire ne peut pas être vide'); return; }
    const country = countries.find(c => c.id === marketId);
    const payload: any = {
      content: trimmed,
      author_id: user?.id ?? null,
      author_name: fullName,
      author_initials: initials,
      author_color: '#1C2B3A',
      market_id: marketId || null,
      market_label: country ? `${country.flag} ${country.name}` : null,
      tags: [],
      parent_id: parentId || null,
    };

    createComment.mutate(payload, {
      onSuccess: async (data) => {
        toast.success(parentId ? 'Réponse publiée' : 'Commentaire publié');
        const mentions = extractMentions(trimmed, allUsers.map((u: any) => ({ user_id: u.user_id, full_name: u.full_name })));
        if (mentions.length > 0 && data?.id) {
          await supabase.from('comment_mentions').insert(mentions.map(m => ({ comment_id: data.id, mentioned_user_id: m.user_id, mentioned_name: m.full_name })));
        }
        if (parentId) { setReplyContent(''); setReplyingTo(null); }
        else { setContent(''); setMarketId(''); }
      },
      onError: (err: Error) => toast.error(err.message),
    });
  };

  const handlePublish = () => publishComment(content);
  const handleReply = () => { if (replyingTo) publishComment(replyContent, replyingTo); };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteComment.mutate(deleteId, {
      onSuccess: () => { toast.success('Commentaire supprimé'); setDeleteId(null); },
      onError: (err: Error) => toast.error(err.message),
    });
  };

  const startEdit = (c: any) => { setEditingId(c.id); setEditContent(c.content); };

  const handleUpdate = () => {
    if (!editingId) return;
    const trimmed = editContent.trim();
    if (!trimmed) { toast.error('Le commentaire ne peut pas être vide'); return; }
    updateComment.mutate({ id: editingId, content: trimmed }, {
      onSuccess: () => { toast.success('Commentaire modifié'); setEditingId(null); },
      onError: (err: Error) => toast.error(err.message),
    });
  };

  const handleToggleReaction = (commentId: string, emoji: string) => {
    if (!user) return;
    toggleReaction.mutate({ commentId, emoji, userId: user.id });
  };

  const ROLE_LABELS: Record<string, string> = {
    admin: 'Administrateur', director: 'Directeur', country_manager: 'Country Manager',
    analyst: 'Analyste', observer: 'Observateur', partner: 'Partenaire',
  };

  if (isLoading) return <div className="text-muted-foreground text-sm p-8">Chargement…</div>;

  return (
    <div className="animate-page-enter">
      <div className="mb-6">
        <h2 className="font-display text-[23px] font-bold text-primary mb-1">Commentaires & Discussions</h2>
        <p className="text-[12.5px] text-muted-foreground">Échanges de l'équipe · <span className="font-semibold text-accent">@nom</span> pour mentionner · Threads pour organiser</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4">
        <div className="bg-card border border-border rounded-lg p-5">
          {filtered.length === 0 && <div className="text-sm text-muted-foreground py-4 text-center">Aucun commentaire</div>}
          <div className="divide-y divide-border">
            {filtered.map(c => (
              <CommentItem
                key={c.id}
                c={c}
                user={user}
                isAdmin={isAdmin}
                reactions={allReactions.filter(r => r.comment_id === c.id)}
                allUsers={allUsers}
                knownNames={knownNames}
                replies={comments.filter(r => r.parent_id === c.id)}
                allComments={comments}
                allReactions={allReactions}
                onDelete={setDeleteId}
                onEdit={startEdit}
                onReply={(id) => { setReplyingTo(id); setReplyContent(''); }}
                onMentionClick={handleMentionClick}
                onToggleReaction={handleToggleReaction}
                editingId={editingId}
                editContent={editContent}
                setEditContent={setEditContent}
                handleUpdate={handleUpdate}
                setEditingId={setEditingId}
                updatePending={updateComment.isPending}
                replyingTo={replyingTo}
                replyContent={replyContent}
                setReplyContent={setReplyContent}
                handleReply={handleReply}
                createPending={createComment.isPending}
                setReplyingTo={setReplyingTo}
                replyMarketId={marketId}
                setReplyMarketId={setMarketId}
              />
            ))}
          </div>

          {user && (
            <div className="mt-4 pt-4 border-t border-border">
              <MentionInput
                id="comment-input"
                value={content}
                onChange={setContent}
                maxLength={1000}
                className="w-full p-3 border-[1.5px] border-border rounded-lg text-[13.5px] bg-background outline-none focus:border-accent focus:bg-card transition-colors resize-none font-sans"
                rows={3}
                placeholder="Ajouter un commentaire… Tapez @ pour mentionner quelqu'un"
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
                <button onClick={handlePublish} disabled={createComment.isPending || !content.trim()} className="px-4 py-2 bg-primary text-primary-foreground text-[13px] font-medium rounded-lg hover:bg-primary/80 transition-colors disabled:opacity-50">
                  Publier →
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="bg-card border border-border rounded-lg p-5 h-fit">
          <h3 className="font-display text-sm font-semibold text-primary mb-3">Filtrer par marché</h3>
          <div className="space-y-1.5">
            <button onClick={() => setFilterMarket('all')} className={`w-full text-left px-3 py-2 rounded-lg border text-[13px] transition-colors ${filterMarket === 'all' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-foreground border-border hover:bg-secondary'}`}>
              Tous les marchés
            </button>
            {countries.map(c => (
              <button key={c.id} onClick={() => setFilterMarket(c.id)} className={`w-full text-left px-3 py-2 rounded-lg border text-[13px] transition-colors ${filterMarket === c.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-foreground border-border hover:bg-secondary'}`}>
                {c.flag} {c.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <Dialog open={!!profileUser} onOpenChange={open => !open && setProfileUser(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Profil utilisateur</DialogTitle></DialogHeader>
          {profileUser && (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold" style={{ background: profileUser.avatar_color }}>{profileUser.initials}</div>
              <div className="text-center">
                <p className="text-lg font-semibold text-primary">{profileUser.full_name}</p>
                <span className="inline-block mt-1 px-3 py-1 rounded-full text-[12px] font-medium bg-accent/10 text-accent">{ROLE_LABELS[profileUser.role] || profileUser.role}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
