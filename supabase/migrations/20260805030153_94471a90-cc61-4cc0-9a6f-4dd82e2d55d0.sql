REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.pode_ver_paciente(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pode_ver_paciente(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.meu_tipo_perfil() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.meu_tipo_perfil() TO authenticated;