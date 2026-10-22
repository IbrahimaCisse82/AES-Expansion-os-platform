import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from '@/components/ui/command';
import { FilePlus2, FileText, Globe, Receipt, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useMyEnvironments } from '@/hooks/useEnvironments';
import { useReports, STATUS_LABEL } from '@/hooks/useReporting';
import { useCountries } from '@/hooks/useExpansionData';
import { COMMON_NAV, writeLastEnv } from '@/lib/environments';
import { REPORT_TEMPLATES, periodLabel, templateByCode } from '@/lib/reporting/templates';

/** Recherche transversale (Ctrl+K) : pages, rapports, ventes et pays des environnements ouverts à l'utilisateur. */
export default function GlobalSearch({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const navigate = useNavigate();
  const { envs } = useMyEnvironments();
  const has = (id: string) => envs.some(e => e.id === id);
  const { data: reports = [] } = useReports({ enabled: open && has('reporting') });
  const { data: countries = [] } = useCountries({ enabled: open && has('expansion') });
  const { data: sales = [] } = useQuery({
    queryKey: ['global-search-sales'],
    enabled: open && has('tc'),
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from('tc_sales').select('id, quote_no, client, salesperson, sale_date, lost').order('quote_date', { ascending: false }).limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); onOpenChange(!open); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  const go = (path: string) => { onOpenChange(false); navigate(path); };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title="Rechercher partout" description="Pages, rapports, devis et pays des environnements qui vous sont ouverts">
      <CommandInput placeholder="Page, rapport, client, devis, pays…" />
      <CommandList className="max-h-[420px]">
        <CommandEmpty>Aucun résultat.</CommandEmpty>
        <CommandGroup heading="Environnements">
          {envs.map(e => (
            <CommandItem key={e.id} value={`environnement ${e.label}`} onSelect={() => { writeLastEnv(e.id); go(e.home); }}>
              <span className={`mr-2 h-2 w-2 rounded-full ${e.accent}`} /><e.icon className="mr-2 h-4 w-4" />{e.label}
            </CommandItem>
          ))}
        </CommandGroup>
        {envs.map(e => (
          <CommandGroup key={e.id} heading={e.label}>
            {e.nav.flatMap(g => g.items).map(i => (
              <CommandItem key={i.path} value={`${e.label} ${i.label}`} onSelect={() => go(i.path)}>
                <i.icon className="mr-2 h-4 w-4" />{i.label}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
        <CommandGroup heading="Commun">
          {COMMON_NAV.map(i => <CommandItem key={i.path} value={`commun ${i.label}`} onSelect={() => go(i.path)}><i.icon className="mr-2 h-4 w-4" />{i.label}</CommandItem>)}
        </CommandGroup>
        {has('reporting') && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Rapports">
              {reports.slice(0, 50).map(r => (
                <CommandItem key={r.id} value={`rapport ${r.template_code} ${templateByCode(r.template_code)?.name ?? r.title} ${periodLabel(r.period)} ${r.author_name ?? ''}`} onSelect={() => go(`/app/reporting/${r.id}`)}>
                  <FileText className="mr-2 h-4 w-4" />{r.template_code} — {periodLabel(r.period)}
                  <span className="ml-auto text-[11px] text-muted-foreground">{STATUS_LABEL[r.status]} · {r.author_name ?? ''}</span>
                </CommandItem>
              ))}
              {REPORT_TEMPLATES.map(t => (
                <CommandItem key={`new-${t.code}`} value={`nouveau rapport ${t.code} ${t.name}`} onSelect={() => go(`/app/reporting/nouveau/${t.code}`)}>
                  <FilePlus2 className="mr-2 h-4 w-4" />Nouveau {t.code} — {t.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
        {has('tc') && sales.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Devis et ventes">
              {sales.map(s => (
                <CommandItem key={s.id} value={`vente devis ${s.quote_no} ${s.client} ${s.salesperson ?? ''}`} onSelect={() => go(`/app/tc/ventes?q=${encodeURIComponent(s.quote_no)}`)}>
                  <Receipt className="mr-2 h-4 w-4" />{s.quote_no} — {s.client}
                  <span className="ml-auto text-[11px] text-muted-foreground">{s.lost ? 'Perdu' : s.sale_date ? 'Vendu' : 'Devis'}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
        {has('expansion') && countries.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Pays">
              {countries.map(c => (
                <CommandItem key={c.id} value={`pays ${c.name}`} onSelect={() => go(`/app/countries/${c.id}`)}>
                  <Globe className="mr-2 h-4 w-4" />{c.flag} {c.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}

export function GlobalSearchButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label="Rechercher partout (Ctrl+K)"
      className="flex items-center gap-2 h-[34px] px-2 sm:pl-2.5 sm:pr-1.5 border-[1.5px] border-border rounded-lg bg-card text-[12.5px] text-muted-foreground hover:bg-muted transition-colors">
      <Search size={14} /><span className="hidden md:inline">Rechercher partout</span>
      <kbd className="hidden sm:inline ml-1 rounded border border-border bg-muted px-1.5 text-[10px] font-medium">Ctrl K</kbd>
    </button>
  );
}
