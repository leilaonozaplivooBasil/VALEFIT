import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Sparkles, RefreshCw, Share2, TrendingDown, Target } from "lucide-react";
import { AppShell, TopBar } from "@/components/app-shell";
import { MiniMarkdown } from "@/components/markdown";
import { ScoreSparkline } from "@/components/consistency";
import { loadProfile, calcTargets, type Profile, type Targets } from "@/lib/profile";
import { weekComparison } from "@/lib/score";
import { formatDayShort } from "@/lib/tracking";
import { weeklyStats, detectPatterns, projectResult, type Pattern, type Projection } from "@/lib/insights";

export const Route = createFileRoute("/relatorio")({
  head: () => ({
    meta: [
      { title: "Relatório semanal com IA — Nutri IA" },
      { name: "description", content: "Sua semana analisada pela IA: padrões alimentares, evolução do Índice de Consistência e previsão de quando você atinge sua meta." },
      { property: "og:title", content: "Relatório semanal — Nutri IA" },
      { property: "og:description", content: "Padrões, evolução e previsão de resultado gerados por IA." },
      { property: "og:type", content: "article" },
    ],
  }),
  component: RelatorioPage,
});

function RelatorioPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [report, setReport] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    setProfile(loadProfile());
  }, []);

  const targets: Targets | null = useMemo(() => (profile ? calcTargets(profile) : null), [profile]);
  const stats = useMemo(() => (profile && targets ? weeklyStats(profile, targets) : null), [profile, targets]);
  const patterns: Pattern[] = useMemo(() => (profile && targets ? detectPatterns(profile, targets) : []), [profile, targets]);
  const projection: Projection | null = useMemo(() => (profile && targets ? projectResult(profile, targets) : null), [profile, targets]);
  const comparison = useMemo(() => (profile && targets ? weekComparison(profile, targets) : null), [profile, targets]);

  const generate = async () => {
    if (!profile || !targets || !stats) return;
    setLoading(true);
    setError(null);
    setReport("");
    try {
      const res = await fetch("/api/weekly-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "weekly",
          profile: { name: profile.name, goal: profile.goal, targetDeltaKg: profile.targetDeltaKg },
          targets,
          stats: {
            diasRegistrados: stats.logged,
            mediaKcal: stats.avgKcal,
            mediaProteina: stats.avgProtein,
            diasSemAgua: stats.waterMissDays,
            treinos: stats.workouts,
            variacaoPeso: stats.weightDelta,
            indiceMedio: stats.avgScore,
            piorDia: stats.worstDay,
          },
          patterns: patterns.map((p) => p.text),
          projection,
        }),
      });
      if (!res.ok || !res.body) throw new Error(await res.text());
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        setReport(acc);
      }
    } catch (e) {
      setError((e as Error).message || "Não consegui gerar o relatório agora.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile && targets && stats && !started.current) {
      started.current = true;
      void generate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, targets, stats]);

  if (!profile || !targets || !stats) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-6 text-center">
        <div>
          <p className="text-sm font-semibold">Complete seu perfil para ver o relatório.</p>
          <Link to="/" className="mt-3 inline-flex rounded-xl bg-foreground px-4 py-2 text-sm font-semibold text-background">
            Começar
          </Link>
        </div>
      </div>
    );
  }

  return (
    <AppShell>
      <TopBar
        title="Relatório"
        right={
          <Link to="/dashboard" className="grid size-9 place-items-center rounded-xl border border-border text-muted">
            <ArrowLeft className="size-4" />
          </Link>
        }
      />

      <main className="mx-auto max-w-xl space-y-6 px-6 py-6">
        <section className="animate-reveal">
          <p className="font-mono text-[11px] uppercase tracking-widest text-muted">Últimos 7 dias</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight">Sua semana, analisada.</h1>
        </section>

        {/* números da semana */}
        <section className="grid grid-cols-2 gap-3 animate-reveal [animation-delay:60ms]">
          {[
            { label: "Índice médio", value: String(stats.avgScore) },
            { label: "Dias registrados", value: `${stats.logged}/7` },
            { label: "Média de kcal", value: stats.avgKcal.toLocaleString("pt-BR") },
            { label: "Média de proteína", value: `${stats.avgProtein}g` },
            { label: "Treinos", value: String(stats.workouts) },
            { label: "Variação de peso", value: `${stats.weightDelta > 0 ? "+" : ""}${stats.weightDelta} kg` },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-border bg-card p-4">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted">{s.label}</p>
              <p className="mt-1 text-xl font-bold tabular-nums">{s.value}</p>
            </div>
          ))}
        </section>

        {/* evolução do índice */}
        {comparison && (
          <section className="rounded-3xl border border-border bg-card p-5 animate-reveal [animation-delay:120ms]">
            <div className="flex items-center justify-between">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Índice de Consistência</p>
              <span className={`text-xs font-bold ${comparison.delta >= 0 ? "text-primary" : "text-fat"}`}>
                {comparison.delta >= 0 ? "↑" : "↓"} {Math.abs(comparison.delta)} vs. semana passada
              </span>
            </div>
            <div className="mt-4">
              <ScoreSparkline series={comparison.current} height={64} />
              <div className="mt-1 flex justify-between font-mono text-[9px] uppercase tracking-widest text-muted">
                {comparison.current.map((d) => (
                  <span key={d.day}>{formatDayShort(d.day).split(" ")[0]}</span>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* relatório IA */}
        <section className="rounded-3xl border border-border bg-card p-5 animate-reveal [animation-delay:180ms]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              <p className="text-sm font-bold">Análise da Nutri IA</p>
            </div>
            <button
              onClick={() => void generate()}
              disabled={loading}
              className="grid size-8 place-items-center rounded-lg border border-border text-muted disabled:opacity-40"
              aria-label="Gerar novamente"
            >
              <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
          {error ? (
            <p className="mt-3 text-sm text-fat">{error}</p>
          ) : report ? (
            <MiniMarkdown text={report} />
          ) : (
            <p className="text-shimmer mt-3 text-sm font-semibold">Analisando sua semana…</p>
          )}
        </section>

        {/* padrões */}
        <section className="animate-reveal [animation-delay:240ms]">
          <h2 className="mb-3 text-lg font-bold tracking-tight">Padrões que a IA percebeu</h2>
          {patterns.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-5 text-center text-xs text-muted">
              Ainda estou aprendendo seus hábitos. Registre alguns dias e os padrões aparecem aqui.
            </div>
          ) : (
            <div className="space-y-2">
              {patterns.map((p) => (
                <div key={p.id} className="flex gap-3 rounded-2xl border border-border bg-card p-4">
                  <span className="text-lg">{p.emoji}</span>
                  <p className="text-sm leading-relaxed">{p.text}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* previsão */}
        {projection && (
          <section className="rounded-3xl border border-border bg-card p-5 animate-reveal [animation-delay:300ms]">
            <div className="flex items-center gap-2">
              <Target className="size-4 text-primary" />
              <p className="text-sm font-bold">Previsão de resultado</p>
            </div>
            {projection.possible ? (
              <>
                <p className="mt-4 text-3xl font-extrabold tracking-tight">
                  {projection.targetDate}
                </p>
                <p className="mt-1 text-sm text-muted">
                  Mantendo o ritmo atual, faltam ~{projection.weeksToGoal} semanas e {projection.remainingKg}kg.
                </p>
                <div className="mt-4 rounded-2xl bg-primary-soft p-4">
                  <p className="text-xs font-semibold text-primary">
                    <TrendingDown className="mr-1 inline size-3" />
                    Se seu Índice subir 5 pontos: {projection.boostedDate} (~{projection.boostedWeeks} semanas)
                  </p>
                </div>
                <div className="mt-4">
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="font-semibold">Probabilidade de sucesso</span>
                    <span className="tabular-nums text-muted">{projection.probability}%</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${projection.probability}%` }} />
                  </div>
                </div>
              </>
            ) : (
              <p className="mt-3 text-sm leading-relaxed text-muted">{projection.reason}</p>
            )}
            <p className="mt-4 border-t border-border pt-3 text-[11px] leading-relaxed text-muted">
              {projection.possible ? projection.reason : "Estimativas são orientativas e não substituem acompanhamento profissional."}
            </p>
          </section>
        )}

        <Link
          to="/compartilhar"
          className="flex items-center justify-center gap-2 rounded-2xl bg-foreground py-4 text-sm font-semibold text-background animate-reveal [animation-delay:340ms]"
        >
          <Share2 className="size-4" />
          Criar card de compartilhamento
        </Link>
      </main>
    </AppShell>
  );
}
