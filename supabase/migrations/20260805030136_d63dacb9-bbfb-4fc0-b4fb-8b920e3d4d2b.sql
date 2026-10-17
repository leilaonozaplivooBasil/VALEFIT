-- ENUMS
CREATE TYPE public.tipo_perfil AS ENUM ('consumidor','nutricionista','personal','academia','admin');
CREATE TYPE public.tipo_profissional AS ENUM ('nutricionista','personal');
CREATE TYPE public.plano_consumidor AS ENUM ('gratuito','essencial','premium');
CREATE TYPE public.nivel_parceiro AS ENUM ('bronze','prata','ouro','diamante');
CREATE TYPE public.status_vinculo AS ENUM ('ativo','pausado','encerrado');
CREATE TYPE public.origem_vinculo AS ENUM ('link_convite','indicacao_manual');
CREATE TYPE public.status_assinatura AS ENUM ('ativa','cancelada','inadimplente');
CREATE TYPE public.status_comissao AS ENUM ('pendente','pago','cancelado');
CREATE TYPE public.status_sugestao AS ENUM ('pendente','editado','aprovado','enviado','descartado');
CREATE TYPE public.tipo_sugestao AS ENUM ('meta_atingida','inatividade','marco_peso','boas_vindas','outro');
CREATE TYPE public.modelo_academia AS ENUM ('parceira','corporativa');
CREATE TYPE public.status_saque AS ENUM ('solicitado','processando','pago','recusado');

