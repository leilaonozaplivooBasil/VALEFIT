// Anel de progresso SVG com traço suave e animação de preenchimento.

export function ProgressRing({
  value,
  max,
  size = 220,
  stroke = 14,
  color = "var(--primary)",
  trackColor = "var(--primary-soft)",
  children,
}: {
  value: number;
  max: number;
  size?: number;
  stroke?: number;
  color?: string;
  trackColor?: string;
  children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, max > 0 ? value / max : 0));
  const offset = c * (1 - pct);

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke={trackColor} strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 900ms cubic-bezier(0.16, 1, 0.3, 1)" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}

export function MacroBar({ label, value, target, color }: { label: string; value: number; target: number; color: string }) {
  const pct = Math.max(0, Math.min(1, target > 0 ? value / target : 0));
  return (
    <div className="space-y-1.5 text-center sm:px-3 sm:text-left">
      <p className="truncate text-xs font-bold text-foreground/80 sm:text-sm">{label}</p>
      <p className="text-base font-black tabular-nums" style={{ color }}>
        {Math.round(value)}g <span className="text-xs font-semibold text-muted">/ {target}g</span>
      </p>
      <div className="h-2 overflow-hidden rounded-full" style={{ background: `color-mix(in oklab, ${color} 14%, transparent)` }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct * 100}%`, background: color }}
        />
      </div>
    </div>
  );
}
