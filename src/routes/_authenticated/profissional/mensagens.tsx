import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Sparkles, Check, X } from "lucide-react";
import { ProShell } from "@/components/pro-shell";
import { listarSugestoes, atualizarSugestao, gerarSugestoes } from "@/lib/perfil.functions";

export const Route = createFileRoute("/_authenticated/profissional/mensagens")({
  component: Mensagens,
});

function Mensagens() {
  const listar = useServerFn(listarSugestoes);
  const atualizar = useServerFn(atualizarSugestao);
  const gerar = useServerFn(gerarSugestoes);
  const queryClient = useQueryClient();
  const [gerando, setGerando] = useState(false);
  const [rascunhos, setRascunhos] = useState<Record<string, string>>({});

  const q = useQuery({ queryKey: ["sugestoes"], queryFn: () => listar({}) });

  async function onGerar() {
    setGerando(true);
    try {
      const r = await gerar({});
      toast.success(r.criadas ? `${r.criadas} sugestão(ões) criada(s).` : "Nenhum gatilho novo agora.");
      await queryClient.invalidateQueries({ queryKey: ["sugestoes"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao gerar sugestões.");
    } finally {
      setGerando(false);
    }
  }

  async function agir(id: string, acao: "aprovar" | "descartar" | "salvar") {
    try {
      const texto = rascunhos[id];
      await atualizar({ data: texto !== undefined ? { id, acao, texto } : { id, acao } });
      toast.success(acao === "aprovar" ? "Mensagem enviada ao paciente." : "Atualizado.");
      await queryClient.invalidateQueries({ queryKey: ["sugestoes"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha na ação.");
    }
  }

  const pendentes = (q.data ?? []).filter((s) => s.status === "pendente" || s.status === "editado");
  const historico = (q.data ?? []).filter((s) => s.status !== "pendente" && s.status !== "editado");

  return (
    <ProShell
      title="Mensagens sugeridas"
      subtitle="A IA escreve o rascunho. Nada é enviado sem sua aprovação."
      action={
        <button
          onClick={onGerar}
          disabled={gerando}
          className="inline-flex items-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-xs font-semibold text-background disabled:opacity-60"
        >
          {gerando ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
          Gerar sugestões
        </button>
      }
    >
      {q.isLoading && <p className="text-sm text-muted">Carregando…</p>}
      {!q.isLoading && !pendentes.length && (
        <div className="rounded-[28px] border border-dashed border-border p-10 text-center">
          <p className="text-sm font-semibold">Nenhuma sugestão pendente</p>
          <p className="mt-1 text-xs text-muted">
            Gere novas sugestões a partir dos gatilhos dos seus pacientes.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {pendentes.map((s) => (
          <article key={s.id} className="rounded-[24px] border border-border bg-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-bold">{s.pacienteNome}</p>
              <span className="rounded-full bg-primary-soft px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-primary">
                {s.tipo.replace("_", " ")}
              </span>
            </div>
            {s.contexto && <p className="mt-1 text-xs text-muted">{s.contexto}</p>}
            <textarea
              value={rascunhos[s.id] ?? s.texto_gerado}
              onChange={(e) => setRascunhos({ ...rascunhos, [s.id]: e.target.value })}
              rows={3}
              className="mt-3 w-full resize-none rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-primary"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => agir(s.id, "aprovar")}
                className="inline-flex items-center gap-1.5 rounded-xl bg-foreground px-4 py-2 text-xs font-semibold text-background"
              >
                <Check className="size-3.5" /> Aprovar e enviar
              </button>
              <button
                onClick={() => agir(s.id, "salvar")}
                className="rounded-xl border border-border px-4 py-2 text-xs font-semibold hover:border-primary/40"
              >
                Salvar rascunho
              </button>
              <button
                onClick={() => agir(s.id, "descartar")}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-xs font-semibold text-muted hover:text-foreground"
              >
                <X className="size-3.5" /> Descartar
              </button>
            </div>
          </article>
        ))}
      </div>

      {historico.length > 0 && (
        <section className="mt-8">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Histórico</p>
          <div className="mt-3 space-y-2">
            {historico.map((s) => (
              <div key={s.id} className="rounded-xl border border-border bg-card px-4 py-3 text-xs">
                <div className="flex justify-between gap-3">
                  <span className="font-semibold">{s.pacienteNome}</span>
                  <span className="text-muted">{s.status}</span>
                </div>
                <p className="mt-1 text-muted">{s.texto_gerado}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </ProShell>
  );
}
