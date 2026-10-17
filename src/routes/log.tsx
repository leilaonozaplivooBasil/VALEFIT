import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Sparkles, Mic, Camera, ScanBarcode, ArrowLeft, Check, Loader2 } from "lucide-react";
import { AppShell, TopBar } from "@/components/app-shell";
import { addMeal, type MealItem } from "@/lib/meals";
import { loadProfile } from "@/lib/profile";

export const Route = createFileRoute("/log")({
  head: () => ({
    meta: [
      { title: "Registrar refeição — ValeFit" },
      { name: "description", content: "Descreva o que comeu em uma frase. A IA interpreta, estima calorias e macros automaticamente." },
      { property: "og:title", content: "Registro por IA — ValeFit" },
      { property: "og:description", content: "Refeição registrada em 15 segundos." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: LogMeal,
});

type Interpretation = {
  description: string;
  category: MealItem["category"];
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence: "alta" | "média" | "baixa";
  clarify: string | null;
};

function suggestCategory(): MealItem["category"] {
  const h = new Date().getHours();
  if (h < 10) return "Café da manhã";
  if (h < 12) return "Lanche";
  if (h < 15) return "Almoço";
  if (h < 18) return "Lanche";
  if (h < 22) return "Jantar";
  return "Outro";
}

const EXAMPLES = [
  "2 ovos mexidos com café preto",
  "Prato de arroz, feijão e frango grelhado",
  "Rodízio de pizza, comi umas 4 fatias",
  "Uma banana e um punhado de castanhas",
];

function LogMeal() {
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Interpretation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [clarifyAnswer, setClarifyAnswer] = useState("");
  const [listening, setListening] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [source, setSource] = useState<MealItem["source"]>("texto");
  const fileRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (!loadProfile()) navigate({ to: "/", replace: true });
  }, [navigate]);

  const time = useMemo(
    () => new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    [],
  );

  function toggleVoice() {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const SR =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setError("Seu navegador não suporta ditado por voz. Use Chrome ou digite.");
      return;
    }
    const rec = new SR();
    rec.lang = "pt-BR";
    rec.interimResults = true;
    rec.continuous = false;
    let finalText = "";
    rec.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += t;
        else interim += t;
      }
      setText((finalText + interim).trim());
    };
    rec.onerror = () => { setListening(false); setError("Não consegui ouvir. Tente de novo."); };
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    setError(null);
    setSource("voz");
    setListening(true);
    rec.start();
  }

  function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setPhoto(dataUrl);
      setSource("foto");
      setError(null);
      void interpret(text.trim(), undefined, dataUrl);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  async function interpret(input: string, extra?: string, imageData?: string) {
    setLoading(true);
    setError(null);
    try {
      const fullText = extra ? `${input}. ${extra}` : input;
      const res = await fetch("/api/interpret-meal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: fullText,
          image: imageData ?? photo ?? undefined,
          category: suggestCategory(),
          when: time,
        }),
      });
      if (!res.ok) {
        if (res.status === 429) throw new Error("Muitas requisições. Aguarde um instante.");
        if (res.status === 402) throw new Error("Créditos de IA esgotados. Adicione créditos no workspace.");
        throw new Error("Não consegui interpretar. Tente descrever com mais detalhe.");
      }
      const data = (await res.json()) as Interpretation;
      setResult(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function confirm() {
    if (!result) return;
    const meal: MealItem = {
      id: Math.random().toString(36).slice(2),
      createdAt: Date.now(),
      when: time,
      category: result.category,
      description: result.description,
      source,
      kcal: Math.round(result.kcal),
      protein: Math.round(result.protein),
      carbs: Math.round(result.carbs),
      fat: Math.round(result.fat),
    };
    addMeal(meal);
    navigate({ to: "/dashboard" });
  }

  return (
    <AppShell>
      <TopBar
        right={
          <button
            onClick={() => navigate({ to: "/dashboard" })}
            className="flex items-center gap-1 text-sm font-semibold text-muted hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> Voltar
          </button>
        }
      />

      <main className="mx-auto max-w-xl px-6 py-6 space-y-6">
        <section className="animate-reveal">
          <p className="font-mono text-[11px] uppercase tracking-widest text-muted">
            Registro por IA · {time}
          </p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight">
            O que você comeu?
          </h1>
          <p className="mt-1 text-sm text-muted">
            Descreva em uma frase. A IA calcula tudo.
          </p>
        </section>

        {!result && (
          <>
            <section className="animate-reveal [animation-delay:80ms]">
              <div className="rounded-3xl border border-border bg-card p-2">
                <textarea
                  autoFocus
                  rows={3}
                  placeholder="Ex: Arroz, feijão preto e frango grelhado"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="w-full resize-none bg-transparent px-4 py-3 text-base outline-none placeholder:text-muted"
                  disabled={loading}
                />
                <div className="flex items-center gap-1 border-t border-border p-1">
                  <button
                    onClick={toggleVoice}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold transition hover:bg-secondary ${listening ? "bg-primary-soft text-primary" : "text-muted"}`}
                  >
                    <Mic className={`size-4 ${listening ? "animate-pulse" : ""}`} />
                    {listening ? "Ouvindo…" : "Voz"}
                  </button>
                  <div className="h-4 w-px bg-border" />
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold text-muted transition hover:bg-secondary"
                  >
                    <Camera className="size-4" /> Foto
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={onPickPhoto}
                    className="hidden"
                  />
                  <div className="h-4 w-px bg-border" />
                  <button className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold text-muted opacity-50" title="Em breve" disabled>
                    <ScanBarcode className="size-4" /> Código
                  </button>
                </div>
                {photo && (
                  <div className="flex items-center gap-3 border-t border-border p-3">
                    <img src={photo} alt="Foto da refeição" className="size-12 rounded-lg object-cover" />
                    <p className="flex-1 text-xs text-muted">Foto anexada — a IA vai analisar o prato.</p>
                    <button onClick={() => setPhoto(null)} className="text-xs font-semibold text-muted hover:text-foreground">Remover</button>
                  </div>
                )}
              </div>

              <button
                onClick={() => interpret(text.trim())}
                disabled={loading || (text.trim().length < 3 && !photo)}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-foreground py-4 text-base font-semibold text-background transition hover:opacity-90 disabled:opacity-40"
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span className="text-shimmer">Interpretando com IA…</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4" /> Interpretar com IA
                  </>
                )}
              </button>
            </section>

            <section className="animate-reveal [animation-delay:160ms]">
              <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted">Exemplos</p>
              <div className="space-y-2">
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    onClick={() => setText(ex)}
                    className="w-full rounded-xl border border-border bg-card px-4 py-3 text-left text-sm text-muted transition hover:border-foreground/30 hover:text-foreground"
                  >
                    "{ex}"
                  </button>
                ))}
              </div>
            </section>
          </>
        )}

        {result && (
          <section className="animate-reveal space-y-4">
            <div className="rounded-3xl border border-border bg-card p-6">
              <div className="mb-3 flex items-center justify-between">
                <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-bold text-primary">
                  {result.category}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
                  Confiança: {result.confidence}
                </span>
              </div>
              <p className="text-base font-semibold leading-snug">{result.description}</p>

              <div className="mt-6 grid grid-cols-4 gap-3 border-t border-border pt-6">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Kcal</p>
                  <p className="mt-1 text-lg font-extrabold tabular-nums">{result.kcal}</p>
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Prot</p>
                  <p className="mt-1 text-lg font-extrabold tabular-nums text-primary">{result.protein}g</p>
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Carb</p>
                  <p className="mt-1 text-lg font-extrabold tabular-nums text-carb">{result.carbs}g</p>
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Gord</p>
                  <p className="mt-1 text-lg font-extrabold tabular-nums text-fat">{result.fat}g</p>
                </div>
              </div>
            </div>

            {result.clarify && (
              <div className="rounded-3xl border border-border bg-card p-5">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-4 text-primary" />
                  <p className="text-sm font-semibold">A IA precisa de um detalhe</p>
                </div>
                <p className="mt-2 text-sm text-muted">{result.clarify}</p>
                <div className="mt-3 flex gap-2">
                  <input
                    value={clarifyAnswer}
                    onChange={(e) => setClarifyAnswer(e.target.value)}
                    placeholder="Sua resposta"
                    className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-foreground"
                  />
                  <button
                    onClick={() => { interpret(text, clarifyAnswer); setClarifyAnswer(""); }}
                    className="rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background"
                  >
                    Recalcular
                  </button>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => { setResult(null); setText(""); }}
                className="flex-1 rounded-2xl border border-border bg-card py-4 text-sm font-semibold text-muted"
              >
                Refazer
              </button>
              <button
                onClick={confirm}
                className="btn-3d flex flex-[2] items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-sm font-extrabold text-primary-foreground"
              >
                <Check className="size-4" /> Adicionar ao meu dia
              </button>
            </div>
          </section>
        )}

        {error && (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive animate-fade">
            {error}
          </div>
        )}
      </main>
    </AppShell>
  );
}
