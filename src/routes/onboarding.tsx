import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import type { Activity, Goal, Intensity, Profile, Sex } from "@/lib/profile";
import { saveProfile } from "@/lib/profile";
import { Cuca } from "@/components/brand";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Comece agora — ValeFit" },
      { name: "description", content: "Configure seu perfil em 60 segundos e receba metas personalizadas de calorias, macros e água calculadas por IA." },
      { property: "og:title", content: "Onboarding — ValeFit" },
      { property: "og:description", content: "Metas personalizadas em 60 segundos." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Onboarding,
});

interface Draft {
  name: string;
  age: string;
  sex: Sex | "";
  heightCm: string;
  weightKg: string;
  goal: Goal | "";
  targetDeltaKg: string;
  wakeTime: string;
  sleepTime: string;
  practicesActivity: boolean | null;
  activityType: string;
  timesPerWeek: string;
  minutesPerSession: string;
  intensity: Intensity | "";
}

const ACTIVITIES = [
  "Academia", "Corrida", "Caminhada", "Crossfit", "Jiu-jitsu", "Muay Thai",
  "Pilates", "Natação", "Futebol", "Ciclismo", "Yoga", "Outro",
];

function StepHeader({ step, total, title, subtitle, onBack }: { step: number; total: number; title: string; subtitle?: string; onBack?: () => void }) {
  return (
    <div className="mb-8">
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={onBack}
          disabled={!onBack}
          aria-label="Voltar"
          className="grid size-9 place-items-center rounded-full border border-border bg-card text-muted transition hover:text-foreground disabled:opacity-30"
        >
          <ArrowLeft className="size-4" />
        </button>
        <div className="flex-1">
          <div className="h-3.5 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="relative h-full rounded-full bg-brand-leaf transition-all duration-500"
              style={{ width: `${(step / total) * 100}%` }}
            >
              <span className="absolute inset-x-2 top-[3px] h-1 rounded-full bg-white/35" />
            </div>
          </div>
        </div>
        <span className="text-xs font-extrabold tabular-nums text-muted">
          {step}/{total}
        </span>
      </div>
      <div className="flex items-end gap-3">
        <Cuca pose="rosto" decorative className="w-20 shrink-0 animate-pop sm:w-24" key={step} />
        <div className="relative mb-3 flex-1 rounded-2xl border-2 border-border bg-card px-4 py-3">
          <h1 className="text-xl font-black tracking-tight text-balance sm:text-2xl">{title}</h1>
          <span aria-hidden="true" className="absolute -left-[9px] bottom-4 size-4 rotate-45 border-b-2 border-l-2 border-border bg-card" />
        </div>
      </div>
      {subtitle ? <p className="mt-3 text-sm text-muted">{subtitle}</p> : null}
    </div>
  );
}

