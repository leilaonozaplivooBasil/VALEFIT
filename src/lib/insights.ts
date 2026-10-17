// Timeline do dia, IA proativa, detecção de padrões, previsão de resultados
// e memória de hábitos alimentares. Tudo derivado do histórico local.

import type { Profile, Targets } from "./profile";
import {
  dayKey, lastDays, dayTotals, getMeals, getWaterEvents, getWorkouts, getSleep,
  hasAnyData, getMealsByDay,
} from "./tracking";
import { dayScore, averageScore, scoreSeries } from "./score";
import { getWeightLog } from "./meals";

/* ------------------------- timeline ------------------------- */

export interface TimelineEvent {
  at: number;
  time: string;
  kind: "meal" | "water" | "workout" | "sleep" | "alert" | "win";
  title: string;
  detail?: string;
}

function hhmm(ts: number) {
  return new Date(ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function todayTimeline(profile: Profile, targets: Targets): TimelineEvent[] {
  const day = dayKey();
  const events: TimelineEvent[] = [];

  for (const m of getMeals(day)) {
    events.push({
      at: m.createdAt,
      time: m.when,
      kind: "meal",
      title: `${m.category} registrado`,
      detail: `${m.description} · ${m.kcal} kcal · ${m.protein}g prot`,
    });
  }

  const waterEvents = getWaterEvents(day);
  for (const w of waterEvents) {
    events.push({ at: w.at, time: hhmm(w.at), kind: "water", title: `Água +${w.ml}ml` });
  }

  for (const w of getWorkouts(day)) {
    events.push({ at: w.at, time: hhmm(w.at), kind: "workout", title: `Treino: ${w.type}`, detail: `${w.minutes} min · ${w.intensity}` });
  }

  const sleep = getSleep(day);
  if (sleep) events.push({ at: sleep.at, time: hhmm(sleep.at), kind: "sleep", title: `Sono registrado`, detail: `${sleep.hours}h` });

  // marcos calculados
  const t = dayTotals(day);
  if (t.waterMl >= targets.waterMl && waterEvents.length) {
    const last = waterEvents[waterEvents.length - 1]!;
    events.push({ at: last.at + 1, time: hhmm(last.at), kind: "win", title: "Meta de água atingida 💧" });
  }
  if (t.kcal >= targets.calories * 0.95 && t.kcal <= targets.calories * 1.05) {
    events.push({ at: Date.now(), time: "agora", kind: "win", title: "Meta de calorias atingida 🔥" });
  }
  const hour = new Date().getHours();
  if (hour >= 15 && t.protein < targets.protein * 0.5) {
    events.push({ at: new Date().setHours(15, 0, 0, 0), time: "15:00", kind: "alert", title: "Baixa ingestão de proteína", detail: `${t.protein}g de ${targets.protein}g até agora` });
  }
  if (hour >= 21 && t.meals === 0) {
    events.push({ at: new Date().setHours(21, 0, 0, 0), time: "21:00", kind: "alert", title: "Nenhuma refeição registrada hoje" });
  }

  return events.sort((a, b) => a.at - b.at);
}

/* ------------------------- IA proativa ------------------------- */

export interface Nudge {
  id: string;
  tone: "info" | "warn" | "win";
  title: string;
  body: string;
  cta?: { label: string; to: "/log" | "/chat" | "/missoes" | "/relatorio" | "/dashboard" };
}

/** Horário habitual (média) de uma categoria de refeição nos últimos 21 dias. */
function habitualHour(category: string): number | null {
  const all = getMealsByDay();
  const hours: number[] = [];
  for (const day of lastDays(21)) {
    for (const m of all[day] ?? []) {
      if (m.category === category) {
        const h = Number(m.when.split(":")[0]);
        if (!Number.isNaN(h)) hours.push(h);
      }
    }
  }
  if (hours.length < 3) return null;
  return Math.round(hours.reduce((a, h) => a + h, 0) / hours.length);
}

export function proactiveNudges(profile: Profile, targets: Targets): Nudge[] {
  const day = dayKey();
  const t = dayTotals(day);
  const now = new Date();
  const hour = now.getHours();
  const nudges: Nudge[] = [];
  const firstName = profile.name.split(" ")[0];

  // refeição habitual não registrada
  for (const cat of ["Café da manhã", "Almoço", "Jantar"]) {
    const h = habitualHour(cat);
    if (h !== null && hour >= h && hour <= h + 3) {
      const logged = getMeals(day).some((m) => m.category === cat);
      if (!logged) {
        nudges.push({
          id: `habit-${cat}`,
          tone: "warn",
          title: `${firstName}, você costuma comer por volta das ${String(h).padStart(2, "0")}:00`,
          body: `Ainda não vi seu ${cat.toLowerCase()} de hoje. Leva 15 segundos para registrar.`,
          cta: { label: "Registrar agora", to: "/log" },
        });
        break;
      }
    }
  }

  // água
  const waterLeft = targets.waterMl - t.waterMl;
  if (waterLeft > 0 && waterLeft <= 500) {
    nudges.push({ id: "water-close", tone: "info", title: `Faltam ${waterLeft}ml de água`, body: "Um copo e você fecha a hidratação do dia.", cta: { label: "Ver meu dia", to: "/dashboard" } });
  } else if (waterLeft <= 0 && t.waterMl > 0) {
    nudges.push({ id: "water-done", tone: "win", title: "Meta de água atingida 💧", body: `Você bebeu ${(t.waterMl / 1000).toFixed(1)}L hoje. Isso sustenta seu Índice de Consistência.` });
  } else if (hour >= 14 && t.waterMl < targets.waterMl * 0.4) {
    nudges.push({ id: "water-low", tone: "warn", title: "Hidratação atrasada", body: `Você está em ${(t.waterMl / 1000).toFixed(1)}L de ${(targets.waterMl / 1000).toFixed(1)}L. Dá para recuperar até a noite.` });
  }

  // proteína comparada à média
  const avgProtein = (() => {
    const days = lastDays(8).slice(0, 7).filter((d) => hasAnyData(d));
    if (!days.length) return null;
    return days.reduce((a, d) => a + dayTotals(d).protein, 0) / days.length;
  })();
  if (avgProtein && hour >= 16 && t.protein < avgProtein * 0.7) {
    nudges.push({
      id: "protein-low",
      tone: "warn",
      title: "Sua proteína está abaixo do normal",
      body: `Hoje: ${t.protein}g. Sua média recente: ${Math.round(avgProtein)}g. Um lanche proteico resolve.`,
      cta: { label: "Perguntar ao Coach", to: "/chat" },
    });
  }

  // calorias restantes
  const kcalLeft = targets.calories - t.kcal;
  if (t.kcal > 0 && kcalLeft > 0 && kcalLeft <= 300) {
    nudges.push({ id: "kcal-close", tone: "info", title: `Faltam ${kcalLeft} kcal para sua meta`, body: "Espaço suficiente para um jantar leve e proteico." });
  }
  if (kcalLeft < -150) {
    nudges.push({ id: "kcal-over", tone: "warn", title: `Você passou ${Math.abs(kcalLeft)} kcal da meta`, body: "Sem drama: um dia não define a semana. Amanhã compensamos com mais proteína e movimento." });
  }

  const score = dayScore(day, profile, targets).score;
  if (score >= 90) nudges.push({ id: "score-high", tone: "win", title: `Índice de Consistência em ${score}`, body: "Dia praticamente perfeito. É assim que a meta chega antes." });

  return nudges.slice(0, 4);
}

/* ------------------------- padrões ------------------------- */

export interface Pattern {
  id: string;
  emoji: string;
  text: string;
}

export function detectPatterns(profile: Profile, targets: Targets): Pattern[] {
  const days = lastDays(28).filter((d) => hasAnyData(d));
  const out: Pattern[] = [];
  if (days.length < 4) return out;

  const rows = days.map((d) => ({ d, t: dayTotals(d), dow: new Date(`${d}T12:00:00`).getDay() }));

  // fim de semana x semana
  const wk = rows.filter((r) => r.dow === 0 || r.dow === 6);
  const wd = rows.filter((r) => r.dow > 0 && r.dow < 6);
  if (wk.length >= 2 && wd.length >= 3) {
    const a = wk.reduce((s, r) => s + r.t.kcal, 0) / wk.length;
    const b = wd.reduce((s, r) => s + r.t.kcal, 0) / wd.length;
    if (a > b * 1.12) out.push({ id: "weekend", emoji: "📈", text: `Você consome cerca de ${Math.round(((a - b) / b) * 100)}% mais calorias aos finais de semana.` });
    else if (b > a * 1.12) out.push({ id: "weekday", emoji: "📉", text: "Seus finais de semana são mais controlados que os dias úteis — incomum e ótimo." });
  }

  // treino x consistência
  const withW = rows.filter((r) => r.t.workoutMinutes > 0);
  if (withW.length >= 2 && withW.length < rows.length) {
    const sa = averageScore(withW.map((r) => dayScore(r.d, profile, targets)));
    const sb = averageScore(rows.filter((r) => r.t.workoutMinutes === 0).map((r) => dayScore(r.d, profile, targets)));
    if (sa > sb + 5) out.push({ id: "train", emoji: "🏋️", text: `Nos dias em que você treina, seu Índice de Consistência é ${sa - sb} pontos maior.` });
  }

  // café da manhã com pouca proteína
  const bfs = days.flatMap((d) => getMeals(d).filter((m) => m.category === "Café da manhã"));
  if (bfs.length >= 3) {
    const avg = bfs.reduce((a, m) => a + m.protein, 0) / bfs.length;
    if (avg < targets.protein * 0.18) out.push({ id: "breakfast", emoji: "🍳", text: `Seu café da manhã tem em média só ${Math.round(avg)}g de proteína — puxar para ${Math.round(targets.protein * 0.25)}g ajuda a controlar a fome à tarde.` });
  }

  // registros após 21h
  const lateDays = days.filter((d) => getMeals(d).some((m) => Number(m.when.split(":")[0]) >= 21));
  if (lateDays.length >= 3) {
    const lateAvg = lateDays.reduce((a, d) => a + dayTotals(d).kcal, 0) / lateDays.length;
    const restDays = days.filter((d) => !lateDays.includes(d));
    if (restDays.length) {
      const restAvg = restDays.reduce((a, d) => a + dayTotals(d).kcal, 0) / restDays.length;
      if (lateAvg > restAvg * 1.1) out.push({ id: "late", emoji: "🌙", text: "Nos dias em que você come depois das 21h, seu total calórico costuma estourar a meta." });
    }
  }

  // hidratação x dias de menor registro
  const lowWater = rows.filter((r) => r.t.waterMl < targets.waterMl * 0.6);
  if (lowWater.length >= 3) out.push({ id: "water-pattern", emoji: "💧", text: `Em ${lowWater.length} dos últimos ${rows.length} dias você ficou abaixo de 60% da meta de água. É seu ponto mais frágil.` });

  return out.slice(0, 5);
}

/* ------------------------- previsão ------------------------- */

export interface Projection {
  possible: boolean;
  currentScore: number;
  weeksToGoal: number | null;
  targetDate: string | null;
  probability: number;
  boostedWeeks: number | null;
  boostedDate: string | null;
  remainingKg: number;
  reason: string;
}

function addWeeks(weeks: number) {
  const d = new Date(Date.now() + weeks * 7 * 86400000);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

export function projectResult(profile: Profile, targets: Targets): Projection {
  const series = scoreSeries(14, profile, targets);
  const score = averageScore(series) || dayScore(dayKey(), profile, targets).score;
  const weights = getWeightLog();
  const first = weights[weights.length - 1]?.kg ?? profile.weightKg;
  const current = weights[0]?.kg ?? profile.weightKg;

  if (!profile.targetDeltaKg || (profile.goal !== "lose" && profile.goal !== "gain")) {
    return {
      possible: false, currentScore: score, weeksToGoal: null, targetDate: null,
      probability: Math.min(95, Math.max(20, score)), boostedWeeks: null, boostedDate: null,
      remainingKg: 0,
      reason: "Seu objetivo é manter/acompanhar — a projeção foca em manter o Índice de Consistência alto.",
    };
  }

  const done = profile.goal === "lose" ? Math.max(0, first - current) : Math.max(0, current - first);
  const remaining = Math.max(0, profile.targetDeltaKg - done);
  const kcalPerKg = profile.goal === "lose" ? 7700 : 5500;
  const dailyDelta = Math.abs(targets.tdee - targets.calories) || 350;

  const efficiency = Math.max(0.35, score / 100);
  const weeks = remaining <= 0 ? 0 : Math.max(1, Math.round((remaining * kcalPerKg) / (dailyDelta * efficiency) / 7));
  const boostedEff = Math.max(0.35, Math.min(1, (score + 5) / 100));
  const boosted = remaining <= 0 ? 0 : Math.max(1, Math.round((remaining * kcalPerKg) / (dailyDelta * boostedEff) / 7));

  const probability = Math.round(Math.min(96, Math.max(25, score * 0.85 + (series.filter((s) => s.hasData).length / 14) * 15)));

  return {
    possible: true,
    currentScore: score,
    weeksToGoal: weeks,
    targetDate: addWeeks(weeks),
    probability,
    boostedWeeks: boosted,
    boostedDate: addWeeks(boosted),
    remainingKg: Number(remaining.toFixed(1)),
    reason: `A projeção usa seu déficit diário planejado (${dailyDelta} kcal) ajustado pela sua aderência real: seu Índice médio dos últimos 14 dias é ${score}. Aderência maior = déficit real mais próximo do planejado = meta mais cedo.`,
  };
}

/* ------------------------- memória de hábitos ------------------------- */

export interface HabitMeal {
  description: string;
  category: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  count: number;
}

/** Refeições que o usuário repete — a IA aprende e sugere sem digitar. */
export function habitualMeals(limit = 4): HabitMeal[] {
  const all = getMealsByDay();
  const map = new Map<string, HabitMeal>();
  for (const day of lastDays(45)) {
    for (const m of all[day] ?? []) {
      const key = m.description.trim().toLowerCase();
      const prev = map.get(key);
      if (prev) {
        prev.count += 1;
        prev.kcal = Math.round((prev.kcal * (prev.count - 1) + m.kcal) / prev.count);
        prev.protein = Math.round((prev.protein * (prev.count - 1) + m.protein) / prev.count);
        prev.carbs = Math.round((prev.carbs * (prev.count - 1) + m.carbs) / prev.count);
        prev.fat = Math.round((prev.fat * (prev.count - 1) + m.fat) / prev.count);
      } else {
        map.set(key, { description: m.description, category: m.category, kcal: m.kcal, protein: m.protein, carbs: m.carbs, fat: m.fat, count: 1 });
      }
    }
  }
  return [...map.values()].filter((h) => h.count >= 2).sort((a, b) => b.count - a.count).slice(0, limit);
}

/** Sugestão para a categoria/horário atual, usada no registro rápido. */
export function suggestHabitFor(category: string): HabitMeal | null {
  return habitualMeals(20).find((h) => h.category === category) ?? null;
}

/* ------------------------- resumo semanal (dados) ------------------------- */

export function weeklyStats(profile: Profile, targets: Targets) {
  const days = lastDays(7);
  const rows = days.map((d) => ({ day: d, totals: dayTotals(d), score: dayScore(d, profile, targets) }));
  const logged = rows.filter((r) => r.totals.meals > 0).length;
  const avgKcal = Math.round(rows.reduce((a, r) => a + r.totals.kcal, 0) / 7);
  const avgProtein = Math.round(rows.reduce((a, r) => a + r.totals.protein, 0) / 7);
  const waterMissDays = rows.filter((r) => r.totals.waterMl < targets.waterMl).length;
  const workouts = rows.reduce((a, r) => a + (r.totals.workoutMinutes > 0 ? 1 : 0), 0);
  const weights = getWeightLog();
  const weekAgo = weights.find((w) => w.date <= days[0]!)?.kg ?? weights[weights.length - 1]?.kg ?? profile.weightKg;
  const current = weights[0]?.kg ?? profile.weightKg;
  const worst = [...rows].filter((r) => r.score.hasData).sort((a, b) => a.score.score - b.score.score)[0] ?? null;
  return {
    rows,
    logged,
    avgKcal,
    avgProtein,
    waterMissDays,
    workouts,
    weightDelta: Number((current - weekAgo).toFixed(1)),
    avgScore: averageScore(rows.map((r) => r.score)),
    worstDay: worst ? worst.day : null,
  };
}
