// Perfil do usuário + cálculos nutricionais (TMB, macros, água).
// Persistência: localStorage. Sem backend nesta fase.

export type Sex = "male" | "female";
export type Goal = "lose" | "gain" | "maintain" | "track";
export type Intensity = "light" | "moderate" | "high";

export interface Activity {
  type: string;
  timesPerWeek: number;
  minutesPerSession: number;
  intensity: Intensity;
}

export interface Profile {
  name: string;
  age: number;
  sex: Sex;
  heightCm: number;
  weightKg: number;
  goal: Goal;
  targetDeltaKg?: number; // positivo p/ ganhar, positivo p/ perder (magnitude)
  wakeTime: string; // "07:00"
  sleepTime: string; // "23:00"
  activity: Activity | null;
  createdAt: number;
}

export interface Targets {
  tmb: number;
  tdee: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  waterMl: number;
  estimatedWeeks: number | null;
}

const KEY = "nutriia:profile:v1";

export function loadProfile(): Profile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Profile) : null;
  } catch {
    return null;
  }
}

export function saveProfile(p: Profile) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(p));
}

export function clearProfile() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}

// Mifflin-St Jeor
export function calcTMB(p: Profile): number {
  const base = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age;
  return Math.round(base + (p.sex === "male" ? 5 : -161));
}

function activityFactor(a: Activity | null): number {
  if (!a) return 1.2;
  const perWeek = a.timesPerWeek;
  if (perWeek <= 1) return 1.3;
  if (perWeek <= 3) return a.intensity === "high" ? 1.55 : 1.45;
  if (perWeek <= 5) return a.intensity === "high" ? 1.725 : 1.6;
  return 1.9;
}

export function calcTargets(p: Profile): Targets {
  const tmb = calcTMB(p);
  const tdee = Math.round(tmb * activityFactor(p.activity));

  let calories = tdee;
  if (p.goal === "lose") calories = Math.round(tdee - 500);
  if (p.goal === "gain") calories = Math.round(tdee + 350);

  // Macros: prot 2g/kg (perda) ou 1.8g/kg (ganho) ou 1.6g/kg (manter)
  const proteinPerKg = p.goal === "lose" ? 2.0 : p.goal === "gain" ? 1.8 : 1.6;
  const protein = Math.round(p.weightKg * proteinPerKg);
  const fat = Math.round((calories * 0.28) / 9);
  const carbs = Math.round((calories - protein * 4 - fat * 9) / 4);
  const waterMl = Math.round(p.weightKg * 35);

  let estimatedWeeks: number | null = null;
  if (p.targetDeltaKg && (p.goal === "lose" || p.goal === "gain")) {
    // 1kg gordura ≈ 7700 kcal; ganho magro ≈ 5500 kcal/kg
    const kcalPerKg = p.goal === "lose" ? 7700 : 5500;
    const dailyDelta = p.goal === "lose" ? tdee - calories : calories - tdee;
    if (dailyDelta > 0) {
      const days = (p.targetDeltaKg * kcalPerKg) / dailyDelta;
      estimatedWeeks = Math.max(1, Math.round(days / 7));
    }
  }

  return { tmb, tdee, calories, protein, carbs, fat, waterMl, estimatedWeeks };
}
