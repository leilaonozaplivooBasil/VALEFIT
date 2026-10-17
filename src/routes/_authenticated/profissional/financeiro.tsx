import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ProShell } from "@/components/pro-shell";
import { resumoFinanceiro } from "@/lib/perfil.functions";

export const Route = createFileRoute("/_authenticated/profissional/financeiro")({
  component: Financeiro,
});

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function Financeiro() {
  const fn = useServerFn(resumoFinanceiro);
  const q = useQuery({ queryKey: ["financeiro"], queryFn: () => fn({}) });
  const d = q.data;

  return (
    <ProShell
      title="Financeiro"
      subtitle="Comissão recorrente de 15% sobre cada assinatura ativa dos seus pacientes."
    >
      {q.isLoading && <p className="text-sm text-muted">Carregando…</p>}
      {d && (
        <>
          <div className="grid gap-3 sm:grid-cols-4">
            {[
              { l: "MRR estimado", v: brl(d.mrr) },
              { l: "A receber", v: brl(d.pendente) },
              { l: "Já pago", v: brl(d.pago) },
              { l: "Pacientes ativos", v: String(d.pacientesAtivos) },
            ].map((c) => (
              <div key={c.l} className="rounded-[24px] border border-border bg-card p-5">
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted">{c.l}</p>
                <p className="mt-2 text-2xl font-extrabold tabular-nums tracking-tight">{c.v}</p>
              </div>
            ))}
          </div>

          <section className="mt-6 rounded-[28px] border border-border bg-card p-5">
            <p className="text-sm font-bold">Comissões ({d.comissoes.length})</p>
            <div className="mt-3 space-y-2">
              {d.comissoes.length === 0 && (
                <p className="text-xs text-muted">Nenhuma comissão registrada ainda.</p>
              )}
              {d.comissoes.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-xl bg-secondary px-4 py-3 text-xs"
                >
                  <div>
                    <p className="font-semibold">{c.competencia}</p>
                    <p className="capitalize text-muted">
                      {c.status} · {c.percentual}%
                    </p>
                  </div>
                  <p className="font-bold tabular-nums">{brl(c.valor)}</p>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </ProShell>
  );
}
