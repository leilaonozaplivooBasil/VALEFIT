import { createFileRoute, Link } from "@tanstack/react-router";
import { Stethoscope, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/nutricionista")({
  head: () => ({
    meta: [
      { title: "ValeFit para Nutricionistas — em breve" },
      { name: "description", content: "Painel profissional para nutricionistas: gestão de pacientes, dietas e IA personalizada com sua filosofia." },
      { property: "og:title", content: "ValeFit para Nutricionistas" },
      { property: "og:description", content: "Painel profissional em breve." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: NutriPro,
});

function NutriPro() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-xl flex-col px-6 py-10">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-foreground">
          <ArrowLeft className="size-4" /> Voltar
        </Link>

        <div className="mt-16 animate-reveal">
          <div className="grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary">
            <Stethoscope className="size-6" />
          </div>
          <p className="mt-8 font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
            ValeFit Pro
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Sua ferramenta profissional está a caminho.
          </h1>
          <p className="mt-4 text-pretty text-base leading-relaxed text-muted">
            Painel de pacientes, dietas inteligentes, IA que segue a sua filosofia
            clínica, programa de parceria com comissão recorrente e relatórios
            avançados. Em breve.
          </p>

          <div className="mt-10 grid gap-3 sm:grid-cols-2">
            {[
              { t: "Pacientes ilimitados", d: "Dashboard com peso, fotos, consistência e macros por paciente." },
              { t: "IA da sua clínica", d: "Configure a filosofia e a IA responde no seu tom." },
              { t: "Dietas + importação", d: "Crie, edite ou importe PDFs/fotos — a IA interpreta." },
              { t: "Programa de parceria", d: "Link exclusivo e comissão recorrente por assinatura." },
            ].map((f) => (
              <div key={f.t} className="rounded-2xl border border-border bg-card p-4">
                <p className="text-sm font-bold">{f.t}</p>
                <p className="mt-1 text-xs text-muted">{f.d}</p>
              </div>
            ))}
          </div>

          <a
            href="mailto:contato@nutriia.app?subject=Quero%20fazer%20parte%20do%20Nutri%20IA%20Pro"
            className="mt-10 inline-flex items-center justify-center rounded-xl bg-foreground px-5 py-3 text-sm font-semibold text-background hover:opacity-90"
          >
            Entrar na lista de espera
          </a>
        </div>
      </div>
    </main>
  );
}
