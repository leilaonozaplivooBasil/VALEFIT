import type { DayScore } from "@/lib/score";
import { scoreLabel } from "@/lib/score";

const COLORS: Record<string, string> = {
  food: "var(--primary)",
  protein: "var(--primary)",
  water: "var(--water)",
  workout: "var(--fat)",
  log: "var(--carb)",
  sleep: "var(--muted)",
};

export function ConsistencyRing({
  score,
  size = 168,
  stroke = 12,
  compact = false,
}: {
  score: number;
  size?: number;
  stroke?: number;
  compact?: boolean;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score)) / 100;
  const { label } = scoreLabel(score);

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--secondary)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: "stroke-dashoffset 900ms cubic-bezier(0.16,1,0.3,1)" }}
        />
      </svg>
      <div className="absolute text-center">
        <p className="text-4xl font-black tabular-nums tracking-tighter text-brand-deep">{score}</p>
        {!compact && (
          <>
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted">de 100</p>
            <p className="mt-1 text-xs font-semibold text-primary">{label}</p>
          </>
        )}
      </div>
    </div>
  );
}

export function ConsistencyCard({ score, className = "" }: { score: DayScore; className?: string }) {
  return (
    <section className={`card-soft rounded-[28px] p-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight">Como está seu dia</h2>
          <p className="mt-0.5 text-sm text-muted">Acompanhe sua evolução e mantenha o foco.</p>
        </div>
        <span className="shrink-0 rounded-full bg-primary-soft px-3 py-1.5 text-xs font-bold text-primary">
          Índice de consistência
        </span>
      </div>

      <div className="mt-4 flex flex-col items-center gap-6 sm:flex-row">
        <ConsistencyRing score={score.score} />
        <div className="w-full flex-1 space-y-3">
          {score.parts.map((p) => (
            <div key={p.key}>
              <div className="flex items-baseline justify-between text-xs">
                <span className="font-bold">{p.label}</span>
                <span className="tabular-nums text-muted">
                  {p.pct}% <span className="text-[10px]">· {p.detail}</span>
                </span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${p.pct}%`, background: COLORS[p.key] }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ScoreSparkline({ series, height = 56 }: { series: DayScore[]; height?: number }) {
  const max = 100;
  return (
    <div className="flex items-end gap-1" style={{ height }}>
      {series.map((s) => (
        <div key={s.day} className="flex-1" title={`${s.day}: ${s.score}`}>
          <div
            className="w-full rounded-t-sm"
            style={{
              height: `${Math.max(3, (s.score / max) * height)}px`,
              background: s.hasData ? "var(--primary)" : "var(--secondary)",
              opacity: s.hasData ? (s.score >= 70 ? 1 : 0.55) : 1,
            }}
          />
        </div>
      ))}
    </div>
  );
}
