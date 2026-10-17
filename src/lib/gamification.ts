// Missões diárias, XP, conquistas e modo desafio.

import type { Profile, Targets } from "./profile";
import { dayTotals, dayKey, lastDays, hasAnyData } from "./tracking";
import { dayScore, scoreSeries } from "./score";
import { getWeightLog, getStreak } from "./meals";

const XP_KEY = "nutriia:xp:v1";
const CHALLENGE_KEY = "nutriia:challenge:v1";
const CLAIMED_KEY = "nutriia:missions-claimed:v1";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, v: unknown) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(v));
}

/* ------------------------- missões ------------------------- */

export interface Mission {
  id: string;
  title: string;
  hint: string;
  points: number;
  progress: number; // 0–1
  done: boolean;
}

export function dailyMissions(profile: Profile, targets: Targets): Mission[] {
  const t = dayTotals(dayKey());
  const trainDays = profile.activity?.timesPerWeek ?? 0;

  const missions: Mission[] = [
    {
      id: "water",
      title: "Beber toda a água",
      hint: `${(t.waterMl / 1000).toFixed(1)}L de ${(targets.waterMl / 1000).toFixed(1)}L`,
      points: 25,
      progress: Math.min(1, t.waterMl / Math.max(1, targets.waterMl)),
      done: t.waterMl >= targets.waterMl,
    },
    {
      id: "protein",
      title: "Bater a proteína",
      hint: `${t.protein}g de ${targets.protein}g`,
      points: 30,
      progress: Math.min(1, t.protein / Math.max(1, targets.protein)),
      done: t.protein >= targets.protein,
    },
    {
      id: "meals",
      title: "Registrar 3 refeições",
      hint: `${t.meals} de 3`,
      points: 25,
      progress: Math.min(1, t.meals / 3),
      done: t.meals >= 3,
    },
    {
      id: "kcal",
      title: "Ficar dentro das calorias",
      hint: `${t.kcal} de ${targets.calories} kcal`,
      points: 30,
      progress: Math.min(1, t.kcal / Math.max(1, targets.calories)),
      done: t.kcal > 0 && t.kcal <= targets.calories * 1.05,
    },
    {
      id: "sleep",
      title: "Registrar o sono",
      hint: t.sleepHours === null ? "ainda não registrado" : `${t.sleepHours}h dormidas`,
      points: 15,
      progress: t.sleepHours === null ? 0 : 1,
      done: t.sleepHours !== null,
    },
  ];

  if (trainDays > 0) {
    missions.splice(3, 0, {
      id: "workout",
      title: "Treinar hoje",
      hint: t.workoutMinutes > 0 ? `${t.workoutMinutes} min registrados` : "nenhum treino ainda",
      points: 30,
      progress: t.workoutMinutes > 0 ? 1 : 0,
      done: t.workoutMinutes > 0,
    });
  }

  return missions;
}

export function missionPointsToday(profile: Profile, targets: Targets): { earned: number; total: number } {
  const ms = dailyMissions(profile, targets);
  return {
    earned: ms.filter((m) => m.done).reduce((a, m) => a + m.points, 0),
    total: ms.reduce((a, m) => a + m.points, 0),
  };
}

/* ------------------------- XP ------------------------- */

export function getXp(): number {
  return read<number>(XP_KEY, 0);
}

/** Credita os pontos das missões concluídas hoje (uma vez por missão/dia). */
export function syncXp(profile: Profile, targets: Targets): number {
  const claimed = read<Record<string, string[]>>(CLAIMED_KEY, {});
  const day = dayKey();
  const already = claimed[day] ?? [];
  const done = dailyMissions(profile, targets).filter((m) => m.done);
  const fresh = done.filter((m) => !already.includes(m.id));
  if (fresh.length) {
    claimed[day] = [...already, ...fresh.map((m) => m.id)];
    write(CLAIMED_KEY, claimed);
    write(XP_KEY, getXp() + fresh.reduce((a, m) => a + m.points, 0));
  }
  return getXp();
}

export function levelFromXp(xp: number) {
  const level = Math.floor(xp / 500) + 1;
  const into = xp % 500;
  return { level, into, next: 500, pct: into / 500 };
}

/* ------------------------- conquistas ------------------------- */

export interface Achievement {
  id: string;
  title: string;
  description: string;
  emoji: string;
  unlocked: boolean;
  progressText: string;
}

