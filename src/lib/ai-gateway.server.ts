import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

// Provedor de IA compatível com a API da OpenAI, configurado por variáveis de ambiente:
//   AI_API_KEY  (obrigatória)
//   AI_BASE_URL (padrão: endpoint OpenAI-compatível do Google Gemini)
//   AI_MODEL    (padrão: gemini-2.5-flash)
export const DEFAULT_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/";
export const DEFAULT_MODEL = "gemini-2.5-flash";

export function getAiConfig() {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) return null;
  return {
    apiKey,
    baseURL: process.env.AI_BASE_URL || DEFAULT_BASE_URL,
    model: process.env.AI_MODEL || DEFAULT_MODEL,
  };
}

export function getAiModel() {
  const config = getAiConfig();
  if (!config) return null;
  const provider = createOpenAICompatible({
    name: "ai-provider",
    baseURL: config.baseURL,
    apiKey: config.apiKey,
  });
  return provider(config.model);
}
