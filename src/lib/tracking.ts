// Camada de histórico do Nutri IA V2.
// Tudo local (localStorage), indexado por dia (YYYY-MM-DD).

import type { MealItem } from "./meals";

const MEAL_KEY = "nutriia:meals:v1";
const WATER_KEY = "nutriia:water:v1";
const WATER_EVENTS_KEY = "nutriia:water-events:v1";
const WORKOUT_KEY = "nutriia:workouts:v1";
const SLEEP_KEY = "nutriia:sleep:v1";

export function dayKey(d: Date = new Date()): string {
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 10);
}

export function lastDays(n: number): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(dayKey(new Date(Date.now() - i * 86400000)));
  return out;
}

export function formatDayShort(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y!, (m ?? 1) - 1, d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

/* ---------------- refeições / água ---------------- */

export function getMealsByDay(): Record<string, MealItem[]> {
  return read<Record<string, MealItem[]>>(MEAL_KEY, {});
}

export function getMeals(day: string): MealItem[] {
  return getMealsByDay()[day] ?? [];
}

export function getWaterByDay(): Record<string, number> {
  return read<Record<string, number>>(WATER_KEY, {});
}

export interface WaterEvent { at: number; ml: number }

export function getWaterEvents(day: string): WaterEvent[] {
  return read<Record<string, WaterEvent[]>>(WATER_EVENTS_KEY, {})[day] ?? [];
}

export function logWaterEvent(ml: number) {
  const all = read<Record<string, WaterEvent[]>>(WATER_EVENTS_KEY, {});
  const day = dayKey();
  all[day] = [...(all[day] ?? []), { at: Date.now(), ml }];
  write(WATER_EVENTS_KEY, all);
}

/* ---------------- treinos ---------------- */

export interface Workout {
  id: string;
  at: number;
  type: string;
  minutes: number;
  intensity: "leve" | "moderado" | "intenso";
}

export function getWorkoutsByDay(): Record<string, Workout[]> {
  return read<Record<string, Workout[]>>(WORKOUT_KEY, {});
}

export function getWorkouts(day: string): Workout[] {
  return getWorkoutsByDay()[day] ?? [];
}

export function addWorkout(w: Omit<Workout, "id" | "at">) {
  const all = getWorkoutsByDay();
  const day = dayKey();
  all[day] = [...(all[day] ?? []), { ...w, id: crypto.randomUUID(), at: Date.now() }];
  write(WORKOUT_KEY, all);
}

/* ---------------- sono ---------------- */

export interface SleepEntry { hours: number; at: number }

export function getSleepByDay(): Record<string, SleepEntry> {
  return read<Record<string, SleepEntry>>(SLEEP_KEY, {});
}

export function getSleep(day: string): SleepEntry | null {
  return getSleepByDay()[day] ?? null;
}

export function setSleep(hours: number) {
  const all = getSleepByDay();
  all[dayKey()] = { hours, at: Date.now() };
  write(SLEEP_KEY, all);
}

/* ---------------- agregados ---------------- */

export interface DayTotals {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  meals: number;
  waterMl: number;
  workoutMinutes: number;
  sleepHours: number | null;
}

export function dayTotals(day: string): DayTotals {
  const meals = getMeals(day);
  const t = meals.reduce(
    (a, m) => ({
      kcal: a.kcal + m.kcal,
      protein: a.protein + m.protein,
      carbs: a.carbs + m.carbs,
      fat: a.fat + m.fat,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );
  const sleep = getSleep(day);
  return {
    ...t,
    meals: meals.length,
    waterMl: getWaterByDay()[day] ?? 0,
    workoutMinutes: getWorkouts(day).reduce((a, w) => a + w.minutes, 0),
    sleepHours: sleep ? sleep.hours : null,
  };
}

export function hasAnyData(day: string): boolean {
  const t = dayTotals(day);
  return t.meals > 0 || t.waterMl > 0 || t.workoutMinutes > 0 || t.sleepHours !== null;
}
