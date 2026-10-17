import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Salad, Stethoscope, ArrowRight } from "lucide-react";
import { loadProfile } from "@/lib/profile";
import { meuPerfil } from "@/lib/perfil.functions";
import { destinoPorTipo } from "./auth";
import { Cuca, Logo, Squiggle } from "@/components/brand";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ValeFit — nutrição com IA e o Cuca do seu lado" },
      {
        name: "description",
        content:
          "Registre refeições em 15 segundos, receba metas personalizadas e converse com uma IA que conhece seu histórico, hábitos e objetivos.",
      },
      { property: "og:title", content: "ValeFit — nutricionista com IA, 24h" },
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
        <div className="text-center">
          <Cuca pose="rosto" decorative className="animate-cuca mx-auto w-24" />
          <p className="text-shimmer mt-3 text-sm font-bold">Carregando…</p>
        </div>
      </div>
    );

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-xl flex-col px-6 py-8">
        <header className="flex items-center justify-between animate-reveal">
          <Logo className="text-primary" />
          <Link to="/auth" search={{ modo: "entrar" }} className="text-sm font-extrabold text-primary">
            Entrar
          </Link>
        </header>

        <section className="mt-8 text-center animate-reveal [animation-delay:100ms]">
          <div className="relative mx-auto w-fit">
            <div className="absolute inset-x-6 bottom-0 top-10 rounded-full bg-brand-lime/50 blur-2xl" />
            <Cuca pose="joia" className="animate-cuca relative w-64 sm:w-72" />
          </div>
          <div className="relative -mt-2 rounded-[28px] bg-brand-deep px-6 pb-7 pt-6 text-white">
            <p className="text-sm font-bold text-brand-lime">Oi! Eu sou o Cuca 🐊</p>
            <h1 className="mt-2 text-balance text-3xl font-black leading-tight sm:text-4xl">
              Pequenos hábitos hoje, grandes resultados amanhã.
            </h1>
            <p className="mx-auto mt-3 max-w-sm text-pretty text-[15px] leading-relaxed text-white/80">
              Registre refeições por texto, voz ou foto. Eu calculo calorias e macros, te dou missões diárias
              e acompanho sua evolução, como uma nutricionista no seu bolso.
            </p>
          </div>
        </section>

        <section className="mt-8 flex-1 animate-reveal [animation-delay:200ms]">
          <p className="mb-3 text-center text-sm font-extrabold text-foreground">Quem é você?</p>
          <div className="space-y-3">
            <Link
              to="/onboarding"
              className="btn-3d group flex items-center gap-4 rounded-[22px] bg-primary p-5 text-white"
            >
              <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/15">
                <Salad className="size-6" strokeWidth={2.25} />
              </div>
              <div className="flex-1">
                <h3 className="font-extrabold">Quero acompanhar minha alimentação</h3>
                <p className="mt-0.5 text-sm text-white/80">Metas automáticas, registro por IA e missões diárias.</p>
              </div>
              <ArrowRight className="size-5 transition group-hover:translate-x-1" />
            </Link>

            <Link
              to="/nutricionista"
              className="card-soft btn-3d-soft group flex items-center gap-4 rounded-[22px] p-5"
            >
              <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-lime/60 text-brand-deep">
                <Stethoscope className="size-6" strokeWidth={2.25} />
              </div>
              <div className="flex-1">
                <h3 className="font-extrabold">Sou nutricionista</h3>
                <p className="mt-0.5 text-sm text-muted">Gestão de pacientes, dietas e IA personalizada.</p>
              </div>
              <ArrowRight className="size-5 text-muted transition group-hover:translate-x-1 group-hover:text-primary" />
            </Link>
          </div>
        </section>

        <p className="mt-8 text-center text-sm text-muted animate-reveal [animation-delay:250ms]">
          Já tem conta?{" "}
          <Link to="/auth" search={{ modo: "entrar" }} className="font-extrabold text-primary underline-offset-2 hover:underline">
            Entrar
          </Link>
        </p>

        <footer className="mt-8 flex items-center justify-between text-xs text-muted animate-reveal [animation-delay:300ms]">
          <Squiggle className="w-10 text-brand-leaf" />
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
