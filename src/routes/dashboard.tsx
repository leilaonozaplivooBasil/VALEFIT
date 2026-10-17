import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Camera, Mic, Sparkles, Droplet, Scale, Flame, MessageCircle, Plus, FileText, PlayCircle } from "lucide-react";
import { AppShell, TopBar } from "@/components/app-shell";
import { ProgressRing, MacroBar } from "@/components/rings";
import { ConsistencyCard } from "@/components/consistency";
import { DayTimeline, NudgeStack } from "@/components/timeline";
import { todayScore } from "@/lib/score";
import { logWaterEvent } from "@/lib/tracking";
import { todayTimeline, proactiveNudges } from "@/lib/insights";
import { loadProfile, calcTargets, type Profile, type Targets } from "@/lib/profile";
import {
  loadMealsToday, totalsToday, getStreak, getWaterToday, addWater,
  addWeightEntry, getWeightLog, type MealItem,
} from "@/lib/meals";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Meu dia — Nutri IA" },
      { name: "description", content: "Seu painel diário: calorias, macros, hidratação, peso e refeições registradas por IA." },
      { property: "og:title", content: "Dashboard — Nutri IA" },
      { property: "og:description", content: "Seu dia nutricional em um só lugar." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Dashboard,
});

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

function formattedDate() {
  return new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
}

