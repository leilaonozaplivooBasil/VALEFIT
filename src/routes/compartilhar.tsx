import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Download, Share2 } from "lucide-react";
import { AppShell, TopBar } from "@/components/app-shell";
import { loadProfile, calcTargets, type Profile, type Targets } from "@/lib/profile";
import { todayScore, weekComparison } from "@/lib/score";
import { getStreak, getWeightLog } from "@/lib/meals";
import { weeklyStats, projectResult } from "@/lib/insights";
import { achievements, levelFromXp, getXp } from "@/lib/gamification";
import { downloadCard, shareCard, type CardData } from "@/lib/share-card";

export const Route = createFileRoute("/compartilhar")({
  head: () => ({
    meta: [
      { title: "Compartilhar progresso — ValeFit" },
      { name: "description", content: "Gere cards de progresso prontos para stories: Índice de Consistência, sequência de dias, evolução de peso e conquistas." },
      { property: "og:title", content: "Compartilhar progresso — ValeFit" },
      { property: "og:description", content: "Cards de progresso gerados automaticamente pela sua evolução." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: CompartilharPage,
});

const ACCENT = "#0b9e6a";

function CardPreview({ data }: { data: CardData }) {
  return (
    <div className="relative aspect-[9/16] w-full overflow-hidden rounded-3xl bg-[#0a0a0a] p-6 text-white">
      <div
        className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full blur-3xl"
        style={{ background: `${data.accent}55` }}
      />
      <p className="relative font-mono text-[10px] uppercase tracking-widest opacity-60">ValeFit</p>
      <p className="relative mt-6 font-mono text-[10px] font-bold uppercase tracking-widest" style={{ color: data.accent }}>
        {data.eyebrow}
      </p>
      <p className="relative mt-2 text-6xl font-extrabold tracking-tighter">
        {data.headline}
        {data.unit && <span className="ml-1 text-xl font-semibold opacity-60">{data.unit}</span>}
      </p>
      <p className="relative mt-3 text-xs leading-relaxed opacity-70">{data.caption}</p>
      <div className="relative mt-6 space-y-2">
        {data.stats.map((s) => (
          <div key={s.label} className="rounded-2xl bg-white/10 px-4 py-3">
            <p className="text-[9px] uppercase tracking-widest opacity-60">{s.label}</p>
            <p className="text-lg font-extrabold tabular-nums">{s.value}</p>
          </div>
        ))}
      </div>
      <p className="absolute bottom-5 left-6 text-[10px] opacity-45">Acompanhamento nutricional com IA</p>
    </div>
  );
}

function CompartilharPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => setProfile(loadProfile()), []);
  const targets: Targets | null = useMemo(() => (profile ? calcTargets(profile) : null), [profile]);

  const cards: CardData[] = useMemo(() => {
    if (!profile || !targets) return [];
    const score = todayScore(profile, targets);
    const cmp = weekComparison(profile, targets);
    const stats = weeklyStats(profile, targets);
    const streak = getStreak();
    const weights = getWeightLog();
    const first = weights[weights.length - 1]?.kg ?? profile.weightKg;
    const current = weights[0]?.kg ?? profile.weightKg;
    const delta = Number((first - current).toFixed(1));
    const proj = projectResult(profile, targets);
    const badges = achievements(profile, targets).filter((b) => b.unlocked);
    const level = levelFromXp(getXp());

    return [
      {
        kind: "consistencia",
        eyebrow: "Índice de Consistência",
        headline: String(score.score),
        unit: "/100",
        caption: "Meu indicador de aderência hoje: alimentação, proteína, água, treino e sono em um número só.",
        ring: score.score,
        accent: ACCENT,
        stats: [
          { label: "Média da semana", value: String(cmp.curAvg) },
          { label: "Dias registrados", value: `${stats.logged}/7` },
          { label: "Sequência", value: `${streak} dias` },
        ],
      },
      {
        kind: "sequencia",
        eyebrow: "Sequência",
        headline: String(streak),
        unit: streak === 1 ? "dia" : "dias",
        caption: "Consistência não é motivação — é registro diário. Estou construindo o hábito.",
        accent: "#e07b2a",
        stats: [
          { label: "Índice médio", value: String(stats.avgScore) },
          { label: "Treinos na semana", value: String(stats.workouts) },
          { label: "Proteína média", value: `${stats.avgProtein}g` },
        ],
      },
      {
        kind: "evolucao",
        eyebrow: profile.goal === "gain" ? "Massa ganha" : "Peso eliminado",
        headline: `${Math.abs(delta).toFixed(1)}`,
        unit: "kg",
        caption: proj.possible
          ? `No ritmo atual, chego à minha meta em ${proj.targetDate}.`
          : "Mantendo meu peso com consistência e dados reais.",
        ring: proj.probability,
        accent: "#1f7ae0",
        stats: [
          { label: "Peso atual", value: `${current.toFixed(1)} kg` },
          { label: "Variação na semana", value: `${stats.weightDelta > 0 ? "+" : ""}${stats.weightDelta} kg` },
          { label: "Probabilidade de meta", value: `${proj.probability}%` },
        ],
      },
      {
        kind: "conquistas",
        eyebrow: "Conquistas",
        headline: String(badges.length),
        unit: "desbloqueadas",
        caption: badges.length
          ? `Últimas: ${badges.slice(-2).map((b) => b.title).join(" · ")}`
          : "Começando agora — a primeira conquista está logo ali.",
        accent: "#8a5cf6",
        stats: [
          { label: "Nível", value: String(level.level) },
          { label: "XP total", value: String(getXp()) },
          { label: "Índice de hoje", value: String(score.score) },
        ],
      },
    ];
  }, [profile, targets]);

  if (!profile || !targets || !cards.length) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-6 text-center">
        <div>
          <p className="text-sm font-semibold">Complete seu perfil para gerar seus cards.</p>
          <Link to="/" className="mt-3 inline-flex rounded-xl bg-foreground px-4 py-2 text-sm font-semibold text-background">Começar</Link>
        </div>
      </div>
    );
  }

  const card = cards[index]!;

  return (
    <AppShell>
      <TopBar
        title="Compartilhar"
        right={
          <Link to="/dashboard" className="grid size-9 place-items-center rounded-xl border border-border text-muted">
            <ArrowLeft className="size-4" />
          </Link>
        }
      />

      <main className="mx-auto max-w-md space-y-5 px-6 py-6">
        <section className="animate-reveal">
          <p className="font-mono text-[11px] uppercase tracking-widest text-muted">Pronto para stories</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight">Mostre sua evolução.</h1>
        </section>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {cards.map((c, i) => (
            <button
              key={c.kind}
              onClick={() => setIndex(i)}
              className={`shrink-0 rounded-xl px-3 py-2 text-xs font-semibold capitalize transition ${
                i === index ? "bg-foreground text-background" : "border border-border text-muted"
              }`}
            >
              {c.kind}
            </button>
          ))}
        </div>

        <div className="animate-reveal [animation-delay:80ms]">
          <CardPreview data={card} />
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => void downloadCard(card)}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-border py-4 text-sm font-semibold"
          >
            <Download className="size-4" />
            Baixar PNG
          </button>
          <button
            onClick={() => void shareCard(card, `${card.eyebrow}: ${card.headline}${card.unit ?? ""} — ValeFit`)}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-foreground py-4 text-sm font-semibold text-background"
          >
            <Share2 className="size-4" />
            Compartilhar
          </button>
        </div>

        <p className="text-center text-[11px] text-muted">
          A imagem é gerada no seu aparelho, em 1080×1920.
        </p>
      </main>
    </AppShell>
  );
}
