CREATE OR REPLACE FUNCTION public.profissional_publico(_slug TEXT)
RETURNS TABLE (nome TEXT, tipo public.tipo_profissional, especialidade TEXT, bio TEXT, link_slug TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.nome, pp.tipo, pp.especialidade, pp.bio, pp.link_slug
  FROM public.perfis_profissional pp
  JOIN public.perfis p ON p.id = pp.usuario_id
  WHERE pp.link_slug = _slug
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.profissional_publico(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.profissional_publico(TEXT) TO anon, authenticated;