export function achievements(profile: Profile, targets: Targets): Achievement[] {
  const streak = getStreak();
  const weights = getWeightLog();
  const first = weights[weights.length - 1]?.kg ?? profile.weightKg;
  const current = weights[0]?.kg ?? profile.weightKg;
  const lost = Math.max(0, first - current);
  const t = dayTotals(dayKey());
  const series = scoreSeries(7, profile, targets);
  const perfectWeek = series.length === 7 && series.every((s) => s.hasData && s.score >= 85);
  const activeDays = lastDays(365).filter((d) => hasAnyData(d)).length;
  const goalReached =
    profile.targetDeltaKg && profile.goal === "lose" ? lost >= profile.targetDeltaKg : false;

  const list: Achievement[] = [
    { id: "first-kg", title: "Primeiro kg", description: "Você perdeu seu primeiro quilo.", emoji: "🥇", unlocked: lost >= 1, progressText: `${lost.toFixed(1)} kg` },
    { id: "7d", title: "Primeiros 7 dias", description: "Uma semana registrando.", emoji: "🌱", unlocked: streak >= 7, progressText: `${Math.min(streak, 7)}/7 dias` },
    { id: "30d", title: "30 dias seguidos", description: "Consistência de verdade.", emoji: "🔥", unlocked: streak >= 30, progressText: `${Math.min(streak, 30)}/30 dias` },
    { id: "100d", title: "100 dias", description: "Isso já virou hábito.", emoji: "💎", unlocked: streak >= 100, progressText: `${Math.min(streak, 100)}/100 dias` },
    { id: "water", title: "100% de água", description: "Meta de hidratação batida no dia.", emoji: "💧", unlocked: t.waterMl >= targets.waterMl, progressText: `${Math.round((t.waterMl / Math.max(1, targets.waterMl)) * 100)}%` },
    { id: "protein", title: "100% de proteína", description: "Meta de proteína batida no dia.", emoji: "🥩", unlocked: t.protein >= targets.protein, progressText: `${Math.round((t.protein / Math.max(1, targets.protein)) * 100)}%` },
    { id: "perfect-week", title: "Semana perfeita", description: "7 dias com índice acima de 85.", emoji: "⭐️", unlocked: perfectWeek, progressText: `${series.filter((s) => s.score >= 85).length}/7 dias` },
    { id: "active", title: "Presença total", description: "30 dias com algum registro.", emoji: "📅", unlocked: activeDays >= 30, progressText: `${Math.min(activeDays, 30)}/30 dias` },
    { id: "goal", title: "Meta atingida", description: "Você chegou ao seu objetivo.", emoji: "🏁", unlocked: !!goalReached, progressText: profile.targetDeltaKg ? `${lost.toFixed(1)}/${profile.targetDeltaKg} kg` : "—" },
  ];
  return list;
}

/* ------------------------- desafios ------------------------- */

export interface Challenge {
  id: string;
  title: string;
  days: number;
  startedAt: string; // dayKey
  minScore: number;
}

export const CHALLENGE_TEMPLATES = [
  { id: "c7", title: "7 dias de consistência", days: 7, minScore: 70, description: "Índice acima de 70 por 7 dias." },
  { id: "c14", title: "14 dias de proteína", days: 14, minScore: 75, description: "Duas semanas mantendo o índice acima de 75." },
  { id: "c21", title: "21 dias de hábito", days: 21, minScore: 75, description: "O tempo médio para um hábito se formar." },
  { id: "c30", title: "30 dias sem falhar", days: 30, minScore: 80, description: "O desafio definitivo de aderência." },
];

export function getChallenge(): Challenge | null {
  return read<Challenge | null>(CHALLENGE_KEY, null);
}

export function startChallenge(tpl: (typeof CHALLENGE_TEMPLATES)[number]) {
  write(CHALLENGE_KEY, { id: tpl.id, title: tpl.title, days: tpl.days, minScore: tpl.minScore, startedAt: dayKey() });
}

export function abandonChallenge() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(CHALLENGE_KEY);
}

export function challengeProgress(ch: Challenge, profile: Profile, targets: Targets) {
  const start = new Date(`${ch.startedAt}T00:00:00`);
  const days: { day: string; ok: boolean; future: boolean }[] = [];
  for (let i = 0; i < ch.days; i++) {
    const d = new Date(start.getTime() + i * 86400000);
    const key = dayKey(d);
    const future = d.getTime() > Date.now();
    days.push({ day: key, ok: !future && dayScore(key, profile, targets).score >= ch.minScore, future });
  }
  const completed = days.filter((d) => d.ok).length;
  return { days, completed, pct: completed / ch.days, finished: days.every((d) => !d.future) };
}
