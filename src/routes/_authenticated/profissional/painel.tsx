import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Copy, UserPlus, Activity, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ProShell } from "@/components/pro-shell";
import { listarPacientes, meuPerfil, convidarPacienteManual } from "@/lib/perfil.functions";

export const Route = createFileRoute("/_authenticated/profissional/painel")({
  component: Painel,
});

function Painel() {
  const perfilFn = useServerFn(meuPerfil);
  const pacientesFn = useServerFn(listarPacientes);
  const convidarFn = useServerFn(convidarPacienteManual);
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [enviando, setEnviando] = useState(false);

  const perfil = useQuery({ queryKey: ["meu-perfil"], queryFn: () => perfilFn({}) });
  const pacientes = useQuery({ queryKey: ["pacientes"], queryFn: () => pacientesFn({}) });

  const slug = perfil.data?.profissional?.link_slug;
  const link = slug ? `${typeof window !== "undefined" ? window.location.origin : ""}/convite/${slug}` : "";

  async function convidar() {
    if (!email) return;
    setEnviando(true);
    try {
      const r = await convidarFn({ data: { email } });
      toast[r.ok ? "success" : "error"](r.motivo);
      if (r.ok) {
        setEmail("");
        void queryClient.invalidateQueries({ queryKey: ["pacientes"] });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao convidar.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <ProShell
      title="Meus pacientes"
      subtitle="Acompanhamento em tempo real de quem está vinculado a você."
    >
      <section className="rounded-[28px] border border-border bg-card p-5">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Seu link de convite</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <code className="flex-1 truncate rounded-xl bg-secondary px-3 py-2 text-xs">{link || "—"}</code>
          <button
            onClick={() => {
              void navigator.clipboard.writeText(link);
              toast.success("Link copiado.");
            }}
            disabled={!link}
            className="inline-flex items-center gap-1.5 rounded-xl bg-foreground px-4 py-2 text-xs font-semibold text-background disabled:opacity-50"
          >
            <Copy className="size-3.5" /> Copiar
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-mail de quem já usa o app"
            className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <button
            onClick={convidar}
            disabled={enviando}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-xs font-semibold hover:border-primary/40 disabled:opacity-50"
          >
            {enviando ? <Loader2 className="size-3.5 animate-spin" /> : <UserPlus className="size-3.5" />}
            Vincular manualmente
          </button>
        </div>
      </section>

      <div className="mt-6 space-y-3">
        {pacientes.isLoading && <p className="text-sm text-muted">Carregando pacientes…</p>}
        {pacientes.data?.length === 0 && (
          <div className="rounded-[28px] border border-dashed border-border p-10 text-center">
            <Activity className="mx-auto size-6 text-muted" />
            <p className="mt-3 text-sm font-semibold">Nenhum paciente vinculado ainda</p>
            <p className="mt-1 text-xs text-muted">Compartilhe seu link de convite para começar.</p>
          </div>
        )}
        {pacientes.data?.map((p) => (
          <Link
            key={p.vinculoId}
            to="/profissional/paciente/$id"
            params={{ id: p.pacienteId }}
            className="flex items-center gap-4 rounded-[24px] border border-border bg-card p-4 transition hover:border-primary/40"
          >
            <div className="grid size-11 shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-bold text-primary">
              {p.nome.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{p.nome}</p>
              <p className="mt-0.5 text-xs text-muted">
                {p.consentido
                  ? p.diasSemRegistro === null
                    ? "Sem registros ainda"
                    : p.diasSemRegistro === 0
                      ? "Registrou hoje"
                      : `${p.diasSemRegistro} dia(s) sem registrar`
                  : "Aguardando consentimento do paciente"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-extrabold tabular-nums">{p.consistenciaSemana}%</p>
              <p className="font-mono text-[9px] uppercase tracking-widest text-muted">semana</p>
            </div>
          </Link>
        ))}
      </div>
    </ProShell>
  );
}
