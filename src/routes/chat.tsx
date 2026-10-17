import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Send, ArrowLeft } from "lucide-react";
import { AppShell, TopBar } from "@/components/app-shell";
import { Cuca, CucaAvatar } from "@/components/brand";
import { loadProfile, calcTargets } from "@/lib/profile";
import { loadMealsToday, totalsToday, getWaterToday } from "@/lib/meals";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "Coach IA — ValeFit" },
      { name: "description", content: "Converse com sua nutricionista de IA. Ela conhece seu perfil, meta e refeições do dia." },
      { property: "og:title", content: "Coach IA — ValeFit" },
      { property: "og:description", content: "Sua nutricionista com IA, 24 horas." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Chat,
});

interface Msg { role: "user" | "assistant"; content: string }

const SUGGESTIONS = [
  "Posso comer pizza hoje?",
  "O que jantar dentro da meta?",
  "Quanto falta de proteína?",
  "Troque arroz por batata doce",
];

function Chat() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!loadProfile()) navigate({ to: "/", replace: true });
    inputRef.current?.focus();
  }, [navigate]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;

    const profile = loadProfile();
    if (!profile) return;
    const targets = calcTargets(profile);
    const mealsToday = loadMealsToday();
    const water = getWaterToday();

    const next: Msg[] = [...messages, { role: "user", content: trimmed }];
    setMessages(next);
    setInput("");
    setStreaming(true);

    // placeholder assistant message
    setMessages((m) => [...m, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next,
          context: {
            profile: { name: profile.name, sex: profile.sex, age: profile.age, weightKg: profile.weightKg, heightCm: profile.heightCm, goal: profile.goal, targetDeltaKg: profile.targetDeltaKg, activity: profile.activity },
            targets,
            totalsToday: totalsToday(mealsToday),
            mealsToday: mealsToday.map((m) => ({ when: m.when, category: m.category, description: m.description, kcal: m.kcal, protein: m.protein })),
            water,
          },
        }),
      });

      if (!res.ok || !res.body) {
        const errText = res.status === 402 ? "Créditos de IA esgotados." : res.status === 429 ? "Muitas requisições, tente em instantes." : "Não consegui responder agora.";
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { role: "assistant", content: errText };
          return copy;
        });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { role: "assistant", content: acc };
          return copy;
        });
      }
    } catch {
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = { role: "assistant", content: "Erro de conexão." };
        return copy;
      });
    } finally {
      setStreaming(false);
      inputRef.current?.focus();
    }
  }

  return (
    <AppShell>
      <TopBar
        title="Coach IA"
        right={
          <button
            onClick={() => navigate({ to: "/dashboard" })}
            className="flex items-center gap-1 text-sm font-semibold text-muted hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> Voltar
          </button>
        }
      />

      <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-xl flex-col px-6">
        <div ref={scrollRef} className="flex-1 overflow-y-auto py-6 space-y-6">
          {messages.length === 0 ? (
            <div className="animate-reveal py-8 text-center">
              <Cuca pose="joia" className="animate-cuca mx-auto w-48" />
              <h2 className="mt-2 text-2xl font-black tracking-tight">Fala com o Cuca!</h2>
              <p className="mx-auto mt-2 max-w-xs text-sm text-muted">
                Seu coach de nutrição com IA. Ele conhece seu perfil, sua meta e o que
                você comeu hoje.
              </p>
              <div className="mt-8 grid gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="card-soft btn-3d-soft rounded-2xl px-4 py-3 text-left text-sm font-semibold transition hover:border-primary/40"
                  >
                    "{s}"
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} animate-fade`}>
                {m.role === "assistant" && (
                  <CucaAvatar className="mr-2 size-9 self-end" />
                )}
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "rounded-br-md bg-primary text-white"
                      : "card-soft rounded-bl-md text-foreground"
                  }`}
                >
                  {m.content || (streaming && i === messages.length - 1 ? (
                    <span className="text-shimmer font-semibold">O Cuca está pensando…</span>
                  ) : "")}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="sticky bottom-24 pb-4 pt-2 bg-gradient-to-t from-background via-background to-transparent">
          <div className="card-soft flex items-end gap-2 rounded-2xl p-2">
            <textarea
              ref={inputRef}
              rows={1}
              placeholder="Pergunte ao Cuca…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              className="max-h-40 flex-1 resize-none bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted"
              disabled={streaming}
            />
            <button
              onClick={() => send(input)}
              disabled={streaming || !input.trim()}
              className="btn-3d grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-white transition disabled:opacity-40"
            >
              <Send className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
