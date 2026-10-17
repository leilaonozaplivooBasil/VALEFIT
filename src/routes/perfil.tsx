import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { LogOut, User } from "lucide-react";
import { AppShell, TopBar } from "@/components/app-shell";
import { calcTargets, clearProfile, loadProfile, type Profile } from "@/lib/profile";

export const Route = createFileRoute("/perfil")({
  head: () => ({
    meta: [
      { title: "Perfil — ValeFit" },
      { name: "description", content: "Seu perfil, metas calculadas por IA e configurações do ValeFit." },
      { property: "og:title", content: "Perfil — ValeFit" },
      { property: "og:description", content: "Suas metas nutricionais personalizadas." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: PerfilPage,
});

const GOAL_LABEL: Record<string, string> = {
  lose: "Perder peso",
  gain: "Ganhar massa",
  maintain: "Manter peso",
  track: "Acompanhar alimentação",
};

function PerfilPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const p = loadProfile();
    if (!p) navigate({ to: "/", replace: true });
    else setProfile(p);
  }, [navigate]);

  const targets = useMemo(() => (profile ? calcTargets(profile) : null), [profile]);

  if (!profile || !targets) return null;

  return (
    <AppShell>
      <TopBar />
      <main className="mx-auto max-w-xl space-y-6 px-6 py-6">
        <section className="animate-reveal flex items-center gap-4">
          <div className="grid size-16 place-items-center rounded-2xl bg-primary-soft text-primary">
            <User className="size-7" />
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Seu perfil</p>
            <h1 className="text-2xl font-extrabold tracking-tight">{profile.name}</h1>
            <p className="text-sm text-muted">
              {profile.age} anos · {profile.heightCm}cm · {profile.weightKg}kg
            </p>
          </div>
        </section>

        <section className="animate-reveal [animation-delay:80ms] rounded-3xl border border-border bg-card p-6">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Objetivo</p>
          <p className="mt-1 text-lg font-bold">{GOAL_LABEL[profile.goal]}</p>
          {targets.estimatedWeeks && (
            <p className="mt-1 text-sm text-muted">
              Estimativa: ~{targets.estimatedWeeks} semanas para {profile.targetDeltaKg}kg
            </p>
          )}
        </section>

        <section className="animate-reveal [animation-delay:160ms] rounded-3xl border border-border bg-card p-6">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Metas diárias</p>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <Metric label="TMB" value={`${targets.tmb} kcal`} />
            <Metric label="Gasto total" value={`${targets.tdee} kcal`} />
            <Metric label="Calorias" value={`${targets.calories} kcal`} highlight />
            <Metric label="Proteína" value={`${targets.protein} g`} />
            <Metric label="Carboidrato" value={`${targets.carbs} g`} />
            <Metric label="Gordura" value={`${targets.fat} g`} />
            <Metric label="Água" value={`${(targets.waterMl / 1000).toFixed(1)} L`} />
          </div>
        </section>

        {profile.activity && (
          <section className="animate-reveal [animation-delay:240ms] rounded-3xl border border-border bg-card p-6">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Atividade física</p>
            <p className="mt-1 text-lg font-bold">{profile.activity.type}</p>
            <p className="text-sm text-muted">
              {profile.activity.timesPerWeek}x/semana · {profile.activity.minutesPerSession}min · intensidade {profile.activity.intensity === "light" ? "leve" : profile.activity.intensity === "moderate" ? "moderada" : "alta"}
            </p>
          </section>
        )}

        <button
          onClick={() => {
            if (confirm("Deseja realmente resetar seu perfil? Todos os dados locais serão apagados.")) {
              clearProfile();
              localStorage.removeItem("nutriia:meals:v1");
              localStorage.removeItem("nutriia:water:v1");
              localStorage.removeItem("nutriia:weight-log:v1");
              localStorage.removeItem("nutriia:streak:v1");
              navigate({ to: "/", replace: true });
            }
          }}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-destructive/20 bg-destructive/5 py-4 text-sm font-semibold text-destructive"
        >
          <LogOut className="size-4" /> Resetar perfil
        </button>
      </main>
    </AppShell>
  );
}

function Metric({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-widest text-muted">{label}</p>
      <p className={`mt-0.5 text-lg font-bold tabular-nums ${highlight ? "text-primary" : ""}`}>
        {value}
      </p>
    </div>
  );
}
