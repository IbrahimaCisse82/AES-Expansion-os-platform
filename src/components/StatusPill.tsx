interface StatusPillProps {
  status: 'active' | 'done' | 'planning' | 'paused' | 'late';
}

const config: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: 'bg-sage-light', text: 'text-sage-dark', label: 'Actif' },
  done: { bg: 'bg-sky-light', text: 'text-sky', label: 'Lancé' },
  planning: { bg: 'bg-gold-light', text: 'text-gold', label: 'Planification' },
  paused: { bg: 'bg-terracotta-light', text: 'text-terracotta', label: 'En pause' },
  late: { bg: 'bg-terracotta-light', text: 'text-terracotta', label: 'En retard' },
};

export default function StatusPill({ status }: StatusPillProps) {
  const c = config[status] || config.active;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium ${c.bg} ${c.text}`}>
      <span className="w-[5px] h-[5px] rounded-full bg-current" />
      {c.label}
    </span>
  );
}
