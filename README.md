# ValeFit

App de acompanhamento nutricional com IA: registro de refeições por texto, voz e foto, Coach IA,
gamificação e painel do profissional (nutricionista/personal).

React 19 + TypeScript + TanStack Start + Tailwind CSS v4, com Supabase (banco e login).

## Rodar localmente

```sh
npm install
cp .env.example .env   # preencha as chaves
npm run dev
```

## Variáveis de ambiente

Veja `.env.example`:

- `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`: projeto Supabase.
- `SUPABASE_SERVICE_ROLE_KEY`: chave secreta, usada só no servidor para registrar comissões.
- `AI_API_KEY`: chave de um provedor de IA compatível com a API da OpenAI. Por padrão usa o Google Gemini
  (`AI_BASE_URL` e `AI_MODEL` permitem trocar).

## Banco de dados

As migrations ficam em `supabase/migrations` e já foram aplicadas no projeto Supabase `xmlnpwhkktlrulmauehu`.

## Login com Google

Ative o provedor Google em Supabase > Authentication > Sign In / Providers, com o Client ID e o Secret do
Google Cloud. Em Authentication > URL Configuration, adicione a URL do site (e `http://localhost:3000` para
desenvolvimento) nas Redirect URLs.
