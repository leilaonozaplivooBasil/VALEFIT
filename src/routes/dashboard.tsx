import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Camera, Mic, Sparkles, Droplet, Scale, Flame, Plus, FileText, PlayCircle, Utensils, Trophy, ChevronRight, Target, Zap, Check } from "lucide-react";
import { AppShell, TopBar } from "@/components/app-shell";
import { Cuca, CucaAvatar, SpeechBubble, Squiggle } from "@/components/brand";
import { ProgressRing, MacroBar } from "@/components/rings";
import { ConsistencyCard } from "@/components/consistency";
import { DayTimeline, NudgeStack } from "@/components/timeline";
import { todayScore } from "@/lib/score";
import { dailyMissions, missionPointsToday, syncXp, levelFromXp } from "@/lib/gamification";
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
      { title: "Meu dia — ValeFit" },
      { name: "description", content: "Seu painel diário: calorias, macros, hidratação, peso e refeições registradas por IA." },
      { property: "og:title", content: "Dashboard — ValeFit" },
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

// O Cuca comenta o dia da pessoa, como um mascote que torce por ela.
function cucaFala(opts: { meals: number; kcalPct: number; waterPct: number; streak: number }) {
  if (opts.meals === 0) return { title: "Bora começar?", text: "Registre sua primeira refeição e eu calculo tudo pra você." };
  if (opts.kcalPct > 1.1) return { title: "Tudo bem, amanhã tem mais!", text: "Um dia acima da meta não apaga sua evolução." };
  if (opts.waterPct < 0.4) return { title: "Bora se hidratar?", text: "Um copo de água agora já faz diferença." };
  if (opts.streak >= 3) return { title: `${opts.streak} dias seguidos!`, text: "Você está construindo um hábito de verdade." };
  if (opts.kcalPct >= 0.85) return { title: "Você está mandando bem!", text: "Quase na meta do dia. Continue assim." };
  return { title: "Você consegue!", text: "Mais um passo para a sua melhor versão." };
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

  const kcalPct = targets.calories > 0 ? totals.kcal / targets.calories : 0;
  const waterPct = targets.waterMl > 0 ? water / targets.waterMl : 0;
  const fala = cucaFala({ meals: meals.length, kcalPct, waterPct, streak });
  const missions = dailyMissions(profile, targets);
  const pts = missionPointsToday(profile, targets);
  const xp = syncXp(profile, targets);
  const level = levelFromXp(xp);
  const progressRows = [
    { label: "Alimentação", pct: Math.min(100, Math.round(kcalPct * 100)), icon: Utensils },
    { label: "Hidratação", pct: Math.min(100, Math.round(waterPct * 100)), icon: Droplet },
    { label: "Missões", pct: pts.total ? Math.round((pts.earned / pts.total) * 100) : 0, icon: Trophy },
  ];

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
        wide
        right={
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-sm font-extrabold text-fat" title="Sequência de dias">
              <Flame className="size-4" fill="currentColor" /> {streak}
            </span>
            <span className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-sm font-extrabold text-primary" title="Seu XP">
              <Zap className="size-4" fill="currentColor" /> {xp}
            </span>
            <Link
              to="/perfil"
              aria-label="Perfil"
              className="grid size-9 place-items-center rounded-full bg-brand-deep text-sm font-bold text-white"
            >
              {firstName.charAt(0).toUpperCase()}
            </Link>
          </div>
        }
      />

      <main className="mx-auto max-w-xl px-5 py-6 lg:max-w-6xl lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="min-w-0 space-y-6">
            {/* Saudação com o Cuca */}
            <section className="animate-reveal relative">
              <div className="flex items-end gap-2">
                <div className="min-w-0 flex-1 pb-4">
                  <p className="font-mono text-[11px] uppercase tracking-widest text-muted">{formattedDate()}</p>
                  <h1 className="mt-1 text-3xl font-black tracking-tight text-brand-deep sm:text-4xl">
                    Olá, {firstName}! <span className="inline-block origin-bottom-right animate-pop">👋</span>
                  </h1>
                  <p className="mt-2 text-[15px] leading-snug text-foreground/80 sm:text-base">
                    {greeting()}! Que tal manter o foco hoje?
                    <span className="hidden sm:inline"> Seu corpo e sua mente agradecem.</span>
                  </p>
                </div>
                <Cuca pose="joia" className="animate-cuca w-36 shrink-0 sm:w-44 lg:w-52" />
                <SpeechBubble title={fala.title} className="mb-auto mt-6 hidden w-44 shrink-0 lg:block">
                  {fala.text}
                </SpeechBubble>
              </div>
              <SpeechBubble title={fala.title} side="bottom" className="-mt-1 lg:hidden">
                {fala.text}
              </SpeechBubble>
            </section>

            {/* Ações rápidas */}
            <section className="grid grid-cols-3 gap-3 animate-reveal [animation-delay:60ms]">
              {[
                { to: "/log", label: "Registrar refeição", icon: Utensils },
                { to: "/missoes", label: "Missões do dia", icon: Trophy },
                { to: "/chat", label: "Falar com o Cuca", icon: Sparkles },
              ].map((a) => (
                <Link
                  key={a.to}
                  to={a.to}
                  className="card-soft btn-3d-soft group flex flex-col items-start gap-2 rounded-2xl p-3 sm:flex-row sm:items-center sm:gap-3 sm:p-4"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-lime/60 text-brand-deep">
                    <a.icon className="size-5" />
                  </span>
                  <span className="flex-1 text-[13px] font-bold leading-tight sm:text-sm">{a.label}</span>
                  <ChevronRight className="hidden size-4 text-muted transition group-hover:translate-x-0.5 sm:block" />
                </Link>
              ))}
            </section>

            {/* Sua nutrição hoje */}
            <section className="card-soft animate-reveal rounded-[28px] p-6 [animation-delay:80ms]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-extrabold tracking-tight">Sua nutrição hoje</h2>
                  <p className="mt-0.5 text-sm text-muted">Mantenha o equilíbrio para alcançar seus objetivos.</p>
                </div>
                <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1.5 text-xs font-bold text-primary">
                  <Target className="size-3.5" /> Meta diária
                </span>
              </div>
              <div className="mt-6 flex flex-col items-center gap-8 sm:flex-row sm:items-center">
                <ProgressRing value={totals.kcal} max={targets.calories} size={188} stroke={16} trackColor="var(--secondary)">
                  <div className="text-center">
                    <p className="text-4xl font-black tracking-tighter tabular-nums text-brand-deep">
                      {kcalRemaining.toLocaleString("pt-BR")}
                    </p>
                    <p className="text-sm font-semibold">kcal restantes</p>
                    <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-muted">
                      Meta {targets.calories.toLocaleString("pt-BR")}
                    </p>
                  </div>
                </ProgressRing>
                <div className="grid w-full flex-1 grid-cols-3 gap-4 sm:divide-x sm:divide-border">
                  <MacroBar label="Proteínas" value={totals.protein} target={targets.protein} color="var(--primary)" />
                  <MacroBar label="Carboidratos" value={totals.carbs} target={targets.carbs} color="var(--carb)" />
                  <MacroBar label="Gorduras" value={totals.fat} target={targets.fat} color="var(--fat)" />
                </div>
              </div>
            </section>

            {/* Registro rápido por IA */}
            <section className="animate-reveal [animation-delay:120ms]">
              <Link to="/log" className="card-soft flex items-center gap-3 rounded-2xl p-2 pl-3 transition hover:border-primary/40">
                <CucaAvatar className="size-10" />
                <span className="flex-1 text-sm font-semibold text-muted">O que você comeu agora?</span>
                <span className="hidden size-10 place-items-center rounded-xl bg-secondary text-muted sm:grid">
                  <Mic className="size-4" />
                </span>
                <span className="hidden size-10 place-items-center rounded-xl bg-secondary text-muted sm:grid">
                  <Camera className="size-4" />
                </span>
                <span className="btn-3d rounded-xl bg-primary px-4 py-2.5 text-sm font-extrabold text-white">Registrar</span>
              </Link>
            </section>

            {/* Índice de Consistência */}
            <ConsistencyCard score={score} className="animate-reveal [animation-delay:140ms]" />

            {/* IA proativa */}
            <section className="animate-reveal [animation-delay:160ms]">
              <NudgeStack nudges={nudges} />
            </section>

            {/* Refeições */}
            <section className="animate-reveal [animation-delay:200ms]">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-extrabold tracking-tight">Refeições de hoje</h2>
                <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-bold text-muted">
                  {meals.length} registro{meals.length === 1 ? "" : "s"}
                </span>
              </div>
              {meals.length === 0 ? (
                <Link
                  to="/log"
                  className="flex items-center gap-4 rounded-[24px] border-2 border-dashed border-border bg-card p-5 transition hover:border-primary/40"
                >
                  <Cuca pose="rosto" decorative className="w-16" />
                  <div className="flex-1">
                    <p className="font-extrabold">Nenhuma refeição hoje</p>
                    <p className="mt-0.5 text-sm text-muted">Me conta o que você comeu e eu registro em 15 segundos.</p>
                  </div>
                  <span className="btn-3d grid size-11 shrink-0 place-items-center rounded-full bg-primary text-white">
                    <Plus className="size-5" strokeWidth={3} />
                  </span>
                </Link>
              ) : (
                <div className="space-y-3">
                  {meals.map((m) => (
                    <div key={m.id} className="flex gap-4">
                      <div className="flex flex-col items-center pt-2">
                        <div className="size-3 rounded-full bg-primary ring-4 ring-primary-soft" />
                        <div className="mt-1 w-0.5 flex-1 rounded-full bg-border" />
                      </div>
                      <div className="card-soft flex-1 rounded-2xl p-4">
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-sm font-extrabold">{m.category}</span>
                          <span className="font-mono text-[10px] uppercase tracking-widest text-muted">{m.when}</span>
                        </div>
                        <p className="text-sm leading-relaxed text-foreground">{m.description}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-bold tabular-nums">{m.kcal} kcal</span>
                          <span className="rounded-full bg-primary-soft px-2.5 py-1 text-[11px] font-bold text-primary tabular-nums">{m.protein}g prot</span>
                          <span className="rounded-full bg-carb-soft px-2.5 py-1 text-[11px] font-bold text-carb tabular-nums">{m.carbs}g carb</span>
                          <span className="rounded-full bg-fat-soft px-2.5 py-1 text-[11px] font-bold text-fat tabular-nums">{m.fat}g gord</span>
                          <span className="ml-auto font-mono text-[10px] uppercase tracking-widest text-muted">via {m.source}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Linha do tempo do dia */}
            <section className="animate-reveal [animation-delay:240ms]">
              <h2 className="mb-3 text-xl font-extrabold tracking-tight">Linha do tempo</h2>
              <DayTimeline events={timelineEvents} />
            </section>
          </div>

          {/* Coluna lateral */}
          <aside className="space-y-6">
            {/* Jornada com o Cuca piscando */}
            <Link
              to="/missoes"
              className="group relative block overflow-hidden rounded-[28px] bg-brand-deep p-6 text-white animate-reveal [animation-delay:100ms]"
            >
              <div className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-white/5" />
              <div className="relative flex items-end gap-2">
                <div className="flex-1 pb-2">
                  <p className="text-xl font-extrabold leading-snug">Disciplina também é amor próprio.</p>
                  <Squiggle className="mt-3 w-10 text-brand-leaf" />
                </div>
                <Cuca pose="piscando" className="-mb-6 -mr-3 w-28 shrink-0 transition group-hover:-translate-y-1" />
              </div>
              <span className="relative mt-4 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-extrabold text-brand-deep shadow-[0_3px_0_0_rgba(255,255,255,0.25)]">
                Ver minha jornada <ChevronRight className="size-4" />
              </span>
            </Link>

            {/* Seu progresso */}
            <section className="card-soft rounded-[28px] p-5 animate-reveal [animation-delay:140ms]">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-extrabold">Seu progresso</h2>
                <span className="rounded-full bg-primary-soft px-2.5 py-1 text-xs font-extrabold text-primary">Nível {level.level}</span>
              </div>
              <div className="mt-4 flex items-center gap-4">
                <ProgressRing value={score.score} max={100} size={96} stroke={10} trackColor="var(--secondary)">
                  <span className="text-2xl font-black tabular-nums text-brand-deep">{score.score}</span>
                </ProgressRing>
                <div className="flex-1">
                  <p className="text-sm font-extrabold">Índice do dia</p>
                  <p className="text-xs text-muted">{level.into}/{level.next} XP para o nível {level.level + 1}</p>
                  <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${level.pct * 100}%` }} />
                  </div>
                </div>
              </div>
              <div className="mt-5 space-y-3.5">
                {progressRows.map((r) => (
                  <div key={r.label} className="flex items-center gap-3">
                    <span className="grid size-8 place-items-center rounded-full bg-primary-soft text-primary">
                      <r.icon className="size-4" />
                    </span>
                    <div className="flex-1">
                      <div className="flex justify-between text-xs font-bold">
                        <span>{r.label}</span>
                        <span className="tabular-nums text-muted">{r.pct}%</span>
                      </div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-secondary">
                        <div className="h-full rounded-full bg-brand-leaf transition-all duration-700" style={{ width: `${r.pct}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Missões de hoje (prévia) */}
            <section className="card-soft rounded-[28px] p-5 animate-reveal [animation-delay:170ms]">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-extrabold">Missões de hoje</h2>
                <span className="text-xs font-bold tabular-nums text-muted">{pts.earned}/{pts.total} XP</span>
              </div>
              <ul className="mt-3 space-y-2">
                {missions.slice(0, 3).map((m) => (
                  <li key={m.id} className="flex items-center gap-3">
                    <span className={`grid size-7 shrink-0 place-items-center rounded-full ${m.done ? "bg-primary text-white" : "border-2 border-border text-transparent"}`}>
                      <Check className="size-4" strokeWidth={3} />
                    </span>
                    <span className={`flex-1 text-sm font-semibold ${m.done ? "text-muted line-through" : ""}`}>{m.title}</span>
                    <span className="text-[11px] font-extrabold text-carb">+{m.points}</span>
                  </li>
                ))}
              </ul>
              <Link to="/missoes" className="mt-4 flex items-center justify-center gap-1 rounded-xl bg-primary-soft py-2.5 text-sm font-extrabold text-primary">
                Ver todas <ChevronRight className="size-4" />
              </Link>
            </section>

            {/* Hidratação e peso */}
            <section className="grid grid-cols-2 gap-4 lg:grid-cols-1 animate-reveal [animation-delay:200ms]">
              <div className="card-soft rounded-[24px] p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-extrabold">Água</p>
                  <Droplet className="size-4 text-water" fill="currentColor" />
                </div>
                <div className="mt-2 flex items-end justify-between">
                  <p className="text-2xl font-black tabular-nums">
                    {(water / 1000).toFixed(1)}<span className="text-sm font-semibold">L</span>
                  </p>
                  <p className="text-xs text-muted">Meta {(targets.waterMl / 1000).toFixed(1)}L</p>
                </div>
                <div className="mt-3 flex gap-1">
                  {Array.from({ length: 8 }).map((_, i) => {
                    const glassMl = targets.waterMl / 8;
                    const filled = water >= glassMl * (i + 1);
                    return (
                      <div
                        key={i}
                        className="h-5 flex-1 rounded-md transition-colors"
                        style={{ background: filled ? "var(--water)" : "var(--water-soft)" }}
                      />
                    );
                  })}
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => handleAddWater(250)}
                    className="flex-1 rounded-xl bg-water-soft py-2 text-xs font-extrabold text-water hover:brightness-95"
                  >
                    +250ml
                  </button>
                  <button
                    onClick={() => handleAddWater(500)}
                    className="flex-1 rounded-xl bg-water-soft py-2 text-xs font-extrabold text-water hover:brightness-95"
                  >
                    +500ml
                  </button>
                </div>
              </div>

              <button
                onClick={() => setWeightModal(true)}
                className="card-soft rounded-[24px] p-5 text-left transition hover:border-primary/40"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-extrabold">Peso</p>
                  <Scale className="size-4 text-muted" />
                </div>
                <div className="mt-2 flex items-end justify-between">
                  <p className="text-2xl font-black tabular-nums">
                    {currentWeight.toFixed(1)}<span className="text-sm font-semibold"> kg</span>
                  </p>
                  {weekAgoWeight && weekAgoWeight !== currentWeight ? (
                    <p className={`text-xs font-bold ${currentWeight < weekAgoWeight ? "text-primary" : "text-fat"}`}>
                      {currentWeight < weekAgoWeight ? "↓" : "↑"} {Math.abs(currentWeight - weekAgoWeight).toFixed(1)}kg
                    </p>
                  ) : (
                    <p className="text-xs text-muted">Toque para atualizar</p>
                  )}
                </div>
                {targets.estimatedWeeks ? (
                  <p className="mt-4 text-xs text-muted">
                    <Flame className="mr-1 inline size-3 text-fat" />
                    ~{targets.estimatedWeeks} semanas para meta
                  </p>
                ) : (
                  <p className="mt-4 text-xs text-muted">Meta: {profile.goal === "maintain" ? "manter peso" : profile.goal === "track" ? "acompanhar" : ""}</p>
                )}
              </button>
            </section>

            {/* Atalhos IA */}
            <section className="grid grid-cols-2 gap-3 animate-reveal [animation-delay:230ms]">
              <Link to="/relatorio" className="card-soft btn-3d-soft flex items-center gap-2 rounded-2xl p-4 text-sm font-bold">
                <FileText className="size-4 text-primary" /> Relatório
              </Link>
              <Link to="/recap" className="card-soft btn-3d-soft flex items-center gap-2 rounded-2xl p-4 text-sm font-bold">
                <PlayCircle className="size-4 text-primary" /> Recap
              </Link>
            </section>

            {/* Card paisagem */}
            <section className="relative hidden h-44 overflow-hidden rounded-[28px] bg-[#e7efe1] p-5 lg:block">
              <p className="relative z-10 max-w-[10rem] text-base font-extrabold leading-snug text-brand-deep">
                Você já está fazendo mais do que imagina.
              </p>
              <Squiggle className="relative z-10 mt-2 w-10 text-brand-leaf" />
              <div className="absolute right-8 top-6 size-10 rounded-full bg-brand-sun" />
              <svg viewBox="0 0 320 120" className="absolute inset-x-0 bottom-0 w-full" aria-hidden="true">
                <path d="M0 80C60 40 110 50 170 70S260 60 320 40V120H0Z" fill="#a9cf8e" />
                <path d="M0 100C70 70 140 85 200 95S280 85 320 80V120H0Z" fill="#4f9a5d" />
              </svg>
            </section>
          </aside>
        </div>
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
                className="btn-3d flex-1 rounded-xl bg-primary py-3 text-sm font-extrabold text-white"
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
