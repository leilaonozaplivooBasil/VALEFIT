import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { X, Play, Pause, Share2 } from "lucide-react";
import { loadProfile, calcTargets, type Profile, type Targets } from "@/lib/profile";
import { weekComparison } from "@/lib/score";
import { getStreak, getWeightLog } from "@/lib/meals";
import { weeklyStats, detectPatterns, projectResult } from "@/lib/insights";

export const Route = createFileRoute("/recap")({
  head: () => ({
    meta: [
      { title: "Seu recap da semana — ValeFit" },
      { name: "description", content: "Um resumo animado de 30 segundos com os números da sua semana: consistência, proteína, treinos e evolução de peso." },
      { property: "og:title", content: "Recap semanal — ValeFit" },
      { property: "og:description", content: "Sua semana em movimento, gerada automaticamente." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: RecapPage,
});

interface Slide {
  eyebrow: string;
  big: string;
  unit?: string;
  line: string;
  bg: string;
}

const SLIDE_MS = 4200;

function RecapPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => setProfile(loadProfile()), []);
  const targets: Targets | null = useMemo(() => (profile ? calcTargets(profile) : null), [profile]);

  const slides: Slide[] = useMemo(() => {
    if (!profile || !targets) return [];
    const stats = weeklyStats(profile, targets);
    const cmp = weekComparison(profile, targets);
    const streak = getStreak();
    const weights = getWeightLog();
    const current = weights[0]?.kg ?? profile.weightKg;
    const patterns = detectPatterns(profile, targets);
    const proj = projectResult(profile, targets);
    const first = profile.name.split(" ")[0];

    return [
      { eyebrow: "Sua semana", big: first, line: "Vamos ver o que os seus dados dizem.", bg: "linear-gradient(160deg,#0a0a0a,#122019)" },
      { eyebrow: "Dias registrados", big: `${stats.logged}`, unit: "/7", line: stats.logged >= 5 ? "Presença quase perfeita." : "Cada registro conta — dá para subir isso.", bg: "linear-gradient(160deg,#0a1a14,#0a0a0a)" },
      { eyebrow: "Índice de Consistência", big: `${stats.avgScore}`, unit: "/100", line: `${cmp.delta >= 0 ? "+" : ""}${cmp.delta} pontos em relação à semana passada.`, bg: "linear-gradient(160deg,#0a0a0a,#0d2a1e)" },
      { eyebrow: "Proteína média", big: `${stats.avgProtein}`, unit: "g/dia", line: `Sua meta é ${targets.protein}g por dia.`, bg: "linear-gradient(160deg,#101a2a,#0a0a0a)" },
      { eyebrow: "Treinos", big: `${stats.workouts}`, unit: stats.workouts === 1 ? "sessão" : "sessões", line: "Movimento sustenta o resto do plano.", bg: "linear-gradient(160deg,#2a1a0a,#0a0a0a)" },
      { eyebrow: "Peso", big: current.toFixed(1), unit: "kg", line: `${stats.weightDelta > 0 ? "+" : ""}${stats.weightDelta}kg nesta semana.`, bg: "linear-gradient(160deg,#0a0a0a,#141428)" },
      {
        eyebrow: patterns.length ? "O que a IA percebeu" : "Próximo passo",
        big: patterns.length ? patterns[0]!.emoji : "🎯",
        line: patterns.length ? patterns[0]!.text : "Registre mais alguns dias para eu encontrar seus padrões.",
        bg: "linear-gradient(160deg,#0a0a0a,#1c1230)",
      },
      {
        eyebrow: proj.possible ? "Sua meta chega em" : "Seu foco",
        big: proj.possible ? String(proj.weeksToGoal) : `${streak}`,
        unit: proj.possible ? "semanas" : "dias seguidos",
        line: proj.possible ? `Previsão: ${proj.targetDate}.` : "Manter é também uma conquista.",
        bg: "linear-gradient(160deg,#0d2a1e,#0a0a0a)",
      },
    ];
  }, [profile, targets]);

  useEffect(() => {
    if (!playing || !slides.length) return;
    const t = setTimeout(() => setI((v) => (v + 1 < slides.length ? v + 1 : v)), SLIDE_MS);
    return () => clearTimeout(t);
  }, [i, playing, slides.length]);

  if (!profile || !targets || !slides.length) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-6 text-center">
        <div>
          <p className="text-sm font-semibold">Complete seu perfil para gerar seu recap.</p>
          <Link to="/" className="mt-3 inline-flex rounded-xl bg-foreground px-4 py-2 text-sm font-semibold text-background">Começar</Link>
        </div>
      </div>
    );
  }

  const s = slides[i]!;
  const last = i === slides.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex flex-col text-white" style={{ background: s.bg, transition: "background 700ms ease" }}>
      {/* barras de progresso */}
      <div className="flex gap-1 px-4 pt-4">
        {slides.map((_, idx) => (
          <div key={idx} className="h-1 flex-1 overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full bg-white"
              style={{
                width: idx < i ? "100%" : idx === i ? "100%" : "0%",
                transition: idx === i && playing ? `width ${SLIDE_MS}ms linear` : "none",
                animation: idx === i && playing ? "none" : undefined,
              }}
            />
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between px-5 py-3">
        <span className="font-mono text-[10px] uppercase tracking-widest opacity-60">Recap semanal · ValeFit</span>
        <Link to="/dashboard" className="grid size-8 place-items-center rounded-lg bg-white/10" aria-label="Fechar">
          <X className="size-4" />
        </Link>
      </div>

      <button
        onClick={() => (last ? setI(0) : setI((v) => Math.min(v + 1, slides.length - 1)))}
        className="flex flex-1 flex-col justify-center px-8 text-left"
      >
        <p key={`e-${i}`} className="animate-reveal font-mono text-[11px] uppercase tracking-widest opacity-70">{s.eyebrow}</p>
        <p key={`b-${i}`} className="animate-reveal text-[clamp(3rem,18vw,6rem)] font-extrabold leading-none tracking-tighter [animation-delay:80ms]">
          {s.big}
          {s.unit && <span className="ml-2 text-[clamp(1rem,5vw,1.75rem)] font-semibold opacity-60">{s.unit}</span>}
        </p>
        <p key={`l-${i}`} className="animate-reveal mt-5 max-w-sm text-base leading-relaxed opacity-80 [animation-delay:160ms]">{s.line}</p>
      </button>

      <div className="flex items-center gap-2 px-6 pb-10">
        <button
          onClick={() => setPlaying((p) => !p)}
          className="grid size-12 place-items-center rounded-2xl bg-white/10"
          aria-label={playing ? "Pausar" : "Reproduzir"}
        >
          {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
        </button>
        <Link
          to="/compartilhar"
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-white py-3.5 text-sm font-bold text-[#0a0a0a]"
        >
          <Share2 className="size-4" />
          Compartilhar minha semana
        </Link>
      </div>
    </div>
  );
}
