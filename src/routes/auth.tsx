import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, useSearch, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { loadProfile } from "@/lib/profile";
import { Loader2, ArrowLeft, ShieldCheck } from "lucide-react";
import { definirPerfil, meuPerfil, vincularPorSlug } from "@/lib/perfil.functions";
import { profissionalPorSlug } from "@/lib/publico.functions";

type Tipo = "consumidor" | "nutricionista" | "personal" | "academia";
type OAuthPendente = { tipo: Tipo; convite?: string };
const OAUTH_PENDENTE = "nutri-ia:oauth-pendente";

// Traduz os erros mais comuns do Supabase Auth para mensagens claras.
function mensagemDeErro(err: unknown) {
  const code = (err as { code?: string })?.code;
  const msg = err instanceof Error ? err.message : "";
  if (code === "email_not_confirmed" || /email not confirmed/i.test(msg))
    return "Confirme seu e-mail antes de entrar: abra o link que enviamos (veja também o spam).";
  if (code === "invalid_credentials" || /invalid login credentials/i.test(msg))
    return "E-mail ou senha incorretos.";
  if (code === "user_already_exists" || /already registered/i.test(msg))
    return "Este e-mail já tem conta. Use \"Já tenho conta — entrar\".";
  if (code === "weak_password" || /password should be/i.test(msg))
    return "Senha fraca: use pelo menos 6 caracteres.";
  if (code === "over_email_send_rate_limit" || /rate limit/i.test(msg))
    return "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente de novo.";
  return msg || "Não foi possível continuar.";
}

// Confere se o login com Google está ativado no Supabase antes de redirecionar.
async function googleAtivo() {
  const url = import.meta.env["VITE_SUPABASE_URL"];
  const key = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
  try {
    const resp = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } });
    if (!resp.ok) return true;
    const json = (await resp.json()) as { external?: { google?: boolean } };
    return json.external?.google !== false;
  } catch {
    return true;
  }
}

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar na Nutri IA — sua conta na nuvem" },
      {
        name: "description",
        content:
          "Crie sua conta Nutri IA como pessoa, nutricionista, personal trainer ou academia e acesse seus dados em qualquer aparelho.",
      },
      { property: "og:title", content: "Entrar na Nutri IA" },
      { property: "og:description", content: "Acesse o Nutri IA como consumidor, profissional ou academia." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>) => {
    const out: { convite?: string; perfil?: string; modo?: "entrar" | "criar" } = {};
    if (search["modo"] === "entrar" || search["modo"] === "criar") out.modo = search["modo"];
    if (typeof search["convite"] === "string") out.convite = search["convite"];
    if (typeof search["perfil"] === "string") out.perfil = search["perfil"];
    return out;
  },
  component: AuthPage,
});

export function destinoPorTipo(tipo: string | undefined) {
  if (tipo === "nutricionista" || tipo === "personal") return "/profissional/painel";
  if (tipo === "academia") return "/academia/painel";
  return "/dashboard";
}

