import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/* ---------------------------------- utils --------------------------------- */

function slugify(s: string) {
  return (
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 28) || "profissional"
  );
}

const CHAVES_SINCRONIZAVEIS = [
  "nutriia:profile:v1",
  "nutriia:meals:v1",
  "nutriia:water:v1",
  "nutriia:water-events:v1",
  "nutriia:workouts:v1",
  "nutriia:sleep:v1",
  "nutriia:weight-log:v1",
  "nutriia:streak:v1",
  "nutriia:xp:v1",
  "nutriia:challenge:v1",
  "nutriia:missions-claimed:v1",
] as const;

export const CHAVES_NUVEM: readonly string[] = CHAVES_SINCRONIZAVEIS;

function competenciaAtual() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/* --------------------------------- perfil --------------------------------- */

export const meuPerfil = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [perfil, consumidor, profissional, academia, vinculo] = await Promise.all([
      supabase.from("perfis").select("*").eq("id", userId).maybeSingle(),
      supabase.from("perfis_consumidor").select("*").eq("usuario_id", userId).maybeSingle(),
      supabase.from("perfis_profissional").select("*").eq("usuario_id", userId).maybeSingle(),
      supabase.from("perfis_academia").select("*").eq("usuario_id", userId).maybeSingle(),
      supabase
        .from("vinculos_profissional_paciente")
        .select("id, profissional_id, status, origem, consentimento_em")
        .eq("paciente_id", userId)
        .eq("status", "ativo")
        .maybeSingle(),
    ]);

    return {
      userId,
      perfil: perfil.data,
      consumidor: consumidor.data,
      profissional: profissional.data,
      academia: academia.data,
      vinculo: vinculo.data,
    };
  });

const definirSchema = z.object({
  tipo: z.enum(["consumidor", "nutricionista", "personal", "academia"]),
  nome: z.string().min(1).max(120),
  crnCref: z.string().max(60).optional(),
  especialidade: z.string().max(120).optional(),
  nomeFantasia: z.string().max(120).optional(),
});

export const definirPerfil = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => definirSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    await supabase
      .from("perfis")
      .upsert({ id: userId, nome: data.nome, tipo_perfil: data.tipo }, { onConflict: "id" });

    if (data.tipo === "consumidor") {
      await supabase
        .from("perfis_consumidor")
        .upsert({ usuario_id: userId }, { onConflict: "usuario_id" });
    }

    if (data.tipo === "nutricionista" || data.tipo === "personal") {
      const existente = await supabase
        .from("perfis_profissional")
        .select("link_slug")
        .eq("usuario_id", userId)
        .maybeSingle();
      const slug = existente.data?.link_slug ?? `${slugify(data.nome)}-${userId.slice(0, 4)}`;
      await supabase.from("perfis_profissional").upsert(
        {
          usuario_id: userId,
          tipo: data.tipo,
          link_slug: slug,
          crn_cref: data.crnCref ?? null,
          especialidade: data.especialidade ?? null,
        },
        { onConflict: "usuario_id" },
      );
    }

    if (data.tipo === "academia") {
      const existente = await supabase
        .from("perfis_academia")
        .select("link_slug")
        .eq("usuario_id", userId)
        .maybeSingle();
      const slug = existente.data?.link_slug ?? `${slugify(data.nomeFantasia ?? data.nome)}-${userId.slice(0, 4)}`;
      await supabase.from("perfis_academia").upsert(
        { usuario_id: userId, nome_fantasia: data.nomeFantasia ?? data.nome, link_slug: slug },
        { onConflict: "usuario_id" },
      );
    }

    return { ok: true, tipo: data.tipo };
  });

/* ------------------------------ sincronização ------------------------------ */

export const sincronizarDados = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        entradas: z
          .array(z.object({ chave: z.string().max(80), valor: z.unknown() }))
          .max(30),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const linhas = data.entradas
      .filter((e) => CHAVES_SINCRONIZAVEIS.includes(e.chave as (typeof CHAVES_SINCRONIZAVEIS)[number]))
      .map((e) => ({
        usuario_id: userId,
        chave: e.chave,
        valor: (e.valor ?? null) as never,
        atualizado_em: new Date().toISOString(),
      }));

    if (linhas.length) {
      const { error } = await supabase
        .from("dados_locais")
        .upsert(linhas, { onConflict: "usuario_id,chave" });
      if (error) throw new Error(error.message);
    }
    return { sincronizados: linhas.length };
  });

