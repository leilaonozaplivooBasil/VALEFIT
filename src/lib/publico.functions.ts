import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export const profissionalPorSlug = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ slug: z.string().min(2).max(80) }).parse(input))
  .handler(async ({ data }) => {
    const supabase = publicClient();
    const { data: rows } = await supabase.rpc("profissional_publico", { _slug: data.slug });
    const prof = rows?.[0];
    if (!prof) return null;
    return {
      nome: prof.nome,
      tipo: prof.tipo,
      especialidade: prof.especialidade,
      bio: prof.bio,
      slug: prof.link_slug,
    };
  });
