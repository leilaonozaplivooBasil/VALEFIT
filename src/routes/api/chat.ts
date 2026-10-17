import { createFileRoute } from "@tanstack/react-router";
import { streamText } from "ai";
import { getAiModel } from "@/lib/ai-gateway.server";

interface ChatMessage { role: "user" | "assistant"; content: string }

interface Body {
  messages?: ChatMessage[];
  context?: {
    profile?: unknown;
    targets?: unknown;
    totalsToday?: unknown;
    mealsToday?: unknown;
    water?: number;
  };
}

function buildSystem(ctx: Body["context"]): string {
  const parts = [
    "Você é a Nutri IA, uma nutricionista brasileira, calorosa, direta e baseada em evidências. Fala em português do Brasil, com tom acolhedor mas profissional. Nunca dá respostas genéricas: use SEMPRE os dados abaixo do usuário.",
    "Seja concisa: no máximo 4 frases curtas, ou uma lista de até 4 itens. Use números do usuário quando fizer sentido (ex: quantas kcal ainda cabem hoje).",
    "Nunca invente alimentos que a pessoa não comeu. Se faltar dado, faça UMA pergunta.",
  ];
  if (ctx) {
    parts.push("\n--- Dados atuais do usuário ---");
    if (ctx.profile) parts.push(`Perfil: ${JSON.stringify(ctx.profile)}`);
    if (ctx.targets) parts.push(`Metas: ${JSON.stringify(ctx.targets)}`);
    if (ctx.totalsToday) parts.push(`Consumido hoje: ${JSON.stringify(ctx.totalsToday)}`);
    if (ctx.mealsToday) parts.push(`Refeições de hoje: ${JSON.stringify(ctx.mealsToday)}`);
    if (typeof ctx.water === "number") parts.push(`Água hoje (ml): ${ctx.water}`);
  }
  return parts.join("\n");
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const model = getAiModel();
        if (!model) return new Response("Missing AI_API_KEY", { status: 500 });

        const body = (await request.json().catch(() => ({}))) as Body;
        const messages = Array.isArray(body.messages) ? body.messages : [];
        if (!messages.length) return new Response("messages é obrigatório", { status: 400 });


        const result = streamText({
          model,
          system: buildSystem(body.context),
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          temperature: 0.6,
        });

        return result.toTextStreamResponse();
      },
    },
  },
});
