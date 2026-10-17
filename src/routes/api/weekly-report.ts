import { createFileRoute } from "@tanstack/react-router";
import { streamText } from "ai";
import { getAiModel } from "@/lib/ai-gateway.server";

interface Body {
  profile?: unknown;
  targets?: unknown;
  stats?: unknown;
  patterns?: unknown;
  projection?: unknown;
  mode?: "weekly" | "decision";
  question?: string;
}

const WEEKLY_SYSTEM = `Você é o Cuca, coach de nutrição do ValeFit, com o conhecimento de uma nutricionista brasileira. Escreva o RELATÓRIO SEMANAL do usuário em português do Brasil.

Formato obrigatório (markdown, curto e direto):
## O que aconteceu
2 a 3 frases usando números reais da semana.
## O que funcionou
2 bullets.
## O que atrapalhou
2 bullets, sem julgamento moral.
## Foco da próxima semana
Exatamente 3 ações concretas e mensuráveis (ex: "Adicionar 25g de proteína no café da manhã").

Regras: nunca invente dados; use apenas os números fornecidos. Máximo 200 palavras. Tom acolhedor, técnico e motivador — como uma nutricionista que conhece a pessoa.`;

const DECISION_SYSTEM = `Você é o Cuca, coach de nutrição do ValeFit, em MODO DECISÓRIO: o usuário quer uma resposta objetiva, não uma aula.

Regras:
- Comece com um veredito de uma linha em negrito ("**Pode sim.**", "**Melhor não hoje.**", "**Dá, com um ajuste.**").
- Depois, no máximo 3 bullets curtos com o porquê usando os números reais dele (kcal restantes, proteína, água).
- Se recomendar substituição, dê UMA alternativa concreta com estimativa de kcal.
- Máximo 90 palavras. Português do Brasil.`;

export const Route = createFileRoute("/api/weekly-report")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const model = getAiModel();
        if (!model) return new Response("Missing AI_API_KEY", { status: 500 });

        const body = (await request.json().catch(() => ({}))) as Body;

        const context = [
          body.profile ? `Perfil: ${JSON.stringify(body.profile)}` : "",
          body.targets ? `Metas: ${JSON.stringify(body.targets)}` : "",
          body.stats ? `Dados da semana: ${JSON.stringify(body.stats)}` : "",
          body.patterns ? `Padrões detectados: ${JSON.stringify(body.patterns)}` : "",
          body.projection ? `Projeção: ${JSON.stringify(body.projection)}` : "",
          body.question ? `Pergunta do usuário: ${body.question}` : "",
        ]
          .filter(Boolean)
          .join("\n");

        const result = streamText({
          model,
          system: body.mode === "decision" ? DECISION_SYSTEM : WEEKLY_SYSTEM,
          messages: [{ role: "user", content: context || "Sem dados suficientes." }],
          temperature: 0.5,
        });

        return result.toTextStreamResponse();
      },
    },
  },
});
