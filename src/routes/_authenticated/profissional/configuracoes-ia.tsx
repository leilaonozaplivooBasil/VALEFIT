import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { ProShell } from "@/components/pro-shell";
import { obterConfigIa, salvarConfigIa } from "@/lib/perfil.functions";

export const Route = createFileRoute("/_authenticated/profissional/configuracoes-ia")({
  component: ConfigIa,
});

const TAGS = [
  "dieta flexível",
  "sem jejum",
  "sem ultraprocessados",
  "foco em performance",
  "low carb",
  "vegetariano",
  "comida de verdade",
  "sem contagem rígida",
];

const TONS = ["acolhedor", "direto", "técnico", "motivador"];

function ConfigIa() {
  const obter = useServerFn(obterConfigIa);
  const salvar = useServerFn(salvarConfigIa);
  const q = useQuery({ queryKey: ["config-ia"], queryFn: () => obter({}) });

  const [filosofia, setFilosofia] = useState("");
  const [restricoes, setRestricoes] = useState<string[]>([]);
  const [tom, setTom] = useState("acolhedor");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!q.data) return;
    setFilosofia(q.data.filosofia_texto ?? "");
    setRestricoes(Array.isArray(q.data.restricoes) ? (q.data.restricoes as string[]) : []);
    setTom(q.data.tom_de_voz ?? "acolhedor");
  }, [q.data]);

  async function onSalvar() {
    setSalvando(true);
    try {
      await salvar({ data: { filosofia, restricoes, tom } });
      toast.success("Filosofia da IA salva.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <ProShell
      title="IA da sua clínica"
      subtitle="A IA usa essa configuração ao escrever mensagens em seu nome."
    >
      <div className="space-y-5">
        <section className="rounded-[28px] border border-border bg-card p-5">
          <p className="text-sm font-bold">Sua filosofia</p>
          <p className="mt-1 text-xs text-muted">
            Descreva como você atende: abordagem, o que evita, como fala com o paciente.
          </p>
          <textarea
            value={filosofia}
            onChange={(e) => setFilosofia(e.target.value)}
            rows={6}
            placeholder="Ex: trabalho com dieta flexível, sem proibir alimentos. Priorizo proteína e consistência acima de perfeição…"
            className="mt-3 w-full resize-none rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-primary"
          />
        </section>

        <section className="rounded-[28px] border border-border bg-card p-5">
          <p className="text-sm font-bold">Restrições obrigatórias</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {TAGS.map((t) => {
              const on = restricoes.includes(t);
              return (
                <button
                  key={t}
                  onClick={() => setRestricoes(on ? restricoes.filter((x) => x !== t) : [...restricoes, t])}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    on ? "border-primary bg-primary-soft text-primary" : "border-border text-muted hover:text-foreground"
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-[28px] border border-border bg-card p-5">
          <p className="text-sm font-bold">Tom de voz</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {TONS.map((t) => (
              <button
                key={t}
                onClick={() => setTom(t)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold capitalize transition ${
                  tom === t ? "border-primary bg-primary-soft text-primary" : "border-border text-muted hover:text-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </section>

        <button
          onClick={onSalvar}
          disabled={salvando}
          className="inline-flex items-center gap-2 rounded-xl bg-foreground px-5 py-3 text-sm font-semibold text-background disabled:opacity-60"
        >
          {salvando ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Salvar configuração
        </button>
      </div>
    </ProShell>
  );
}
