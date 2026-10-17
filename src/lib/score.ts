// Índice de Consistência — indicador proprietário do ValeFit (0–100).
// Combina alimentação, proteína, hidratação, treino, registro diário e sono.

import type { Targets, Profile } from "./profile";
import { dayTotals, dayKey, lastDays, hasAnyData } from "./tracking";

export interface ScorePart {
  key: "food" | "protein" | "water" | "workout" | "log" | "sleep";
  label: string;
  pct: number; // 0–100
  weight: number;
  detail: string;
}

export interface DayScore {
  day: string;
  score: number;
  parts: ScorePart[];
  hasData: boolean;
}

function clampPct(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

/** Proximidade da meta: 100 no alvo, cai conforme se afasta (sub ou sobre). */
function closeness(value: number, target: number, tolerance = 0.15): number {
  if (target <= 0) return 0;
  const ratio = value / target;
  if (ratio >= 1 - tolerance && ratio <= 1 + tolerance) return 100;
  if (ratio < 1 - tolerance) return clampPct((ratio / (1 - tolerance)) * 100);
  return clampPct(100 - (ratio - (1 + tolerance)) * 140);
}

const WEEKLY_WORKOUT_DEFAULT = 4;

export function dayScore(day: string, profile: Profile, targets: Targets): DayScore {
  const t = dayTotals(day);
  const weeklyWorkouts = profile.activity?.timesPerWeek ?? WEEKLY_WORKOUT_DEFAULT;
  const minutesTarget = profile.activity?.minutesPerSession ?? 45;
  // dias de treino esperados na semana → meta diária proporcional
  const expectDaily = Math.min(1, weeklyWorkouts / 7) * minutesTarget;

  const parts: ScorePart[] = [
    {
      key: "food",
      label: "Alimentação",
      weight: 0.3,
      pct: closeness(t.kcal, targets.calories),
      detail: `${t.kcal} / ${targets.calories} kcal`,
    },
    {
      key: "protein",
      label: "Proteína",
      weight: 0.2,
      pct: clampPct((t.protein / Math.max(1, targets.protein)) * 100),
      detail: `${t.protein} / ${targets.protein} g`,
    },
    {
      key: "water",
      label: "Água",
      weight: 0.18,
      pct: clampPct((t.waterMl / Math.max(1, targets.waterMl)) * 100),
      detail: `${(t.waterMl / 1000).toFixed(1)} / ${(targets.waterMl / 1000).toFixed(1)} L`,
    },
    {
      key: "workout",
      label: "Treino",
      weight: 0.14,
      pct: expectDaily <= 0 ? 100 : clampPct((t.workoutMinutes / expectDaily) * 100),
      detail: t.workoutMinutes > 0 ? `${t.workoutMinutes} min` : "sem treino",
    },
    {
      key: "log",
      label: "Registro diário",
      weight: 0.12,
      pct: clampPct((t.meals / 3) * 100),
      detail: `${t.meals} refeiç${t.meals === 1 ? "ão" : "ões"}`,
    },
    {
      key: "sleep",
      label: "Sono",
      weight: 0.06,
      pct: t.sleepHours === null ? 0 : closeness(t.sleepHours, 8, 0.12),
      detail: t.sleepHours === null ? "não registrado" : `${t.sleepHours}h`,
    },
  ];

  const score = Math.round(parts.reduce((a, p) => a + p.pct * p.weight, 0));
  return { day, score, parts, hasData: hasAnyData(day) };
}

export function todayScore(profile: Profile, targets: Targets): DayScore {
  return dayScore(dayKey(), profile, targets);
}

export function scoreSeries(days: number, profile: Profile, targets: Targets): DayScore[] {
  return lastDays(days).map((d) => dayScore(d, profile, targets));
}

export function averageScore(series: DayScore[], onlyWithData = true): number {
  const rows = onlyWithData ? series.filter((s) => s.hasData) : series;
  if (!rows.length) return 0;
  return Math.round(rows.reduce((a, s) => a + s.score, 0) / rows.length);
}

export function scoreLabel(score: number): { label: string; tone: "high" | "mid" | "low" } {
  if (score >= 85) return { label: "Excelente", tone: "high" };
  if (score >= 70) return { label: "Bom ritmo", tone: "high" };
  if (score >= 50) return { label: "Dá pra melhorar", tone: "mid" };
  return { label: "Vamos retomar", tone: "low" };
}

/** Comparativo semana atual x semana anterior. */
export function weekComparison(profile: Profile, targets: Targets) {
  const all = scoreSeries(14, profile, targets);
  const prev = all.slice(0, 7);
  const cur = all.slice(7);
  const prevAvg = averageScore(prev);
  const curAvg = averageScore(cur);
  return { prevAvg, curAvg, delta: curAvg - prevAvg, current: cur, previous: prev };
}