export const baixarDados = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("dados_locais")
      .select("chave, valor, atualizado_em")
      .eq("usuario_id", context.userId);
    return data ?? [];
  });

/* --------------------------------- vínculo -------------------------------- */

export const vincularPorSlug = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ slug: z.string().min(2).max(80), consentimento: z.literal(true) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const prof = await supabase
      .from("perfis_profissional")
      .select("usuario_id")
      .eq("link_slug", data.slug)
      .maybeSingle();
    if (!prof.data) throw new Error("Profissional não encontrado.");
    if (prof.data.usuario_id === userId) throw new Error("Você não pode se vincular a si mesmo.");

    const { error } = await supabase.from("vinculos_profissional_paciente").upsert(
      {
        profissional_id: prof.data.usuario_id,
        paciente_id: userId,
        origem: "link_convite" as const,
        status: "ativo" as const,
        consentimento_em: new Date().toISOString(),
      },
      { onConflict: "profissional_id,paciente_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const encerrarMeuVinculo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ vinculoId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await context.supabase
      .from("vinculos_profissional_paciente")
      .update({ status: "encerrado", encerrado_em: new Date().toISOString() })
      .eq("id", data.vinculoId)
      .eq("paciente_id", context.userId);
    return { ok: true };
  });

/* ------------------------------ pacientes (pro) ----------------------------- */

type PerfilLocal = Record<string, string | number | boolean | null>;

interface MealItemLike {
  id?: string;
  name?: string;
  kcal?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  at?: number;
}

function resumoDeDados(rows: { chave: string; valor: unknown }[]) {
  // Chaves apagadas pelo app chegam como { __removido: true }.
  const mapa = new Map(
    rows
      .filter((r) => !(typeof r.valor === "object" && r.valor !== null && "__removido" in r.valor))
      .map((r) => [r.chave, r.valor]),
  );
  const meals = (mapa.get("nutriia:meals:v1") ?? {}) as Record<string, MealItemLike[]>;
  const water = (mapa.get("nutriia:water:v1") ?? {}) as Record<string, number>;
  const pesos = (mapa.get("nutriia:weight-log:v1") ?? []) as { date: string; kg: number }[];
  const perfilLocal = (mapa.get("nutriia:profile:v1") ?? null) as PerfilLocal | null;

  const dias: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(Date.now() - i * 86400000);
    dias.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
    );
  }
  const comRegistro = dias.filter((d) => (meals[d]?.length ?? 0) > 0 || (water[d] ?? 0) > 0);
  const todosDias = Object.keys(meals).filter((d) => (meals[d]?.length ?? 0) > 0).sort();
  const ultimoRegistro = todosDias[todosDias.length - 1] ?? null;
  const diasSemRegistro = ultimoRegistro
    ? Math.floor((Date.now() - new Date(`${ultimoRegistro}T12:00:00`).getTime()) / 86400000)
    : null;

  return {
    consistenciaSemana: Math.round((comRegistro.length / 7) * 100),
    ultimoRegistro,
    diasSemRegistro,
    pesoAtual: pesos[0]?.kg ?? null,
    pesoInicial: pesos[pesos.length - 1]?.kg ?? null,
    pesos: pesos.slice(0, 60),
    refeicoesRecentes: (todosDias.slice(-4).reverse() as string[]).map((d) => ({
      dia: d,
      itens: (meals[d] ?? []).slice(0, 8),
    })),
    perfilLocal,
    aguaSemana: dias.map((d) => ({ dia: d, ml: water[d] ?? 0 })).reverse(),
  };
}

