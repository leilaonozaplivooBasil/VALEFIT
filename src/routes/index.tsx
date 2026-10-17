import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Salad, Stethoscope, ArrowRight } from "lucide-react";
import { loadProfile } from "@/lib/profile";
import { meuPerfil } from "@/lib/perfil.functions";
import { destinoPorTipo } from "./auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nutri IA — sua nutricionista com IA, 24h por dia" },
      {
        name: "description",
        content:
          "Registre refeições em 15 segundos, receba metas personalizadas e converse com uma IA que conhece seu histórico, hábitos e objetivos.",
      },
      { property: "og:title", content: "Nutri IA — nutricionista com IA, 24h" },
      { property: "og:description", content: "Acompanhamento nutricional inteligente por IA. Emagreça, ganhe massa ou mantenha o peso." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Welcome,
});

function Welcome() {
  const navigate = useNavigate();
  const [verificando, setVerificando] = useState(true);

  useEffect(() => {
    if (loadProfile()) {
      navigate({ to: "/dashboard", replace: true });
      return;
    }
    // Sem perfil neste aparelho: se a pessoa já tem conta, traz os dados da nuvem.
    void (async () => {
      try {
        const { sincronizarAgora } = await import("@/lib/cloud-sync");
        const { supabase } = await import("@/integrations/supabase/client");
        const { data } = await supabase.auth.getSession();
        if (!data.session) return;
        await sincronizarAgora();
        if (loadProfile()) {
          navigate({ to: "/dashboard", replace: true });
          return;
        }
        const info = await meuPerfil();
        const tipo = info.perfil?.tipo_perfil;
        navigate({
          to: (tipo && tipo !== "consumidor" ? destinoPorTipo(tipo) : "/onboarding") as string,
          replace: true,
        });
      } catch (err) {
        console.warn("[welcome] não foi possível verificar a conta", err);
      } finally {
        setVerificando(false);
      }
    })();
  }, [navigate]);

  if (verificando)
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <p className="text-shimmer text-sm font-semibold">Carregando…</p>
      </div>
    );

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-xl flex-col px-6 py-10">
        <header className="flex items-center gap-2 animate-reveal">
          <div className="grid size-9 place-items-center rounded-lg bg-primary">
            <div className="size-2.5 rounded-full bg-white" />
          </div>
          <span className="text-xl font-extrabold tracking-tight">Nutri IA</span>
        </header>

        <section className="mt-16 animate-reveal [animation-delay:100ms]">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
            Bem-vindo
          </p>
          <h1 className="mt-3 text-balance text-4xl font-extrabold tracking-tight sm:text-5xl">
            Nutrição inteligente,
            <br />
            <span className="text-primary">sem esforço.</span>
          </h1>
          <p className="mt-5 max-w-md text-pretty text-base leading-relaxed text-muted">
            Registre refeições por texto, voz ou foto. A IA calcula calorias, macros
            e acompanha sua evolução — como uma nutricionista disponível 24 horas.
          </p>
        </section>

        <section className="mt-14 flex-1 animate-reveal [animation-delay:200ms]">
          <p className="mb-4 text-sm font-semibold text-foreground">Quem é você?</p>
          <div className="space-y-3">
            <Link
              to="/onboarding"
              className="group flex items-center gap-4 rounded-3xl border border-border bg-card p-5 transition hover:border-primary hover:shadow-lg"
            >
              <div className="grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary">
                <Salad className="size-6" strokeWidth={2} />
              </div>
              <div className="flex-1">
                <h3 className="font-bold">Quero acompanhar minha alimentação</h3>
                <p className="mt-0.5 text-sm text-muted">
                  Metas automáticas, registro por IA e evolução visual.
                </p>
              </div>
              <ArrowRight className="size-5 text-muted transition group-hover:translate-x-1 group-hover:text-primary" />
            </Link>

            <Link
              to="/nutricionista"
              className="group flex items-center gap-4 rounded-3xl border border-border bg-card p-5 transition hover:border-foreground hover:shadow-lg"
            >
              <div className="grid size-14 place-items-center rounded-2xl bg-secondary text-foreground">
                <Stethoscope className="size-6" strokeWidth={2} />
              </div>
              <div className="flex-1">
                <h3 className="font-bold">Sou nutricionista</h3>
                <p className="mt-0.5 text-sm text-muted">
                  Gestão de pacientes, dietas e IA personalizada (em breve).
                </p>
              </div>
              <ArrowRight className="size-5 text-muted transition group-hover:translate-x-1" />
            </Link>
          </div>
        </section>

        <p className="mt-8 text-center text-sm text-muted animate-reveal [animation-delay:250ms]">
          Já tem conta?{" "}
          <Link to="/auth" search={{ modo: "entrar" }} className="font-semibold text-foreground underline">
            Entrar
          </Link>
        </p>

        <footer className="mt-10 flex items-center justify-between text-xs text-muted animate-reveal [animation-delay:300ms]">
          <span className="font-mono uppercase tracking-widest">
            v1 · Precision Health
          </span>
          <span className="flex gap-3">
            <Link to="/privacidade" className="underline">
              Privacidade
            </Link>
            <Link to="/termos" className="underline">
              Termos
            </Link>
          </span>
        </footer>
      </div>
    </main>
  );
}