function AuthPage() {
  const navigate = useNavigate();
  const { convite: conviteAtual, perfil: perfilInicial, modo: modoInicial } = useSearch({ from: "/auth" });
  const [modo, setModo] = useState<"entrar" | "criar">(modoInicial ?? "criar");
  const [tipoEscolhido, setTipo] = useState<Tipo>(
    perfilInicial === "nutricionista" || perfilInicial === "personal" || perfilInicial === "academia"
      ? (perfilInicial as Tipo)
      : "consumidor",
  );
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [aceite, setAceite] = useState(false);
  const [loading, setLoading] = useState(false);
  const [convidadoPor, setConvidadoPor] = useState<{ nome: string; tipo: string } | null>(null);

  useEffect(() => {
    if (!conviteAtual) return;
    void profissionalPorSlug({ data: { slug: conviteAtual } }).then((p) => {
      if (p) setConvidadoPor({ nome: p.nome, tipo: p.tipo });
    });
  }, [conviteAtual]);

  async function aposSessao(pendente?: OAuthPendente) {
    const tipo = pendente?.tipo ?? tipoEscolhido;
    const convite = pendente ? pendente.convite : conviteAtual;
    const info = await meuPerfil();
    let destinoTipo = info.perfil?.tipo_perfil as string | undefined;

    if (!info.perfil || (!info.consumidor && !info.profissional && !info.academia)) {
      await definirPerfil({
        data: { tipo, nome: nome || email.split("@")[0] || "Usuário" },
      });
      destinoTipo = tipo;
    }

    if (convite && destinoTipo === "consumidor") {
      try {
        await vincularPorSlug({ data: { slug: convite, consentimento: true } });
        toast.success("Vínculo criado com seu profissional.");
      } catch {
        toast.error("Não foi possível criar o vínculo com o profissional.");
      }
    }

    let destino = destinoPorTipo(destinoTipo);
    if (destino === "/dashboard") {
      // Traz perfil e registros da nuvem; sem perfil salvo, a pessoa faz o onboarding uma vez.
      const { sincronizarAgora } = await import("@/lib/cloud-sync");
      await sincronizarAgora();
      if (!loadProfile()) destino = "/onboarding";
    }
    await navigate({ to: destino as string });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (modo === "criar" && conviteAtual && !aceite) {
      toast.error("Confirme o compartilhamento de dados com o profissional.");
      return;
    }
    setLoading(true);
    try {
      if (modo === "criar") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password: senha,
          options: {
            emailRedirectTo: window.location.origin + "/auth",
            data: { nome, tipo_perfil: tipoEscolhido },
          },
        });
        if (error) throw error;
        if (!data.session) {
          toast.success("Conta criada! Confirme o e-mail que enviamos para entrar.");
          setModo("entrar");
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
        if (error) throw error;
      }
      await aposSessao();
    } catch (err) {
      toast.error(mensagemDeErro(err));
    } finally {
      setLoading(false);
    }
  }

  async function onGoogle() {
    setLoading(true);
    try {
      if (!(await googleAtivo())) {
        toast.error("O login com Google ainda não está disponível. Use e-mail e senha.");
        setLoading(false);
        return;
      }
      // O Google redireciona de volta para /auth; guardamos as escolhas da tela para concluir o cadastro.
      const pendente: OAuthPendente = { tipo: tipoEscolhido, convite: conviteAtual };
      try {
        sessionStorage.setItem(OAUTH_PENDENTE, JSON.stringify(pendente));
      } catch {
        /* sem sessionStorage: segue com o tipo padrão */
      }
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin + "/auth" },
      });
      if (error) {
        toast.error("Não foi possível entrar com Google.");
        setLoading(false);
      }
    } catch {
      toast.error("Não foi possível entrar com Google.");
      setLoading(false);
    }
  }

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (!data.session) return;
      let pendente: OAuthPendente | undefined;
      try {
        const bruto = sessionStorage.getItem(OAUTH_PENDENTE);
        if (bruto) pendente = JSON.parse(bruto) as OAuthPendente;
        sessionStorage.removeItem(OAUTH_PENDENTE);
      } catch {
        pendente = undefined;
      }
      // Volta do login com Google: conclui o cadastro com as escolhas feitas antes do redirecionamento.
      if (pendente) {
        setLoading(true);
        void aposSessao(pendente)
          .catch(() => toast.error("Não foi possível concluir o login com Google."))
          .finally(() => setLoading(false));
        return;
      }
      void meuPerfil().then(async (info) => {
        if (info.perfil && (info.consumidor || info.profissional || info.academia)) {
          let destino = destinoPorTipo(info.perfil.tipo_perfil);
          if (destino === "/dashboard") {
            const { sincronizarAgora } = await import("@/lib/cloud-sync");
            await sincronizarAgora();
            if (!loadProfile()) destino = "/onboarding";
          }
          void navigate({ to: destino as string });
        }
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const perfis: { id: Tipo; label: string; desc: string }[] = [
    { id: "consumidor", label: "Para mim", desc: "Quero acompanhar minha alimentação" },
    { id: "nutricionista", label: "Nutricionista", desc: "Atendo pacientes" },
    { id: "personal", label: "Personal trainer", desc: "Acompanho alunos" },
    { id: "academia", label: "Academia", desc: "Gerencio uma unidade" },
  ];

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-10">
        <Link to="/" className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-foreground">
          <ArrowLeft className="size-4" /> Voltar
        </Link>

        {convidadoPor && (
          <div className="mb-6 rounded-2xl border border-border bg-primary-soft p-4">
            <p className="font-mono text-[10px] uppercase tracking-widest text-primary">Convite</p>
            <p className="mt-1 text-sm font-bold">Você foi convidado por {convidadoPor.nome}</p>
            <p className="mt-1 text-xs text-muted">
              {convidadoPor.tipo === "personal" ? "Personal trainer" : "Nutricionista"} — ao aceitar, seus registros
              ficam visíveis para acompanhamento profissional.
            </p>
          </div>
        )}

        <h1 className="text-3xl font-extrabold tracking-tight">
          {modo === "criar" ? "Criar sua conta" : "Entrar"}
        </h1>
        <p className="mt-2 text-sm text-muted">
          Seus dados passam a ficar salvos na nuvem e sincronizados entre aparelhos.
        </p>

        {modo === "criar" && (
          <div className="mt-6 grid grid-cols-2 gap-2">
            {perfis.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setTipo(p.id)}
                className={`rounded-2xl border p-3 text-left transition ${
                  tipoEscolhido === p.id ? "border-primary bg-primary-soft" : "border-border bg-card hover:border-primary/40"
                }`}
              >
                <p className="text-sm font-bold">{p.label}</p>
                <p className="mt-0.5 text-[11px] leading-tight text-muted">{p.desc}</p>
              </button>
            ))}
          </div>
        )}

        <form onSubmit={onSubmit} className="mt-6 space-y-3">
          {modo === "criar" && (
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Seu nome"
              required
              className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-primary"
            />
          )}
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-mail"
            required
            className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-primary"
          />
          <input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="Senha"
            required
            minLength={6}
            className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-primary"
          />

          {modo === "criar" && conviteAtual && (
            <label className="flex items-start gap-2 rounded-xl border border-border bg-card p-3 text-xs text-muted">
              <input
                type="checkbox"
                checked={aceite}
                onChange={(e) => setAceite(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                Autorizo o compartilhamento dos meus dados de saúde (peso, refeições, medidas) com o profissional que
                me convidou. Posso encerrar esse vínculo quando quiser.
              </span>
            </label>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-5 py-3 text-sm font-semibold text-background disabled:opacity-60"
          >
            {loading && <Loader2 className="size-4 animate-spin" />}
            {modo === "criar" ? "Criar conta" : "Entrar"}
          </button>
        </form>

        <button
          type="button"
          onClick={onGoogle}
          disabled={loading}
          className="mt-3 w-full rounded-xl border border-border bg-card px-5 py-3 text-sm font-semibold hover:border-primary/40 disabled:opacity-60"
        >
          Continuar com Google
        </button>

        <button
          type="button"
          onClick={() => setModo(modo === "criar" ? "entrar" : "criar")}
          className="mt-6 text-center text-sm text-muted hover:text-foreground"
        >
          {modo === "criar" ? "Já tenho conta — entrar" : "Não tenho conta — criar agora"}
        </button>

        <p className="mt-8 flex items-start gap-2 text-[11px] leading-relaxed text-muted">
          <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
          Dados de saúde são sensíveis: só ficam visíveis para você e, se você autorizar, para o profissional
          vinculado.
        </p>
      </div>
    </main>
  );
}