function ContinueButton({ disabled, onClick, label = "Continuar" }: { disabled?: boolean; onClick: () => void; label?: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="btn-3d mt-auto flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-4 text-base font-extrabold uppercase tracking-wide text-white disabled:cursor-not-allowed disabled:bg-secondary disabled:text-muted disabled:shadow-none"
    >
      {label} <ArrowRight className="size-4" />
    </button>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-2xl border-2 border-border bg-card px-5 py-4 text-base font-semibold outline-none transition focus:border-primary ${props.className ?? ""}`}
    />
  );
}

function ChoicePill({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`btn-3d-soft rounded-xl border-2 px-4 py-3 text-sm font-bold transition ${
        selected
          ? "border-primary bg-primary-soft text-primary"
          : "border-border bg-card text-foreground hover:border-primary/40"
      }`}
    >
      {children}
    </button>
  );
}

function ChoiceCard({ selected, onClick, title, subtitle }: { selected: boolean; onClick: () => void; title: string; subtitle?: string }) {
  return (
    <button
      onClick={onClick}
      className={`btn-3d-soft flex w-full items-center justify-between rounded-2xl border-2 p-4 text-left transition ${
        selected ? "border-primary bg-primary-soft" : "border-border bg-card hover:border-primary/40"
      }`}
    >
      <div>
        <p className={`font-extrabold ${selected ? "text-primary" : ""}`}>{title}</p>
        {subtitle ? <p className="mt-0.5 text-xs text-muted">{subtitle}</p> : null}
      </div>
      <div className={`grid size-6 place-items-center rounded-full border-2 ${selected ? "border-primary bg-primary text-white" : "border-border"}`}>
        {selected ? <Check className="size-3.5" strokeWidth={3} /> : null}
      </div>
    </button>
  );
}

function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [d, setD] = useState<Draft>({
    name: "", age: "", sex: "", heightCm: "", weightKg: "", goal: "",
    targetDeltaKg: "", wakeTime: "07:00", sleepTime: "23:00",
    practicesActivity: null, activityType: "", timesPerWeek: "", minutesPerSession: "", intensity: "",
  });

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((prev) => ({ ...prev, [k]: v }));

  const showTarget = d.goal === "lose" || d.goal === "gain";
  const totalSteps = 6 + (showTarget ? 1 : 0) + (d.practicesActivity ? 1 : 0);

  const finalize = () => {
    const profile: Profile = {
      name: d.name.trim(),
      age: Number(d.age),
      sex: d.sex as Sex,
      heightCm: Number(d.heightCm),
      weightKg: Number(d.weightKg),
      goal: d.goal as Goal,
      targetDeltaKg: showTarget ? Number(d.targetDeltaKg) : undefined,
      wakeTime: d.wakeTime,
      sleepTime: d.sleepTime,
      activity:
        d.practicesActivity && d.activityType
          ? ({
              type: d.activityType,
              timesPerWeek: Number(d.timesPerWeek || 3),
              minutesPerSession: Number(d.minutesPerSession || 45),
              intensity: (d.intensity || "moderate") as Intensity,
            } as Activity)
          : null,
      createdAt: Date.now(),
    };
    saveProfile(profile);
    navigate({ to: "/dashboard", replace: true });
  };

  const back = step > 0 ? () => setStep((s) => Math.max(0, s - 1)) : undefined;

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-xl flex-col px-6 py-8">
        {step === 0 && (
          <>
            <StepHeader step={1} total={totalSteps} title="Oi! Eu sou o Cuca. Como você se chama?" subtitle="Vamos personalizar sua jornada." onBack={back} />
            <TextInput autoFocus placeholder="Seu primeiro nome" value={d.name} onChange={(e) => set("name", e.target.value)} />
            <ContinueButton disabled={!d.name.trim()} onClick={() => setStep(1)} />
          </>
        )}

        {step === 1 && (
          <>
            <StepHeader step={2} total={totalSteps} title="Alguns dados sobre você" subtitle="Precisamos disso para calcular suas metas com precisão." onBack={back} />
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">Idade</label>
                  <TextInput inputMode="numeric" placeholder="28" value={d.age} onChange={(e) => set("age", e.target.value.replace(/\D/g, ""))} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">Sexo</label>
                  <div className="grid grid-cols-2 gap-2">
                    <ChoicePill selected={d.sex === "male"} onClick={() => set("sex", "male")}>Masc</ChoicePill>
                    <ChoicePill selected={d.sex === "female"} onClick={() => set("sex", "female")}>Fem</ChoicePill>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">Altura (cm)</label>
                  <TextInput inputMode="numeric" placeholder="175" value={d.heightCm} onChange={(e) => set("heightCm", e.target.value.replace(/\D/g, ""))} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">Peso (kg)</label>
                  <TextInput inputMode="decimal" placeholder="78" value={d.weightKg} onChange={(e) => set("weightKg", e.target.value.replace(/[^\d.,]/g, "").replace(",", "."))} />
                </div>
              </div>
            </div>
            <ContinueButton
              disabled={!d.age || !d.sex || !d.heightCm || !d.weightKg}
              onClick={() => setStep(2)}
            />
          </>
        )}

        {step === 2 && (
          <>
            <StepHeader step={3} total={totalSteps} title="Qual é seu objetivo?" onBack={back} />
            <div className="space-y-3">
              <ChoiceCard selected={d.goal === "lose"} onClick={() => set("goal", "lose")} title="Perder peso" subtitle="Déficit calórico inteligente." />
              <ChoiceCard selected={d.goal === "gain"} onClick={() => set("goal", "gain")} title="Ganhar massa" subtitle="Superávit + proteína alta." />
              <ChoiceCard selected={d.goal === "maintain"} onClick={() => set("goal", "maintain")} title="Manter peso" subtitle="Equilíbrio e consistência." />
              <ChoiceCard selected={d.goal === "track"} onClick={() => set("goal", "track")} title="Apenas acompanhar" subtitle="Sem metas rígidas." />
            </div>
            <ContinueButton disabled={!d.goal} onClick={() => setStep(showTarget ? 3 : 4)} />
          </>
        )}

        {step === 3 && showTarget && (
          <>
            <StepHeader
              step={4}
              total={totalSteps}
              title={d.goal === "lose" ? "Quanto deseja perder?" : "Quanto deseja ganhar?"}
              subtitle="Em quilos. Não se preocupe, você pode ajustar depois."
              onBack={back}
            />
            <div className="flex items-baseline gap-3">
              <TextInput inputMode="decimal" placeholder="5" value={d.targetDeltaKg} onChange={(e) => set("targetDeltaKg", e.target.value.replace(/[^\d.,]/g, "").replace(",", "."))} className="flex-1 text-4xl font-extrabold" />
              <span className="text-2xl font-bold text-muted">kg</span>
            </div>
            <ContinueButton disabled={!d.targetDeltaKg || Number(d.targetDeltaKg) <= 0} onClick={() => setStep(4)} />
          </>
        )}

        {step === 4 && (
          <>
            <StepHeader step={showTarget ? 5 : 4} total={totalSteps} title="Sua rotina do sono" subtitle="Vamos programar os lembretes na hora certa." onBack={back} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">Acorda</label>
                <TextInput type="time" value={d.wakeTime} onChange={(e) => set("wakeTime", e.target.value)} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">Dorme</label>
                <TextInput type="time" value={d.sleepTime} onChange={(e) => set("sleepTime", e.target.value)} />
              </div>
            </div>
            <ContinueButton onClick={() => setStep(5)} />
          </>
        )}

        {step === 5 && (
          <>
            <StepHeader step={showTarget ? 6 : 5} total={totalSteps} title="Você pratica atividade física?" onBack={back} />
            <div className="space-y-3">
              <ChoiceCard selected={d.practicesActivity === true} onClick={() => set("practicesActivity", true)} title="Sim, pratico" subtitle="Vamos ajustar as calorias." />
              <ChoiceCard selected={d.practicesActivity === false} onClick={() => set("practicesActivity", false)} title="Não pratico" subtitle="Sem problemas, começamos daqui." />
            </div>
            <ContinueButton
              disabled={d.practicesActivity === null}
              onClick={() => setStep(d.practicesActivity ? 6 : 7)}
            />
          </>
        )}

        {step === 6 && d.practicesActivity && (
          <>
            <StepHeader step={showTarget ? 7 : 6} total={totalSteps} title="Conte um pouco mais" subtitle="Estimativa é suficiente." onBack={back} />
            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted">Modalidade</label>
                <div className="flex flex-wrap gap-2">
                  {ACTIVITIES.map((a) => (
                    <ChoicePill key={a} selected={d.activityType === a} onClick={() => set("activityType", a)}>{a}</ChoicePill>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">Vezes/semana</label>
                  <TextInput inputMode="numeric" placeholder="4" value={d.timesPerWeek} onChange={(e) => set("timesPerWeek", e.target.value.replace(/\D/g, ""))} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">Minutos</label>
                  <TextInput inputMode="numeric" placeholder="60" value={d.minutesPerSession} onChange={(e) => set("minutesPerSession", e.target.value.replace(/\D/g, ""))} />
                </div>
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted">Intensidade</label>
                <div className="grid grid-cols-3 gap-2">
                  <ChoicePill selected={d.intensity === "light"} onClick={() => set("intensity", "light")}>Leve</ChoicePill>
                  <ChoicePill selected={d.intensity === "moderate"} onClick={() => set("intensity", "moderate")}>Moderada</ChoicePill>
                  <ChoicePill selected={d.intensity === "high"} onClick={() => set("intensity", "high")}>Alta</ChoicePill>
                </div>
              </div>
            </div>
            <ContinueButton disabled={!d.activityType || !d.intensity} onClick={() => setStep(7)} label="Ver minhas metas" />
          </>
        )}

        {step === 7 && (
          <>
            <StepHeader step={totalSteps} total={totalSteps} title={`Tudo pronto, ${d.name.split(" ")[0]}.`} subtitle="Calculamos suas metas com base em Mifflin-St Jeor e seu perfil." onBack={back} />
            <div className="card-soft rounded-3xl p-6 text-center">
              <Cuca pose="joia" className="animate-cuca mx-auto -mt-2 mb-3 w-44" />
              <p className="text-sm text-muted">
                Seus valores personalizados já estão prontos. No dashboard você verá seu
                anel de calorias, macros, hidratação, peso e a estimativa de tempo para
                bater seu objetivo.
              </p>
            </div>
            <ContinueButton onClick={finalize} label="Abrir meu dashboard" />
          </>
        )}
      </div>
    </main>
  );
}
