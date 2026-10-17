import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade — VALEFIT" },
      { name: "description", content: "Como o VALEFIT (Nutri IA) coleta, usa e protege seus dados." },
    ],
  }),
  component: Privacidade,
});

const secoes: { titulo: string; texto: string[] }[] = [
  {
    titulo: "1. Quem somos",
    texto: [
      "O VALEFIT (Nutri IA) é um aplicativo de acompanhamento nutricional com inteligência artificial, disponível em valefit-eight.vercel.app.",
    ],
  },
  {
    titulo: "2. Dados que coletamos",
    texto: [
      "Dados de conta: nome e e-mail. Se você entrar com Google, recebemos apenas seu nome, e-mail e foto de perfil.",
      "Dados de saúde que você informa: idade, sexo, peso, altura, objetivo, refeições, água, treinos, sono e medidas.",
      "Mensagens que você envia ao Coach IA e fotos ou áudios de refeições que você escolher enviar.",
    ],
  },
  {
    titulo: "3. Como usamos os dados",
    texto: [
      "Para calcular suas metas, registrar sua evolução, gerar respostas e relatórios da IA e sincronizar seus dados entre aparelhos.",
      "Não vendemos seus dados e não os usamos para publicidade.",
    ],
  },
  {
    titulo: "4. Com quem compartilhamos",
    texto: [
      "Com o nutricionista, personal trainer ou academia que você autorizar ao aceitar um convite. Você pode encerrar esse vínculo quando quiser.",
      "Com os serviços que fazem o app funcionar: Supabase (banco de dados e login), Vercel (hospedagem) e Google Gemini (processamento da IA). Esses serviços só tratam os dados para prestar o serviço.",
    ],
  },
  {
    titulo: "5. Seus direitos (LGPD)",
    texto: [
      "Você pode acessar, corrigir ou apagar seus dados e pedir a exclusão da sua conta a qualquer momento, pelo canal de suporte do VALEFIT.",
      "Dados de saúde são dados sensíveis e só são tratados com o seu consentimento.",
    ],
  },
  {
    titulo: "6. Segurança e guarda",
    texto: [
      "Os dados ficam em servidores com acesso restrito: cada pessoa só vê os próprios registros, e o profissional só vê os de quem o autorizou.",
      "Guardamos seus dados enquanto sua conta existir. Ao excluir a conta, os dados são apagados.",
    ],
  },
  {
    titulo: "7. Alterações",
    texto: ["Se esta política mudar, a nova versão será publicada nesta página."],
  },
];

function Privacidade() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-6 py-10">
        <Link to="/" className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-foreground">
          <ArrowLeft className="size-4" /> Início
        </Link>
        <h1 className="text-3xl font-extrabold tracking-tight">Política de Privacidade</h1>
        <p className="mt-2 text-sm text-muted">Última atualização: 17 de outubro de 2026</p>
        <div className="mt-8 space-y-8">
          {secoes.map((s) => (
            <section key={s.titulo}>
              <h2 className="text-lg font-bold">{s.titulo}</h2>
              {s.texto.map((t) => (
                <p key={t} className="mt-2 text-sm leading-relaxed text-muted">
                  {t}
                </p>
              ))}
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
