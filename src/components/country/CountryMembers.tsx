import { useState } from 'react';
import { useCountryMembers, useAddCountryMember, useRemoveCountryMember } from '@/hooks/useCountryMembers';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, X } from 'lucide-react';
import { toast } from 'sonner';

const ROLE_LABELS: Record<string, string> = {
  lead: 'Responsable',
  member: 'Membre',
  consultant: 'Consultant',
};

interface Props {
  countryId: string;
  canWrite: boolean;
}

export default function CountryMembers({ countryId, canWrite }: Props) {
  const { data: members = [] } = useCountryMembers(countryId);
  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('user_id, full_name, initials, avatar_color');
      if (error) throw error;
      return data;
    },
  });
  const addMember = useAddCountryMember();
  const removeMember = useRemoveCountryMember();

  const [adding, setAdding] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedRole, setSelectedRole] = useState('member');

  const assignedIds = members.map(m => m.user_id);
  const available = profiles.filter(p => !assignedIds.includes(p.user_id));

  const handleAdd = () => {
    if (!selectedUser) return;
    addMember.mutate(
      { country_id: countryId, user_id: selectedUser, role_in_country: selectedRole },
      {
        onSuccess: () => { toast.success('Membre ajouté'); setAdding(false); setSelectedUser(''); },
        onError: (err: Error) => toast.error(err.message),
      }
    );
  };

  const handleRemove = (id: string) => {
    removeMember.mutate(id, {
      onSuccess: () => toast.success('Membre retiré'),
      onError: (err: Error) => toast.error(err.message),
    });
  };

  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-[15.5px] font-semibold text-primary">Équipe assignée</h3>
        {canWrite && !adding && (
          <Button onClick={() => setAdding(true)} variant="outline" size="sm" className="gap-1 text-[11px] h-7">
            <Plus className="w-3.5 h-3.5" /> Ajouter
          </Button>
        )}
      </div>

      {adding && (
        <div className="flex gap-2 mb-3">
          <Select value={selectedUser || '_none'} onValueChange={v => setSelectedUser(v === '_none' ? '' : v)}>
            <SelectTrigger className="flex-1 h-8 text-[12px]"><SelectValue placeholder="Choisir un membre" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">Sélectionner</SelectItem>
              {available.map(p => <SelectItem key={p.user_id} value={p.user_id}>{p.full_name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={selectedRole} onValueChange={setSelectedRole}>
            <SelectTrigger className="w-[120px] h-8 text-[12px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(ROLE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" className="h-8" onClick={handleAdd} disabled={!selectedUser || addMember.isPending}>OK</Button>
          <Button size="sm" variant="ghost" className="h-8" onClick={() => setAdding(false)}><X className="w-4 h-4" /></Button>
        </div>
      )}

      {members.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">Aucun membre assigné</p>
      ) : (
        <div className="space-y-1.5">
          {members.map(m => {
            const profile = profiles.find(p => p.user_id === m.user_id);
            return (
              <div key={m.id} className="flex items-center gap-2 py-2 px-2 rounded-lg hover:bg-muted/50 transition-colors group">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
                  style={{ backgroundColor: profile?.avatar_color || 'hsl(var(--primary))' }}
                >
                  {profile?.initials || '??'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium truncate">{profile?.full_name || 'Inconnu'}</div>
                  <div className="text-[10.5px] text-muted-foreground">{ROLE_LABELS[m.role_in_country] || m.role_in_country}</div>
                </div>
                {canWrite && (
                  <button onClick={() => handleRemove(m.id)} className="p-1 rounded hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity">
                    <X className="w-3.5 h-3.5 text-destructive" />
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
