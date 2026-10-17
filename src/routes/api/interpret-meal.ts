import { createFileRoute } from "@tanstack/react-router";
import { generateText } from "ai";
import { createLovableAiGatewayProvider, DEFAULT_MODEL } from "@/lib/ai-gateway.server";

// Interpretação de refeição: recebe texto livre em português, retorna JSON estruturado.
// Não usamos Output.object porque prompts curtos + JSON simples respondem melhor
// via json_object + parse manual (evita rejeições por bounds).

interface Body {
  text?: string;
  image?: string; // data URL (foto do prato)
  category?: string;
  when?: string;
}

const SYSTEM = `Você é a Nutri IA, uma nutricionista brasileira especialista em avaliar refeições comuns do dia a dia (café da manhã, almoço, jantar, lanches, rodízios, delivery).

Sua tarefa: receber uma descrição em português informal do que a pessoa comeu e retornar uma estimativa nutricional razoável.

Regras críticas:
- Sempre responda APENAS um JSON válido, sem markdown, sem texto extra.
- Formato: {"description":string,"category":"Café da manhã"|"Lanche"|"Almoço"|"Jantar"|"Outro","kcal":number,"protein":number,"carbs":number,"fat":number,"confidence":"alta"|"média"|"baixa","clarify":string|null}
- "description" deve ser uma versão limpa e concisa (ex: "Arroz, feijão preto e filé de frango grelhado (porção média)").
- Se faltar informação essencial (quantidade, tipo específico em rodízio, tamanho de porção), preencha "clarify" com UMA única pergunta curta em português e faça a melhor estimativa possível assumindo porção média.
- Se a descrição estiver clara, "clarify" deve ser null.
- Números: kcal inteiro; macros em gramas (números inteiros).
- Nunca invente alimentos que não foram mencionados.`;

export const Route = createFileRoute("/api/interpret-meal")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const body = (await request.json().catch(() => ({}))) as Body;
        const text = body.text?.trim();
        const image = body.image?.trim();
        if (!text && !image) return new Response("text ou image é obrigatório", { status: 400 });

        const gateway = createLovableAiGatewayProvider(key);
        const model = gateway(DEFAULT_MODEL);

        const prompt = [
          body.category ? `Categoria sugerida pelo horário: ${body.category}.` : "",
          body.when ? `Horário: ${body.when}.` : "",
          image
            ? "Analise a FOTO do prato e estime o que há nele e as porções."
            : "",
          text ? `Descrição do usuário: ${text}` : "",
        ]
          .filter(Boolean)
          .join("\n");

        try {
          const { text: raw } = await generateText({
            model,
            system: SYSTEM,
            messages: [
              {
                role: "user",
                content: image
                  ? [
                      { type: "text" as const, text: prompt },
                      { type: "image" as const, image },
                    ]
                  : [{ type: "text" as const, text: prompt }],
              },
            ],
            temperature: 0.2,
          });

          // Extrai JSON mesmo se vier com fences
          const cleaned = raw
            .replace(/^```json\s*/i, "")
            .replace(/^```\s*/i, "")
            .replace(/```\s*$/i, "")
            .trim();
          const jsonStart = cleaned.indexOf("{");
          const jsonEnd = cleaned.lastIndexOf("}");
          const jsonStr = jsonStart >= 0 ? cleaned.slice(jsonStart, jsonEnd + 1) : cleaned;
          const parsed = JSON.parse(jsonStr);

          return Response.json(parsed);
        } catch (err) {
          const status = (err as { statusCode?: number })?.statusCode ?? 500;
          return new Response(
            JSON.stringify({ error: (err as Error).message || "Falha na interpretação" }),
            { status, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
