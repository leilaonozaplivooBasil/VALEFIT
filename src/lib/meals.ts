export interface MealItem {
  id: string;
  createdAt: number;
  when: string; // "13:00"
  category: "Café da manhã" | "Lanche" | "Almoço" | "Jantar" | "Outro";
  description: string;
  source: "texto" | "voz" | "foto" | "código de barras";
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface WaterLog {
  ml: number;
  updatedAt: number;
}

const MEAL_KEY = "nutriia:meals:v1";
const WATER_KEY = "nutriia:water:v1";
const WEIGHT_KEY = "nutriia:weight-log:v1";
const STREAK_KEY = "nutriia:streak:v1";

function todayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export function loadMealsToday(): MealItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(MEAL_KEY);
    if (!raw) return [];
    const all = JSON.parse(raw) as Record<string, MealItem[]>;
    return all[todayKey()] ?? [];
  } catch {
    return [];
  }
}

export function addMeal(meal: MealItem) {
  if (typeof window === "undefined") return;
  const raw = window.localStorage.getItem(MEAL_KEY);
  const all: Record<string, MealItem[]> = raw ? JSON.parse(raw) : {};
  const day = todayKey();
  all[day] = [meal, ...(all[day] ?? [])];
  window.localStorage.setItem(MEAL_KEY, JSON.stringify(all));

  // atualiza streak
  const streakRaw = window.localStorage.getItem(STREAK_KEY);
  const streak = streakRaw ? (JSON.parse(streakRaw) as { last: string; count: number }) : { last: "", count: 0 };
  if (streak.last !== day) {
    const y = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    streak.count = streak.last === y ? streak.count + 1 : 1;
    streak.last = day;
    window.localStorage.setItem(STREAK_KEY, JSON.stringify(streak));
  }
}

export function deleteMeal(id: string) {
  if (typeof window === "undefined") return;
  const raw = window.localStorage.getItem(MEAL_KEY);
  if (!raw) return;
  const all = JSON.parse(raw) as Record<string, MealItem[]>;
  const day = todayKey();
  all[day] = (all[day] ?? []).filter((m) => m.id !== id);
  window.localStorage.setItem(MEAL_KEY, JSON.stringify(all));
}

export function getStreak(): number {
  if (typeof window === "undefined") return 0;
  const raw = window.localStorage.getItem(STREAK_KEY);
  if (!raw) return 0;
  return (JSON.parse(raw) as { count: number }).count;
}

export function getWaterToday(): number {
  if (typeof window === "undefined") return 0;
  const raw = window.localStorage.getItem(WATER_KEY);
  if (!raw) return 0;
  const all = JSON.parse(raw) as Record<string, number>;
  return all[todayKey()] ?? 0;
}

export function addWater(ml: number) {
  if (typeof window === "undefined") return;
  const raw = window.localStorage.getItem(WATER_KEY);
  const all: Record<string, number> = raw ? JSON.parse(raw) : {};
  const day = todayKey();
  all[day] = (all[day] ?? 0) + ml;
  window.localStorage.setItem(WATER_KEY, JSON.stringify(all));
}

export interface WeightEntry { date: string; kg: number }

export function getWeightLog(): WeightEntry[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(WEIGHT_KEY);
  return raw ? (JSON.parse(raw) as WeightEntry[]) : [];
}

export function addWeightEntry(kg: number) {
  if (typeof window === "undefined") return;
  const log = getWeightLog();
  const day = todayKey();
  const existing = log.findIndex((e) => e.date === day);
  if (existing >= 0) log[existing] = { date: day, kg };
  else log.unshift({ date: day, kg });
  window.localStorage.setItem(WEIGHT_KEY, JSON.stringify(log.slice(0, 90)));
}

export function totalsToday(meals: MealItem[]) {
  return meals.reduce(
    (acc, m) => ({
      kcal: acc.kcal + m.kcal,
      protein: acc.protein + m.protein,
      carbs: acc.carbs + m.carbs,
      fat: acc.fat + m.fat,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );
}
