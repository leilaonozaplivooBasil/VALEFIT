import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell, TopBar } from "@/components/app-shell";
import { getStreak, getWeightLog, type WeightEntry } from "@/lib/meals";
import { loadProfile } from "@/lib/profile";

export const Route = createFileRoute("/evolucao")({
  head: () => ({
    meta: [
      { title: "Evolução — Nutri IA" },
      { name: "description", content: "Acompanhe sua evolução de peso, consistência e sequência de dias registrados no Nutri IA." },
      { property: "og:title", content: "Evolução — Nutri IA" },
      { property: "og:description", content: "Sua jornada visualizada." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Evolucao,
});

function Evolucao() {
  const navigate = useNavigate();
  const [log, setLog] = useState<WeightEntry[]>([]);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    const p = loadProfile();
    if (!p) { navigate({ to: "/", replace: true }); return; }
    const l = getWeightLog();
    if (l.length === 0) setLog([{ date: new Date().toISOString().slice(0, 10), kg: p.weightKg }]);
    else setLog(l);
    setStreak(getStreak());
  }, [navigate]);

  const chart = useMemo(() => {
    const sorted = [...log].reverse();
    if (sorted.length < 2) return { points: "", min: 0, max: 0, data: sorted };
    const kgs = sorted.map((e) => e.kg);
    const min = Math.min(...kgs);
    const max = Math.max(...kgs);
    const range = max - min || 1;
    const w = 320;
    const h = 120;
    const step = sorted.length > 1 ? w / (sorted.length - 1) : 0;
    const points = sorted
      .map((e, i) => {
        const x = i * step;
        const y = h - ((e.kg - min) / range) * h;
        return `${x},${y}`;
      })
      .join(" ");
    return { points, min, max, data: sorted };
  }, [log]);

  const current = log[0]?.kg ?? 0;
  const first = log[log.length - 1]?.kg ?? 0;
  const delta = current - first;

  return (
    <AppShell>
      <TopBar />
      <main className="mx-auto max-w-xl space-y-6 px-6 py-6">
        <section className="animate-reveal">
          <p className="font-mono text-[11px] uppercase tracking-widest text-muted">Evolução</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight">Sua jornada</h1>
        </section>

        <section className="animate-reveal [animation-delay:80ms] grid grid-cols-3 gap-3">
          <StatCard label="Sequência" value={`${streak}`} sub="dias 🔥" />
          <StatCard label="Peso" value={current.toFixed(1)} sub="kg atual" />
          <StatCard
            label="Variação"
            value={`${delta >= 0 ? "+" : ""}${delta.toFixed(1)}`}
            sub="kg no total"
            highlight={delta !== 0}
          />
        </section>

        <section className="animate-reveal [animation-delay:160ms] rounded-3xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Peso ao longo do tempo</p>
            <p className="text-xs text-muted">{log.length} registro{log.length === 1 ? "" : "s"}</p>
          </div>
          {log.length >= 2 ? (
            <svg viewBox="0 0 320 120" className="h-32 w-full">
              <defs>
                <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
                </linearGradient>
              </defs>
              <polyline
                points={chart.points}
                fill="none"
                stroke="var(--primary)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <polygon
                points={`0,120 ${chart.points} 320,120`}
                fill="url(#g)"
              />
            </svg>
          ) : (
            <p className="py-8 text-center text-sm text-muted">
              Registre seu peso alguns dias para ver o gráfico.
            </p>
          )}
        </section>

        <section className="animate-reveal [animation-delay:240ms]">
          <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted">Histórico</p>
          <div className="space-y-2">
            {log.map((e) => (
              <div key={e.date} className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
                <span className="text-sm text-muted">
                  {new Date(e.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                </span>
                <span className="font-bold tabular-nums">{e.kg.toFixed(1)} kg</span>
              </div>
            ))}
          </div>
        </section>
      </main>
    </AppShell>
  );
}

function StatCard({ label, value, sub, highlight }: { label: string; value: string; sub: string; highlight?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="font-mono text-[10px] uppercase tracking-widest text-muted">{label}</p>
      <p className={`mt-1 text-2xl font-extrabold tabular-nums ${highlight ? "text-primary" : ""}`}>{value}</p>
      <p className="text-[11px] text-muted">{sub}</p>
    </div>
  );
}
