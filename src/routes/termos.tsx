import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/termos")({
  head: () => ({
    meta: [
      { title: "Termos de Uso — VALEFIT" },
      { name: "description", content: "Regras de uso do VALEFIT (Nutri IA)." },
    ],
  }),
  component: Termos,
});

const secoes: { titulo: string; texto: string[] }[] = [
  {
    titulo: "1. Aceitação",
    texto: [
      "Ao criar uma conta ou usar o VALEFIT (Nutri IA), você concorda com estes Termos de Uso e com a nossa Política de Privacidade (valefit-eight.vercel.app/privacidade).",
    ],
  },
  {
    titulo: "2. O que o app oferece",
    texto: [
      "Registro de refeições, água, treinos, sono e peso, metas calculadas automaticamente e um assistente de inteligência artificial (Coach IA).",
      "Profissionais (nutricionistas, personal trainers e academias) podem acompanhar as pessoas que os autorizarem.",
    ],
  },
  {
    titulo: "3. Não substitui atendimento profissional",
    texto: [
      "As informações e respostas da IA são orientações gerais e podem conter erros. Elas não substituem consulta com nutricionista, médico ou outro profissional de saúde.",
      "Procure um profissional antes de mudanças importantes na dieta ou nos treinos, especialmente se você tiver alguma condição de saúde, estiver grávida ou for menor de idade.",
    ],
  },
  {
    titulo: "4. Sua conta",
    texto: [
      "Você é responsável por manter sua senha em segurança e pelas informações que registra.",
      "É proibido usar o app para fins ilegais, tentar acessar dados de outras pessoas ou prejudicar o funcionamento do serviço.",
    ],
  },
  {
    titulo: "5. Profissionais",
    texto: [
      "Profissionais que usam o app devem ter registro válido no conselho da sua área e só podem usar os dados dos pacientes ou alunos para o acompanhamento autorizado.",
    ],
  },
  {
    titulo: "6. Disponibilidade e mudanças",
    texto: [
      "Podemos atualizar, suspender ou encerrar funções do app. Se estes termos mudarem, a nova versão será publicada nesta página.",
    ],
  },
  {
    titulo: "7. Encerramento",
    texto: [
      "Você pode parar de usar o app e pedir a exclusão da sua conta quando quiser. Contas que violem estes termos podem ser suspensas.",
    ],
  },
  {
    titulo: "8. Lei aplicável",
    texto: ["Estes termos seguem as leis do Brasil, incluindo o Código de Defesa do Consumidor e a LGPD."],
  },
];

function Termos() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-6 py-10">
        <Link to="/" className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-foreground">
          <ArrowLeft className="size-4" /> Início
        </Link>
        <h1 className="text-3xl font-extrabold tracking-tight">Termos de Uso</h1>
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
