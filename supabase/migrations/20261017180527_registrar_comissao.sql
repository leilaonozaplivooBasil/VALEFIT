-- Gera a comissão do profissional quando o paciente assina um plano.
-- Roda com os privilégios do dono para não precisar da chave secreta no servidor,
-- mas só aceita assinaturas do próprio usuário e calcula tudo a partir do banco.
CREATE OR REPLACE FUNCTION public.registrar_comissao(p_assinatura_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_assinatura public.assinaturas%ROWTYPE;
  v_vinculo public.vinculos_profissional_paciente%ROWTYPE;
  v_pct NUMERIC;
  v_valor NUMERIC;
BEGIN
  SELECT * INTO v_assinatura FROM public.assinaturas
  WHERE id = p_assinatura_id AND consumidor_id = auth.uid();
  IF NOT FOUND OR v_assinatura.vinculo_id IS NULL THEN
    RETURN 0;
  END IF;

  SELECT * INTO v_vinculo FROM public.vinculos_profissional_paciente
  WHERE id = v_assinatura.vinculo_id AND paciente_id = auth.uid() AND status = 'ativo';
  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  SELECT COALESCE(percentual_comissao, 15) INTO v_pct
  FROM public.perfis_profissional WHERE usuario_id = v_vinculo.profissional_id;
  v_pct := COALESCE(v_pct, 15);
  v_valor := round(v_assinatura.valor * v_pct / 100, 2);

  INSERT INTO public.comissoes (vinculo_id, profissional_id, assinatura_id, valor, percentual, competencia)
  VALUES (v_vinculo.id, v_vinculo.profissional_id, v_assinatura.id, v_valor, v_pct, to_char(now(), 'YYYY-MM'))
  ON CONFLICT (assinatura_id, competencia) DO UPDATE SET valor = EXCLUDED.valor, percentual = EXCLUDED.percentual;

  RETURN v_valor;
END;
$$;

REVOKE ALL ON FUNCTION public.registrar_comissao(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_comissao(UUID) TO authenticated;
