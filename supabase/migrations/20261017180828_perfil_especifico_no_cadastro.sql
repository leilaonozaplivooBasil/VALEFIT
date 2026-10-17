-- Cria o perfil específico (consumidor, profissional ou academia) já no cadastro.
-- Antes ele só era criado pela tela de login; quem entrava pelo link do e-mail ficava sem ele.
CREATE OR REPLACE FUNCTION public.criar_perfil_especifico(_id UUID, _tipo public.tipo_perfil, _nome TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_slug TEXT := trim(both '-' from regexp_replace(
    lower(translate(coalesce(_nome, ''), 'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
                                         'aaaaaeeeeiiiiooooouuuucnaaaaaeeeeiiiiooooouuuucn')),
    '[^a-z0-9]+', '-', 'g'));
BEGIN
  v_slug := left(coalesce(nullif(v_slug, ''), 'profissional'), 28) || '-' || left(_id::text, 4);
  IF _tipo = 'consumidor' THEN
    INSERT INTO public.perfis_consumidor (usuario_id) VALUES (_id) ON CONFLICT (usuario_id) DO NOTHING;
  ELSIF _tipo IN ('nutricionista', 'personal') THEN
    INSERT INTO public.perfis_profissional (usuario_id, tipo, link_slug)
    VALUES (_id, _tipo::text::public.tipo_profissional, v_slug) ON CONFLICT (usuario_id) DO NOTHING;
  ELSIF _tipo = 'academia' THEN
    INSERT INTO public.perfis_academia (usuario_id, nome_fantasia, link_slug)
    VALUES (_id, coalesce(nullif(_nome, ''), 'Academia'), v_slug) ON CONFLICT (usuario_id) DO NOTHING;
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.criar_perfil_especifico(UUID, public.tipo_perfil, TEXT) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tipo public.tipo_perfil := COALESCE((NEW.raw_user_meta_data->>'tipo_perfil')::public.tipo_perfil, 'consumidor');
  v_nome TEXT := COALESCE(NEW.raw_user_meta_data->>'nome', NEW.raw_user_meta_data->>'full_name', '');
BEGIN
  INSERT INTO public.perfis (id, nome, email, tipo_perfil)
  VALUES (NEW.id, v_nome, NEW.email, v_tipo)
  ON CONFLICT (id) DO NOTHING;
  PERFORM public.criar_perfil_especifico(NEW.id, v_tipo, v_nome);
  RETURN NEW;
END;
$$;

-- Contas que já existem e ficaram sem o perfil específico.
SELECT public.criar_perfil_especifico(p.id, p.tipo_perfil, p.nome)
FROM public.perfis p
WHERE NOT EXISTS (SELECT 1 FROM public.perfis_consumidor c WHERE c.usuario_id = p.id)
  AND NOT EXISTS (SELECT 1 FROM public.perfis_profissional f WHERE f.usuario_id = p.id)
  AND NOT EXISTS (SELECT 1 FROM public.perfis_academia a WHERE a.usuario_id = p.id);

-- O profissional cadastra paciente pelo e-mail; a busca precisa enxergar perfis de outras pessoas.
CREATE OR REPLACE FUNCTION public.usuario_por_email(_email TEXT)
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id FROM public.perfis p
  WHERE lower(p.email) = lower(_email)
    AND EXISTS (SELECT 1 FROM public.perfis_profissional f WHERE f.usuario_id = auth.uid())
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.usuario_por_email(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.usuario_por_email(TEXT) TO authenticated;
