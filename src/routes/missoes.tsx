import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Flame, Trophy, Zap, Check, Swords } from "lucide-react";
import { AppShell, TopBar } from "@/components/app-shell";
import { Cuca } from "@/components/brand";
import { loadProfile, calcTargets, type Profile, type Targets } from "@/lib/profile";
import {
  dailyMissions, missionPointsToday, syncXp, levelFromXp, achievements,
  getChallenge, startChallenge, abandonChallenge, challengeProgress,
  CHALLENGE_TEMPLATES, type Challenge,
} from "@/lib/gamification";

export const Route = createFileRoute("/missoes")({
  head: () => ({
    meta: [
      { title: "Missões e conquistas — ValeFit" },
      { name: "description", content: "Missões diárias, XP, conquistas desbloqueadas e o Modo Desafio de 7 a 30 dias para manter sua consistência nutricional." },
      { property: "og:title", content: "Missões e conquistas — ValeFit" },
      { property: "og:description", content: "Gamificação inteligente para transformar registro nutricional em hábito." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: MissoesPage,
});

function MissoesPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [xp, setXp] = useState(0);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [tick, setTick] = useState(0);

  const targets: Targets | null = useMemo(() => (profile ? calcTargets(profile) : null), [profile]);

  useEffect(() => {
    const p = loadProfile();
    setProfile(p);
    setChallenge(getChallenge());
  }, []);

  useEffect(() => {
    if (profile && targets) setXp(syncXp(profile, targets));
  }, [profile, targets, tick]);

  if (!profile || !targets) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-6 text-center">
        <div>
          <p className="text-sm font-semibold">Complete seu perfil para desbloquear as missões.</p>
          <Link to="/" className="mt-3 inline-flex rounded-xl bg-foreground px-4 py-2 text-sm font-semibold text-background">Começar</Link>
        </div>
      </div>
    );
  }

  const missions = dailyMissions(profile, targets);
  const pts = missionPointsToday(profile, targets);
  const level = levelFromXp(xp);
  const badges = achievements(profile, targets);
  const unlocked = badges.filter((b) => b.unlocked).length;
  const progress = challenge ? challengeProgress(challenge, profile, targets) : null;

  return (
    <AppShell>
      <TopBar
        title="Missões"
        right={
          <Link to="/dashboard" className="grid size-9 place-items-center rounded-xl border border-border text-muted">
            <ArrowLeft className="size-4" />
          </Link>
        }
      />

      <main className="mx-auto max-w-xl space-y-6 px-6 py-6">
        {/* nível */}
        <section className="relative overflow-hidden rounded-[28px] bg-brand-deep p-6 text-white animate-reveal">
          <div className="pointer-events-none absolute -right-12 -top-12 size-44 rounded-full bg-white/5" />
          <div className="relative flex items-end justify-between gap-3">
            <div className="pb-2">
              <p className="flex items-center gap-1.5 text-sm font-bold text-brand-lime">
                <Zap className="size-4" fill="currentColor" /> Nível
              </p>
              <p className="text-5xl font-black tracking-tight">{level.level}</p>
              <p className="mt-1 text-sm text-white/80">
                {pts.earned === pts.total && pts.total > 0 ? "Missões do dia completas! 🎉" : "Bora completar as missões de hoje?"}
              </p>
            </div>
            <Cuca pose="piscando" className="-mb-6 -mr-2 w-28 shrink-0" />
          </div>
          <div className="relative mt-4 h-3.5 overflow-hidden rounded-full bg-white/15">
            <div className="relative h-full rounded-full bg-brand-leaf transition-all duration-700" style={{ width: `${level.pct * 100}%` }}>
              <span className="absolute inset-x-2 top-[3px] h-1 rounded-full bg-white/35" />
            </div>
          </div>
          <p className="relative mt-2 text-xs text-white/75 tabular-nums">
            {level.into} / {level.next} XP para o nível {level.level + 1} · {xp} XP no total
          </p>
        </section>

        {/* missões */}
        <section className="animate-reveal [animation-delay:80ms]">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold tracking-tight">Missões de hoje</h2>
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted tabular-nums">
              {pts.earned}/{pts.total} pts
            </span>
          </div>
          <div className="space-y-2">
            {missions.map((m) => (
              <div
                key={m.id}
                className={`rounded-2xl border-2 p-4 transition ${m.done ? "border-primary/30 bg-primary-soft" : "border-border bg-card"}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`grid size-9 shrink-0 place-items-center rounded-full ${m.done ? "bg-primary text-primary-foreground" : "bg-carb-soft text-carb"}`}>
                    {m.done ? <Check className="size-4" strokeWidth={3} /> : <Flame className="size-3.5" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-baseline justify-between">
                      <p className="text-sm font-bold">{m.title}</p>
                      <span className="font-mono text-[10px] uppercase tracking-widest text-muted">+{m.points} xp</span>
                    </div>
                    <p className="text-xs text-muted">{m.hint}</p>
                  </div>
                </div>
                {!m.done && (
                  <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full rounded-full bg-brand-leaf" style={{ width: `${Math.round(m.progress * 100)}%` }} />
                  </div>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={() => setTick((t) => t + 1)}
            className="mt-3 w-full rounded-xl border border-border py-3 text-xs font-semibold text-muted"
          >
            Atualizar progresso
          </button>
        </section>

        {/* desafio */}
        <section className="animate-reveal [animation-delay:140ms]">
          <h2 className="mb-3 text-lg font-bold tracking-tight">Modo Desafio</h2>
          {challenge && progress ? (
            <div className="rounded-3xl border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Swords className="size-4 text-primary" />
                  <p className="text-sm font-bold">{challenge.title}</p>
                </div>
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted tabular-nums">
                  {progress.completed}/{challenge.days}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-10 gap-1.5">
                {progress.days.map((d) => (
                  <div
                    key={d.day}
                    title={d.day}
                    className="aspect-square rounded-md"
                    style={{ background: d.future ? "var(--secondary)" : d.ok ? "var(--primary)" : "var(--fat-soft)" }}
                  />
                ))}
              </div>
              <p className="mt-3 text-xs text-muted">
                Meta: manter o Índice de Consistência acima de {challenge.minScore} todos os dias.
              </p>
              <button
                onClick={() => { abandonChallenge(); setChallenge(null); }}
                className="mt-4 w-full rounded-xl border border-border py-2.5 text-xs font-semibold text-muted"
              >
                Abandonar desafio
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {CHALLENGE_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => { startChallenge(tpl); setChallenge(getChallenge()); }}
                  className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left transition hover:border-foreground/30"
                >
                  <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-sm font-extrabold tabular-nums">
                    {tpl.days}d
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold">{tpl.title}</p>
                    <p className="text-xs text-muted">{tpl.description}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* conquistas */}
        <section className="animate-reveal [animation-delay:200ms]">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold tracking-tight">Conquistas</h2>
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted tabular-nums">
              {unlocked}/{badges.length}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {badges.map((b) => (
              <div
                key={b.id}
                className={`rounded-2xl border p-4 text-center transition ${b.unlocked ? "border-primary/30 bg-primary-soft" : "border-border bg-card opacity-60"}`}
              >
                <span className="text-2xl">{b.unlocked ? b.emoji : "🔒"}</span>
                <p className="mt-2 text-xs font-bold leading-tight">{b.title}</p>
                <p className="mt-1 font-mono text-[9px] uppercase tracking-widest text-muted">{b.progressText}</p>
              </div>
            ))}
          </div>
        </section>

        <Link
          to="/compartilhar"
          className="flex items-center justify-center gap-2 rounded-2xl bg-foreground py-4 text-sm font-semibold text-background animate-reveal [animation-delay:260ms]"
        >
          <Trophy className="size-4" />
          Compartilhar minhas conquistas
        </Link>
      </main>
    </AppShell>
  );
}