export const listarPacientes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: vinculos } = await supabase
      .from("vinculos_profissional_paciente")
      .select("id, paciente_id, status, origem, criado_em, consentimento_em")
      .eq("profissional_id", userId)
      .eq("status", "ativo");

    const ids = (vinculos ?? []).map((v) => v.paciente_id);
    if (!ids.length) return [];

    const [{ data: perfis }, { data: dados }] = await Promise.all([
      supabase.from("perfis").select("id, nome, email, avatar_url").in("id", ids),
      supabase.from("dados_locais").select("usuario_id, chave, valor").in("usuario_id", ids),
    ]);

    return (vinculos ?? []).map((v) => {
      const p = (perfis ?? []).find((x) => x.id === v.paciente_id);
      const rows = (dados ?? []).filter((d) => d.usuario_id === v.paciente_id);
      const r = resumoDeDados(rows);
      return {
        vinculoId: v.id,
        pacienteId: v.paciente_id,
        nome: p?.nome || p?.email || "Paciente",
        email: p?.email ?? null,
        avatarUrl: p?.avatar_url ?? null,
        origem: v.origem,
        consentido: !!v.consentimento_em,
        consistenciaSemana: r.consistenciaSemana,
        diasSemRegistro: r.diasSemRegistro,
        pesoAtual: r.pesoAtual,
      };
    });
  });

export const detalhePaciente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ pacienteId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: perfil } = await supabase
      .from("perfis")
      .select("id, nome, email, avatar_url")
      .eq("id", data.pacienteId)
      .maybeSingle();
    if (!perfil) throw new Error("Paciente não encontrado ou sem vínculo ativo.");

    const { data: rows } = await supabase
      .from("dados_locais")
      .select("chave, valor")
      .eq("usuario_id", data.pacienteId);

    return { perfil, ...resumoDeDados(rows ?? []) };
  });

export const convidarPacienteManual = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ email: z.string().email() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // A busca roda no banco (usuario_por_email): o profissional não enxerga perfis de quem não é paciente.
    const { data: alvoId } = await supabase.rpc("usuario_por_email", { _email: data.email });
    const alvo = alvoId ? { id: alvoId } : null;
    if (!alvo) {
      return {
        ok: false as const,
        motivo:
          "Ninguém com esse e-mail tem conta ainda. Envie seu link de convite para que a pessoa se cadastre.",
      };
    }
    const { error } = await supabase.from("vinculos_profissional_paciente").upsert(
      {
        profissional_id: userId,
        paciente_id: alvo.id,
        origem: "indicacao_manual" as const,
        status: "ativo" as const,
      },
      { onConflict: "profissional_id,paciente_id" },
    );
    if (error) throw new Error(error.message);
    return {
      ok: true as const,
      motivo: "Vínculo criado. O paciente precisa aceitar o compartilhamento de dados no app dele.",
    };
  });

/* ---------------------------------- IA ------------------------------------ */

export const obterConfigIa = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("config_ia_profissional")
      .select("*")
      .eq("profissional_id", context.userId)
      .maybeSingle();
    return data;
  });

export const salvarConfigIa = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        filosofia: z.string().max(4000),
        restricoes: z.array(z.string().max(60)).max(20),
        tom: z.string().max(40),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("config_ia_profissional").upsert(
      {
        profissional_id: context.userId,
        filosofia_texto: data.filosofia,
        restricoes: data.restricoes as never,
        tom_de_voz: data.tom,
        atualizado_em: new Date().toISOString(),
      },
      { onConflict: "profissional_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listarSugestoes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("sugestoes_mensagem")
      .select("*")
      .eq("profissional_id", userId)
      .order("criado_em", { ascending: false })
      .limit(60);

    const ids = [...new Set((data ?? []).map((s) => s.paciente_id))];
    const { data: perfis } = ids.length
      ? await supabase.from("perfis").select("id, nome, email").in("id", ids)
      : { data: [] as { id: string; nome: string; email: string | null }[] };

    return (data ?? []).map((s) => ({
      ...s,
      pacienteNome:
        (perfis ?? []).find((p) => p.id === s.paciente_id)?.nome ||
        (perfis ?? []).find((p) => p.id === s.paciente_id)?.email ||
        "Paciente",
    }));
  });