function Dashboard() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [meals, setMeals] = useState<MealItem[]>([]);
  const [water, setWater] = useState(0);
  const [streak, setStreak] = useState(0);
  const [weightModal, setWeightModal] = useState(false);
  const [newWeight, setNewWeight] = useState("");

  useEffect(() => {
    const p = loadProfile();
    if (!p) { navigate({ to: "/", replace: true }); return; }
    setProfile(p);
    setMeals(loadMealsToday());
    setWater(getWaterToday());
    setStreak(getStreak());
  }, [navigate]);

  const targets: Targets | null = useMemo(() => (profile ? calcTargets(profile) : null), [profile]);
  const totals = useMemo(() => totalsToday(meals), [meals]);
  const currentWeight = useMemo(() => {
    const log = getWeightLog();
    return log[0]?.kg ?? profile?.weightKg ?? 0;
  }, [profile, weightModal]);
  const weekAgoWeight = useMemo(() => {
    const log = getWeightLog();
    return log[log.length - 1]?.kg ?? null;
  }, [weightModal]);

  if (!profile || !targets) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <p className="text-shimmer text-sm font-semibold">Carregando seu painel…</p>
      </div>
    );
  }

  const kcalRemaining = Math.max(0, targets.calories - totals.kcal);
  const firstName = profile.name.split(" ")[0];
  const score = todayScore(profile, targets);
  const nudges = proactiveNudges(profile, targets);
  const timelineEvents = todayTimeline(profile, targets);

  const handleAddWater = (ml: number) => {
    addWater(ml);
    logWaterEvent(ml);
    setWater(getWaterToday());
  };

  const handleWeightSubmit = () => {
    const kg = Number(newWeight.replace(",", "."));
    if (kg > 0) {
      addWeightEntry(kg);
      setWeightModal(false);
      setNewWeight("");
    }
  };

  return (
    <AppShell>
      <TopBar
        right={
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Sequência</p>
              <p className="text-sm font-bold">{streak} dia{streak === 1 ? "" : "s"} 🔥</p>
            </div>
            <Link
              to="/perfil"
              aria-label="Perfil"
              className="grid size-9 place-items-center rounded-xl border border-border text-xs font-bold text-muted"
            >
              {firstName.charAt(0).toUpperCase()}
            </Link>
          </div>
        }
      />

      <main className="mx-auto max-w-xl space-y-6 px-6 py-6">
        <section className="animate-reveal">
          <p className="font-mono text-[11px] uppercase tracking-widest text-muted">
            {formattedDate()}
          </p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight">
            {greeting()}, {firstName}.
          </h1>
        </section>

        {/* Hero rings */}
        <section className="animate-reveal [animation-delay:80ms] rounded-[32px] border border-border bg-card p-6 shadow-sm">
          <div className="flex justify-center">
            <ProgressRing value={totals.kcal} max={targets.calories}>
              <div className="text-center">
                <p className="text-4xl font-extrabold tracking-tighter tabular-nums">
                  {kcalRemaining.toLocaleString("pt-BR")}
                </p>
                <p className="mt-1 text-xs font-medium text-muted">kcal restantes</p>
                <p className="mt-3 font-mono text-[10px] uppercase tracking-widest text-muted">
                  Meta {targets.calories.toLocaleString("pt-BR")}
                </p>
              </div>
            </ProgressRing>
          </div>

          <div className="mt-8 grid grid-cols-3 gap-6">
            <MacroBar label="Proteína" value={totals.protein} target={targets.protein} color="hsl(155 100% 28%)" />
            <MacroBar label="Carbos" value={totals.carbs} target={targets.carbs} color="hsl(212 96% 55%)" />
            <MacroBar label="Gordura" value={totals.fat} target={targets.fat} color="hsl(28 96% 55%)" />
          </div>
        </section>

        {/* Índice de Consistência */}
        <ConsistencyCard score={score} className="animate-reveal [animation-delay:110ms]" />

        {/* IA proativa */}
        <section className="animate-reveal [animation-delay:130ms]">
          <NudgeStack nudges={nudges} />
        </section>

        {/* Atalhos IA */}
        <section className="grid grid-cols-2 gap-3 animate-reveal [animation-delay:150ms]">
          <Link to="/relatorio" className="flex items-center gap-2 rounded-2xl border border-border bg-card p-4 text-sm font-semibold transition hover:border-foreground/30">
            <FileText className="size-4 text-primary" /> Relatório
          </Link>
          <Link to="/recap" className="flex items-center gap-2 rounded-2xl border border-border bg-card p-4 text-sm font-semibold transition hover:border-foreground/30">
            <PlayCircle className="size-4 text-primary" /> Recap
          </Link>
        </section>

        {/* Quick AI CTA */}
        <section className="animate-reveal [animation-delay:160ms]">
          <Link to="/log" className="group relative block">
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-primary to-blue-500 opacity-10 blur transition group-hover:opacity-25" />
            <div className="relative flex items-center gap-3 rounded-2xl border border-border bg-card p-2 pl-5">
              <Sparkles className="size-5 text-primary" />
              <span className="flex-1 text-sm font-medium text-muted">O que você comeu agora?</span>
              <span className="grid size-10 place-items-center rounded-xl bg-secondary text-muted">
                <Mic className="size-4" />
              </span>
              <span className="grid size-10 place-items-center rounded-xl bg-secondary text-muted">
                <Camera className="size-4" />
              </span>
              <span className="rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background">
                Registrar
              </span>
            </div>
          </Link>
        </section>

        {/* Stats row */}
        <section className="grid grid-cols-2 gap-4 animate-reveal [animation-delay:220ms]">
          <div className="rounded-3xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Hidratação</p>
              <Droplet className="size-4 text-water" />
            </div>
            <div className="mt-2 flex items-end justify-between">
              <p className="text-2xl font-bold tabular-nums">
                {(water / 1000).toFixed(1)}<span className="text-sm font-normal">L</span>
              </p>
              <p className="text-xs text-muted">Meta {(targets.waterMl / 1000).toFixed(1)}L</p>
            </div>
            <div className="mt-3 flex gap-1">
              {Array.from({ length: 8 }).map((_, i) => {
                const target = targets.waterMl;
                const glassMl = target / 8;
                const filled = water >= glassMl * (i + 1);
                return (
                  <div
                    key={i}
                    className="h-5 flex-1 rounded-sm transition-colors"
                    style={{ background: filled ? "var(--water)" : "var(--water-soft)" }}
                  />
                );
              })}
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => handleAddWater(250)}
                className="flex-1 rounded-lg bg-water-soft py-1.5 text-xs font-semibold text-water hover:brightness-95"
              >
                +250ml
              </button>
              <button
                onClick={() => handleAddWater(500)}
                className="flex-1 rounded-lg bg-water-soft py-1.5 text-xs font-semibold text-water hover:brightness-95"
              >
                +500ml
              </button>
            </div>
          </div>

          <button
            onClick={() => setWeightModal(true)}
            className="rounded-3xl border border-border bg-card p-5 text-left transition hover:border-foreground/30"
          >
            <div className="flex items-center justify-between">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Peso</p>
              <Scale className="size-4 text-muted" />
            </div>
            <div className="mt-2 flex items-end justify-between">
              <p className="text-2xl font-bold tabular-nums">
                {currentWeight.toFixed(1)}<span className="text-sm font-normal"> kg</span>
              </p>
              {weekAgoWeight && weekAgoWeight !== currentWeight ? (
                <p className={`text-xs font-semibold ${currentWeight < weekAgoWeight ? "text-primary" : "text-fat"}`}>
                  {currentWeight < weekAgoWeight ? "↓" : "↑"} {Math.abs(currentWeight - weekAgoWeight).toFixed(1)}kg
                </p>
              ) : (
                <p className="text-xs text-muted">Toque para atualizar</p>
              )}
            </div>
            {targets.estimatedWeeks ? (
              <p className="mt-4 text-xs text-muted">
                <Flame className="mr-1 inline size-3 text-primary" />
                ~{targets.estimatedWeeks} semanas para meta
              </p>
            ) : (
              <p className="mt-4 text-xs text-muted">Meta: {profile.goal === "maintain" ? "manter peso" : profile.goal === "track" ? "acompanhar" : ""}</p>
            )}
          </button>
        </section>

        {/* Timeline */}
        <section className="animate-reveal [animation-delay:280ms]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold tracking-tight">Refeições de hoje</h2>
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
              {meals.length} registro{meals.length === 1 ? "" : "s"}
            </span>
          </div>
          {meals.length === 0 ? (
            <Link
              to="/log"
              className="block rounded-2xl border border-dashed border-border bg-card p-8 text-center transition hover:border-foreground/40"
            >
              <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary">
                <Plus className="size-5" />
              </div>
              <p className="mt-3 font-semibold">Nenhuma refeição hoje</p>
              <p className="mt-1 text-xs text-muted">A IA registra em 15 segundos.</p>
            </Link>
          ) : (
            <div className="space-y-3">
              {meals.map((m) => (
                <div key={m.id} className="flex gap-4">
                  <div className="flex flex-col items-center pt-2">
                    <div className="size-2.5 rounded-full bg-primary ring-4 ring-primary-soft" />
                    <div className="mt-1 w-px flex-1 bg-border" />
                  </div>
                  <div className="flex-1 rounded-2xl border border-border bg-card p-4">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-sm font-bold">{m.category}</span>
                      <span className="font-mono text-[10px] uppercase tracking-widest text-muted">{m.when}</span>
                    </div>
                    <p className="text-sm leading-relaxed text-foreground">{m.description}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium tabular-nums">{m.kcal} kcal</span>
                      <span className="rounded-full bg-primary-soft px-2.5 py-1 text-[11px] font-medium text-primary tabular-nums">{m.protein}g prot</span>
                      <span className="rounded-full bg-carb-soft px-2.5 py-1 text-[11px] font-medium text-carb tabular-nums">{m.carbs}g carb</span>
                      <span className="rounded-full bg-fat-soft px-2.5 py-1 text-[11px] font-medium text-fat tabular-nums">{m.fat}g gord</span>
                      <span className="ml-auto font-mono text-[10px] uppercase tracking-widest text-muted">via {m.source}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Linha do tempo do dia */}
        <section className="animate-reveal [animation-delay:320ms]">
          <h2 className="mb-3 text-lg font-bold tracking-tight">Linha do tempo</h2>
          <DayTimeline events={timelineEvents} />
        </section>

        {/* AI chat suggestions */}
        <section className="animate-reveal [animation-delay:340ms]">
          <Link
            to="/chat"
            className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition hover:border-foreground/30"
          >
            <div className="grid size-10 place-items-center rounded-xl bg-foreground text-background">
              <MessageCircle className="size-4" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold">Perguntar para o Coach IA</p>
              <p className="text-xs text-muted">"Posso comer pizza hoje?" · "O que jantar?"</p>
            </div>
          </Link>
        </section>
      </main>

      {weightModal && (
        <div
          className="fixed inset-0 z-[60] grid place-items-end bg-foreground/40 backdrop-blur-sm animate-fade sm:place-items-center"
          onClick={() => setWeightModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-t-3xl border border-border bg-card p-6 sm:rounded-3xl animate-reveal"
          >
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Atualizar peso</p>
            <h3 className="mt-1 text-xl font-bold">Quanto você pesa hoje?</h3>
            <div className="mt-6 flex items-baseline gap-3">
              <input
                autoFocus
                inputMode="decimal"
                placeholder="78.4"
                value={newWeight}
                onChange={(e) => setNewWeight(e.target.value.replace(/[^\d.,]/g, ""))}
                className="flex-1 rounded-2xl border border-border bg-background px-5 py-4 text-4xl font-extrabold outline-none focus:border-foreground"
              />
              <span className="text-2xl font-bold text-muted">kg</span>
            </div>
            <div className="mt-6 flex gap-2">
              <button
                onClick={() => setWeightModal(false)}
                className="flex-1 rounded-xl border border-border bg-card py-3 text-sm font-semibold text-muted"
              >
                Cancelar
              </button>
              <button
                onClick={handleWeightSubmit}
                className="flex-1 rounded-xl bg-foreground py-3 text-sm font-semibold text-background"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
