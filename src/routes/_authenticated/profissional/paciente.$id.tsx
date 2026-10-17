import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Scale, UtensilsCrossed, Droplets } from "lucide-react";
import { ProShell } from "@/components/pro-shell";
import { detalhePaciente } from "@/lib/perfil.functions";

export const Route = createFileRoute("/_authenticated/profissional/paciente/$id")({
  component: DetalhePaciente,
  errorComponent: () => (
    <ProShell title="Paciente indisponível">
      <p className="text-sm text-muted">
        Não foi possível carregar este paciente. O vínculo pode ter sido encerrado ou o consentimento ainda não foi
        dado.
      </p>
      <Link to="/profissional/painel" className="mt-4 inline-block text-sm font-semibold text-primary">
        Voltar aos pacientes
      </Link>
    </ProShell>
  ),
});

function DetalhePaciente() {
  const { id } = useParams({ from: "/_authenticated/profissional/paciente/$id" });
  const fn = useServerFn(detalhePaciente);
  const q = useQuery({ queryKey: ["paciente", id], queryFn: () => fn({ data: { pacienteId: id } }) });

  const d = q.data;
  const pesos = [...(d?.pesos ?? [])].reverse();
  const min = Math.min(...pesos.map((p) => p.kg), 999);
  const max = Math.max(...pesos.map((p) => p.kg), 0);
  const span = Math.max(1, max - min);

  return (
    <ProShell
      title={d?.perfil.nome || "Paciente"}
      subtitle={d ? `Consistência de ${d.consistenciaSemana}% nos últimos 7 dias` : "Carregando…"}
      action={
        <Link
          to="/profissional/painel"
          className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-semibold hover:border-primary/40"
        >
          <ArrowLeft className="size-3.5" /> Voltar
        </Link>
      }
    >
      {q.isLoading && <p className="text-sm text-muted">Carregando dados…</p>}

      {d && (
        <div className="grid gap-4 md:grid-cols-2">
          <section className="rounded-[28px] border border-border bg-card p-5">
            <div className="flex items-center gap-2">
              <Scale className="size-4 text-primary" />
              <p className="text-sm font-bold">Evolução de peso</p>
            </div>
            {pesos.length ? (
              <>
                <div className="mt-4 flex h-28 items-end gap-1">
                  {pesos.map((p) => (
                    <div key={p.date} className="flex-1" title={`${p.date}: ${p.kg} kg`}>
                      <div
                        className="w-full rounded-t-sm bg-primary"
                        style={{ height: `${20 + ((p.kg - min) / span) * 80}%` }}
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex justify-between text-xs text-muted">
                  <span>Inicial: {d.pesoInicial} kg</span>
                  <span className="font-bold text-foreground">Atual: {d.pesoAtual} kg</span>
                </div>
              </>
            ) : (
              <p className="mt-3 text-xs text-muted">Sem registros de peso.</p>
            )}
          </section>

          <section className="rounded-[28px] border border-border bg-card p-5">
            <div className="flex items-center gap-2">
              <Droplets className="size-4 text-primary" />
              <p className="text-sm font-bold">Hidratação (7 dias)</p>
            </div>
            <div className="mt-4 space-y-2">
              {d.aguaSemana.map((a) => (
                <div key={a.dia} className="flex items-center gap-2 text-xs">
                  <span className="w-16 shrink-0 text-muted">{a.dia.slice(5)}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.min(100, (a.ml / 3000) * 100)}%` }}
                    />
                  </div>
                  <span className="w-14 text-right tabular-nums text-muted">
                    {(a.ml / 1000).toFixed(1)}L
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-border bg-card p-5 md:col-span-2">
            <div className="flex items-center gap-2">
              <UtensilsCrossed className="size-4 text-primary" />
              <p className="text-sm font-bold">Refeições recentes</p>
            </div>
            {d.refeicoesRecentes.length ? (
              <div className="mt-4 space-y-4">
                {d.refeicoesRecentes.map((dia) => (
                  <div key={dia.dia}>
                    <p className="font-mono text-[10px] uppercase tracking-widest text-muted">{dia.dia}</p>
                    <div className="mt-2 space-y-1.5">
                      {dia.itens.map((i, idx) => (
                        <div
                          key={i.id ?? idx}
                          className="flex items-center justify-between rounded-xl bg-secondary px-3 py-2 text-xs"
                        >
                          <span className="truncate font-semibold">{i.name ?? "Refeição"}</span>
                          <span className="shrink-0 tabular-nums text-muted">
                            {i.kcal ?? 0} kcal · {i.protein ?? 0}g P
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-xs text-muted">Nenhuma refeição registrada ainda.</p>
            )}
          </section>
        </div>
      )}
    </ProShell>
  );
}