export const atualizarSugestao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        acao: z.enum(["aprovar", "descartar", "salvar"]),
        texto: z.string().max(2000).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const patch: {
      texto_gerado?: string;
      status?: "enviado" | "descartado" | "editado";
      enviado_em?: string;
    } = {};
    if (data.texto !== undefined) patch.texto_gerado = data.texto;
    if (data.acao === "aprovar") {
      patch.status = "enviado";
      patch.enviado_em = new Date().toISOString();
    }
    if (data.acao === "descartar") patch.status = "descartado";
    if (data.acao === "salvar") patch.status = "editado";

    const { error } = await context.supabase
      .from("sugestoes_mensagem")
      .update(patch)
      .eq("id", data.id)
      .eq("profissional_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const gerarSugestoes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { getAiModel } = await import("@/lib/ai-gateway.server");
    const model = getAiModel();
    if (!model) throw new Error("IA indisponível: chave não configurada.");

    const [{ data: config }, { data: vinculos }] = await Promise.all([
      supabase
        .from("config_ia_profissional")
        .select("*")
        .eq("profissional_id", userId)
        .maybeSingle(),
      supabase
        .from("vinculos_profissional_paciente")
        .select("paciente_id")
        .eq("profissional_id", userId)
        .eq("status", "ativo")
        .not("consentimento_em", "is", null),
    ]);

    const ids = (vinculos ?? []).map((v) => v.paciente_id);
    if (!ids.length) return { criadas: 0 };

    const [{ data: perfis }, { data: dados }, { data: pendentes }] = await Promise.all([
      supabase.from("perfis").select("id, nome, email").in("id", ids),
      supabase.from("dados_locais").select("usuario_id, chave, valor").in("usuario_id", ids),
      supabase
        .from("sugestoes_mensagem")
        .select("paciente_id")
        .eq("profissional_id", userId)
        .eq("status", "pendente"),
    ]);
    const jaPendente = new Set((pendentes ?? []).map((p) => p.paciente_id));

    const gatilhos = ids
      .filter((id) => !jaPendente.has(id))
      .map((id) => {
        const r = resumoDeDados((dados ?? []).filter((d) => d.usuario_id === id));
        const nome = (perfis ?? []).find((p) => p.id === id)?.nome || "paciente";
        if (r.diasSemRegistro !== null && r.diasSemRegistro >= 3)
          return { id, nome, tipo: "inatividade" as const, contexto: `${r.diasSemRegistro} dias sem registrar refeições.` };
        if (
          r.pesoInicial !== null &&
          r.pesoAtual !== null &&
          r.pesoInicial - r.pesoAtual >= 1
        )
          return {
            id,
            nome,
            tipo: "marco_peso" as const,
            contexto: `Perdeu ${(r.pesoInicial - r.pesoAtual).toFixed(1)} kg desde o início (${r.pesoAtual} kg hoje).`,
          };
        if (r.consistenciaSemana >= 85)
          return { id, nome, tipo: "meta_atingida" as const, contexto: `Consistência de ${r.consistenciaSemana}% na semana.` };
        return null;
      })
      .filter((g): g is NonNullable<typeof g> => g !== null)
      .slice(0, 8);

    if (!gatilhos.length) return { criadas: 0 };

    const restricoes = Array.isArray(config?.restricoes) ? (config?.restricoes as string[]) : [];
    const sistema = `Você escreve mensagens curtas de acompanhamento em nome de um profissional de saúde brasileiro.
Filosofia do profissional: ${config?.filosofia_texto || "abordagem equilibrada, sem dietas restritivas"}.
Restrições obrigatórias: ${restricoes.join(", ") || "nenhuma"}.
Tom de voz: ${config?.tom_de_voz || "acolhedor"}.
Regras: português do Brasil, no máximo 45 palavras por mensagem, primeira pessoa, sem emojis em excesso (máx 1), sem diagnóstico clínico, sem prometer resultado.
Responda APENAS um array JSON: [{"id":"<id>","texto":"<mensagem>"}]`;

    const { generateText } = await import("ai");
    let bruto = "[]";
    try {
      const { text } = await generateText({
        model,
        temperature: 0.6,
        system: sistema,
        messages: [
          {
            role: "user",
            content: gatilhos
              .map((g) => `id=${g.id} | nome=${g.nome} | situação=${g.tipo} | dados=${g.contexto}`)
              .join("\n"),
          },
        ],
      });
      bruto = text;
    } catch (err) {
      throw new Error(`Falha na IA (${(err as { statusCode?: number })?.statusCode ?? "erro"}).`);
    }
    const match = bruto.match(/\[[\s\S]*\]/);
    let textos: { id: string; texto: string }[] = [];
    try {
      textos = JSON.parse(match?.[0] ?? "[]") as { id: string; texto: string }[];
    } catch {
      textos = [];
    }

    const linhas = gatilhos
      .map((g) => {
        const t = textos.find((x) => x.id === g.id)?.texto;
        if (!t) return null;
        return {
          profissional_id: userId,
          paciente_id: g.id,
          tipo: g.tipo,
          contexto: g.contexto,
          texto_gerado: t,
          status: "pendente" as const,
        };
      })
      .filter((l): l is NonNullable<typeof l> => l !== null);

    if (linhas.length) {
      const { error } = await supabase.from("sugestoes_mensagem").insert(linhas);
      if (error) throw new Error(error.message);
    }
    return { criadas: linhas.length };
  });