-- PERFIS
CREATE TABLE public.perfis (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT '',
  email TEXT,
  telefone TEXT,
  avatar_url TEXT,
  tipo_perfil public.tipo_perfil NOT NULL DEFAULT 'consumidor',
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.perfis TO authenticated;
GRANT ALL ON public.perfis TO service_role;
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.perfis_consumidor (
  usuario_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  objetivo TEXT,
  dados_onboarding JSONB NOT NULL DEFAULT '{}'::jsonb,
  plano public.plano_consumidor NOT NULL DEFAULT 'gratuito',
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.perfis_consumidor TO authenticated;
GRANT ALL ON public.perfis_consumidor TO service_role;
ALTER TABLE public.perfis_consumidor ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.perfis_profissional (
  usuario_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo public.tipo_profissional NOT NULL DEFAULT 'nutricionista',
  crn_cref TEXT,
  especialidade TEXT,
  bio TEXT,
  foto_capa TEXT,
  link_slug TEXT NOT NULL UNIQUE,
  percentual_comissao NUMERIC(5,2) NOT NULL DEFAULT 15.00,
  nivel_parceiro public.nivel_parceiro NOT NULL DEFAULT 'bronze',
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.perfis_profissional TO authenticated;
GRANT SELECT ON public.perfis_profissional TO anon;
GRANT ALL ON public.perfis_profissional TO service_role;
ALTER TABLE public.perfis_profissional ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.perfis_academia (
  usuario_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome_fantasia TEXT NOT NULL DEFAULT '',
  cnpj TEXT,
  modelo public.modelo_academia NOT NULL DEFAULT 'parceira',
  link_slug TEXT NOT NULL UNIQUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.perfis_academia TO authenticated;
GRANT ALL ON public.perfis_academia TO service_role;
ALTER TABLE public.perfis_academia ENABLE ROW LEVEL SECURITY;

-- DADOS DO CONSUMIDOR (espelho na nuvem)
CREATE TABLE public.dados_locais (
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chave TEXT NOT NULL,
  valor JSONB NOT NULL DEFAULT '{}'::jsonb,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (usuario_id, chave)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dados_locais TO authenticated;
GRANT ALL ON public.dados_locais TO service_role;
ALTER TABLE public.dados_locais ENABLE ROW LEVEL SECURITY;

-- VINCULOS
CREATE TABLE public.vinculos_profissional_paciente (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profissional_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  paciente_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.status_vinculo NOT NULL DEFAULT 'ativo',
  origem public.origem_vinculo NOT NULL DEFAULT 'link_convite',
  consentimento_em TIMESTAMPTZ,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  encerrado_em TIMESTAMPTZ,
  UNIQUE (profissional_id, paciente_id)
);
GRANT SELECT, INSERT, UPDATE ON public.vinculos_profissional_paciente TO authenticated;
GRANT ALL ON public.vinculos_profissional_paciente TO service_role;
ALTER TABLE public.vinculos_profissional_paciente ENABLE ROW LEVEL SECURITY;

-- FUNÇÕES DE SEGURANÇA
CREATE OR REPLACE FUNCTION public.pode_ver_paciente(_paciente UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.vinculos_profissional_paciente v
    WHERE v.profissional_id = auth.uid()
      AND v.paciente_id = _paciente
      AND v.status = 'ativo'
      AND v.consentimento_em IS NOT NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.meu_tipo_perfil()
RETURNS public.tipo_perfil LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT tipo_perfil FROM public.perfis WHERE id = auth.uid();
$$;

-- POLICIES perfis
CREATE POLICY "perfis_self_select" ON public.perfis FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "perfis_prof_select" ON public.perfis FOR SELECT TO authenticated USING (public.pode_ver_paciente(id));
CREATE POLICY "perfis_self_insert" ON public.perfis FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "perfis_self_update" ON public.perfis FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "pc_self" ON public.perfis_consumidor FOR ALL TO authenticated USING (usuario_id = auth.uid()) WITH CHECK (usuario_id = auth.uid());
CREATE POLICY "pc_prof_select" ON public.perfis_consumidor FOR SELECT TO authenticated USING (public.pode_ver_paciente(usuario_id));

CREATE POLICY "pp_public_select" ON public.perfis_profissional FOR SELECT USING (true);
CREATE POLICY "pp_self_insert" ON public.perfis_profissional FOR INSERT TO authenticated WITH CHECK (usuario_id = auth.uid());
CREATE POLICY "pp_self_update" ON public.perfis_profissional FOR UPDATE TO authenticated USING (usuario_id = auth.uid()) WITH CHECK (usuario_id = auth.uid());

CREATE POLICY "pa_self" ON public.perfis_academia FOR ALL TO authenticated USING (usuario_id = auth.uid()) WITH CHECK (usuario_id = auth.uid());

CREATE POLICY "dl_self" ON public.dados_locais FOR ALL TO authenticated USING (usuario_id = auth.uid()) WITH CHECK (usuario_id = auth.uid());
CREATE POLICY "dl_prof_select" ON public.dados_locais FOR SELECT TO authenticated USING (public.pode_ver_paciente(usuario_id));

CREATE POLICY "vin_prof_select" ON public.vinculos_profissional_paciente FOR SELECT TO authenticated USING (profissional_id = auth.uid() OR paciente_id = auth.uid());
CREATE POLICY "vin_paciente_insert" ON public.vinculos_profissional_paciente FOR INSERT TO authenticated WITH CHECK (paciente_id = auth.uid());
CREATE POLICY "vin_prof_insert" ON public.vinculos_profissional_paciente FOR INSERT TO authenticated WITH CHECK (profissional_id = auth.uid());
CREATE POLICY "vin_update" ON public.vinculos_profissional_paciente FOR UPDATE TO authenticated USING (profissional_id = auth.uid() OR paciente_id = auth.uid()) WITH CHECK (profissional_id = auth.uid() OR paciente_id = auth.uid());

-- FINANCEIRO
CREATE TABLE public.assinaturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consumidor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plano public.plano_consumidor NOT NULL DEFAULT 'essencial',
  ciclo TEXT NOT NULL DEFAULT 'mensal',
  valor NUMERIC(10,2) NOT NULL DEFAULT 0,
  status public.status_assinatura NOT NULL DEFAULT 'ativa',
  vinculo_id UUID REFERENCES public.vinculos_profissional_paciente(id) ON DELETE SET NULL,
  proximo_pagamento DATE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.assinaturas TO authenticated;
GRANT ALL ON public.assinaturas TO service_role;
ALTER TABLE public.assinaturas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ass_self" ON public.assinaturas FOR ALL TO authenticated USING (consumidor_id = auth.uid()) WITH CHECK (consumidor_id = auth.uid());
CREATE POLICY "ass_prof_select" ON public.assinaturas FOR SELECT TO authenticated USING (public.pode_ver_paciente(consumidor_id));

CREATE TABLE public.comissoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vinculo_id UUID NOT NULL REFERENCES public.vinculos_profissional_paciente(id) ON DELETE CASCADE,
  profissional_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assinatura_id UUID REFERENCES public.assinaturas(id) ON DELETE SET NULL,
  valor NUMERIC(10,2) NOT NULL DEFAULT 0,
  percentual NUMERIC(5,2) NOT NULL DEFAULT 15.00,
  status public.status_comissao NOT NULL DEFAULT 'pendente',
  competencia TEXT NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (assinatura_id, competencia)
);
GRANT SELECT ON public.comissoes TO authenticated;
GRANT ALL ON public.comissoes TO service_role;
ALTER TABLE public.comissoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "com_prof_select" ON public.comissoes FOR SELECT TO authenticated USING (profissional_id = auth.uid());

CREATE TABLE public.solicitacoes_saque (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profissional_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  valor NUMERIC(10,2) NOT NULL,
  chave_pix TEXT,
  status public.status_saque NOT NULL DEFAULT 'solicitado',
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.solicitacoes_saque TO authenticated;
GRANT ALL ON public.solicitacoes_saque TO service_role;
ALTER TABLE public.solicitacoes_saque ENABLE ROW LEVEL SECURITY;
CREATE POLICY "saq_self" ON public.solicitacoes_saque FOR SELECT TO authenticated USING (profissional_id = auth.uid());
CREATE POLICY "saq_insert" ON public.solicitacoes_saque FOR INSERT TO authenticated WITH CHECK (profissional_id = auth.uid());

-- IA
CREATE TABLE public.config_ia_profissional (
  profissional_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  filosofia_texto TEXT NOT NULL DEFAULT '',
  restricoes JSONB NOT NULL DEFAULT '[]'::jsonb,
  tom_de_voz TEXT NOT NULL DEFAULT 'acolhedor',
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.config_ia_profissional TO authenticated;
GRANT ALL ON public.config_ia_profissional TO service_role;
ALTER TABLE public.config_ia_profissional ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cia_self" ON public.config_ia_profissional FOR ALL TO authenticated USING (profissional_id = auth.uid()) WITH CHECK (profissional_id = auth.uid());

CREATE TABLE public.sugestoes_mensagem (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profissional_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  paciente_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo public.tipo_sugestao NOT NULL DEFAULT 'outro',
  contexto TEXT,
  texto_gerado TEXT NOT NULL,
  status public.status_sugestao NOT NULL DEFAULT 'pendente',
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  enviado_em TIMESTAMPTZ
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sugestoes_mensagem TO authenticated;
GRANT ALL ON public.sugestoes_mensagem TO service_role;
ALTER TABLE public.sugestoes_mensagem ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sug_prof" ON public.sugestoes_mensagem FOR ALL TO authenticated USING (profissional_id = auth.uid()) WITH CHECK (profissional_id = auth.uid());
CREATE POLICY "sug_paciente_select" ON public.sugestoes_mensagem FOR SELECT TO authenticated USING (paciente_id = auth.uid() AND status = 'enviado');

-- TRIGGER: cria perfil no cadastro
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.perfis (id, nome, email, tipo_perfil)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'tipo_perfil')::public.tipo_perfil, 'consumidor')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();