interface KpiCardProps {
  label: string;
  value: string;
  meta: string;
  accentColor: string;
  trend?: { value: string; up: boolean };
}

const colorMap: Record<string, string> = {
  sage: 'bg-sage',
  sky: 'bg-sky',
  gold: 'bg-gold',
  terracotta: 'bg-terracotta',
  navy: 'bg-navy',
  plum: 'bg-plum',
};

export default function KpiCard({ label, value, meta, accentColor, trend }: KpiCardProps) {
  return (
    <div className="bg-card border border-border rounded-lg p-5 relative overflow-hidden transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5 cursor-default group">
      <div className={`absolute top-0 left-0 right-0 h-[3px] ${colorMap[accentColor] || 'bg-sage'}`} />
      <div className="text-[10.5px] font-semibold tracking-wide uppercase text-muted-foreground mb-2">
        {label}
      </div>
      <div className="font-display text-[32px] font-bold text-primary leading-none mb-1.5">
        {value}
      </div>
      <div className="text-[11.5px] text-muted-foreground flex items-center gap-1">
        {trend && (
          <span className={`font-semibold ${trend.up ? 'text-sage' : 'text-terracotta'}`}>
            {trend.value}
          </span>
        )}
        {meta}
      </div>
    </div>
  );
}