/* ------------------------------- financeiro -------------------------------- */

export const resumoFinanceiro = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: comissoes }, { data: vinculos }, { data: saques }, { data: prof }] =
      await Promise.all([
        supabase
          .from("comissoes")
          .select("*")
          .eq("profissional_id", userId)
          .order("criado_em", { ascending: false }),
        supabase
          .from("vinculos_profissional_paciente")
          .select("id")
          .eq("profissional_id", userId)
          .eq("status", "ativo"),
        supabase
          .from("solicitacoes_saque")
          .select("*")
          .eq("profissional_id", userId)
          .order("criado_em", { ascending: false }),
        supabase
          .from("perfis_profissional")
          .select("percentual_comissao, nivel_parceiro, link_slug")
          .eq("usuario_id", userId)
          .maybeSingle(),
      ]);

    const lista = comissoes ?? [];
    const pendente = lista
      .filter((c) => c.status === "pendente")
      .reduce((a, c) => a + Number(c.valor), 0);
    const pago = lista.filter((c) => c.status === "pago").reduce((a, c) => a + Number(c.valor), 0);
    const mrr = lista
      .filter((c) => c.competencia === competenciaAtual() && c.status !== "cancelado")
      .reduce((a, c) => a + Number(c.valor), 0);

    return {
      pendente,
      pago,
      mrr,
      pacientesAtivos: (vinculos ?? []).length,
      comissoes: lista.slice(0, 50),
      saques: saques ?? [],
      percentual: Number(prof?.percentual_comissao ?? 15),
      nivel: prof?.nivel_parceiro ?? "bronze",
      slug: prof?.link_slug ?? null,
    };
  });

export const solicitarSaque = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ valor: z.number().positive().max(1000000), chavePix: z.string().max(140) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: comissoes } = await supabase
      .from("comissoes")
      .select("valor")
      .eq("profissional_id", userId)
      .eq("status", "pendente");
    const disponivel = (comissoes ?? []).reduce((a, c) => a + Number(c.valor), 0);
    if (data.valor > disponivel) throw new Error("Valor maior que o saldo disponível.");

    const { error } = await supabase
      .from("solicitacoes_saque")
      .insert({ profissional_id: userId, valor: data.valor, chave_pix: data.chavePix });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const PRECOS = { essencial: 29.9, premium: 49.9 } as const;

export const assinarPlano = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ plano: z.enum(["essencial", "premium"]) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const valor = PRECOS[data.plano];

    const { data: vinculo } = await supabase
      .from("vinculos_profissional_paciente")
      .select("id, profissional_id")
      .eq("paciente_id", userId)
      .eq("status", "ativo")
      .maybeSingle();

    const proximo = new Date();
    proximo.setMonth(proximo.getMonth() + 1);

    const { data: assinatura, error } = await supabase
      .from("assinaturas")
      .insert({
        consumidor_id: userId,
        plano: data.plano,
        valor,
        status: "ativa",
        vinculo_id: vinculo?.id ?? null,
        proximo_pagamento: proximo.toISOString().slice(0, 10),
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    await supabase
      .from("perfis_consumidor")
      .upsert({ usuario_id: userId, plano: data.plano }, { onConflict: "usuario_id" });

    // A comissão é calculada no banco (registrar_comissao), sem precisar da chave secreta.
    let comissao = 0;
    if (vinculo) {
      const { data: valorComissao, error: erroComissao } = await supabase.rpc("registrar_comissao", {
        p_assinatura_id: assinatura.id,
      });
      if (erroComissao) console.warn("[comissao] falha ao registrar", erroComissao.message);
      comissao = Number(valorComissao ?? 0);
    }

    return { ok: true, valor, comissao };
  });
