// Sincronização dos dados do consumidor (localStorage) com a nuvem (tabela dados_locais).
// - Ao entrar: baixa o que está na nuvem e fica com a versão mais recente de cada chave.
// - Ao salvar algo localmente: envia as chaves alteradas, agrupadas em poucos segundos.
// Assim os dados aparecem em outros aparelhos e no painel do profissional vinculado.
import { supabase } from "@/integrations/supabase/client";
import { CHAVES_NUVEM, baixarDados, sincronizarDados } from "@/lib/perfil.functions";

const META_KEY = "nutriia:sync-meta:v1"; // { [chave]: ISO da última alteração local }
const DEBOUNCE_MS = 2500;
// A coluna valor não aceita null; uma chave apagada vai para a nuvem com este marcador.
const REMOVIDO = { __removido: true } as const;

function ehRemovido(valor: unknown) {
  return typeof valor === "object" && valor !== null && "__removido" in valor;
}

let iniciado = false;
let logado = false;
let aplicandoRemoto = false;
let timer: ReturnType<typeof setTimeout> | undefined;
const pendentes = new Set<string>();

function lerMeta(): Record<string, string> {
  try {
    return JSON.parse(window.localStorage.getItem(META_KEY) || "{}") as Record<string, string>;
  } catch {
    return {};
  }
}

function gravarMeta(meta: Record<string, string>) {
  originalSetItem.call(window.localStorage, META_KEY, JSON.stringify(meta));
}

let originalSetItem: Storage["setItem"];
let originalRemoveItem: Storage["removeItem"];

function marcarAlterada(chave: string) {
  const meta = lerMeta();
  meta[chave] = new Date().toISOString();
  gravarMeta(meta);
  pendentes.add(chave);
  agendarEnvio();
}

function agendarEnvio() {
  if (!logado) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => void enviarPendentes(), DEBOUNCE_MS);
}

async function enviarPendentes() {
  if (!logado || !pendentes.size) return;
  const chaves = [...pendentes];
  pendentes.clear();
  const entradas = chaves
    .map((chave) => {
      const raw = window.localStorage.getItem(chave);
      if (raw == null) return { chave, valor: REMOVIDO as unknown };
      try {
        return { chave, valor: JSON.parse(raw) as unknown };
      } catch {
        return null;
      }
    })
    .filter((e): e is { chave: string; valor: unknown } => e !== null);
  if (!entradas.length) return;
  try {
    await sincronizarDados({ data: { entradas } });
  } catch (err) {
    console.warn("[sync] falha ao enviar, tentando de novo depois", err);
    chaves.forEach((c) => pendentes.add(c));
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => void enviarPendentes(), 15000);
  }
}

async function baixarEMesclar() {
  const remotos = await baixarDados();
  const meta = lerMeta();
  let mudouLocal = false;
  const remotosPorChave = new Map(remotos.map((r) => [r.chave, r]));

  aplicandoRemoto = true;
  try {
    for (const chave of CHAVES_NUVEM) {
      const remoto = remotosPorChave.get(chave);
      const local = window.localStorage.getItem(chave);
      const localEm = meta[chave];
      if (remoto && (local == null || !localEm || remoto.atualizado_em > localEm)) {
        if (ehRemovido(remoto.valor)) {
          if (local != null) {
            originalRemoveItem.call(window.localStorage, chave);
            mudouLocal = true;
          }
        } else {
          const valor = JSON.stringify(remoto.valor);
          if (valor !== local) {
            originalSetItem.call(window.localStorage, chave, valor);
            mudouLocal = true;
          }
        }
        meta[chave] = remoto.atualizado_em;
      } else if (local != null && (!remoto || (localEm && localEm > remoto.atualizado_em))) {
        // Local mais novo (ou ainda não está na nuvem): envia.
        pendentes.add(chave);
      }
    }
  } finally {
    aplicandoRemoto = false;
  }
  gravarMeta(meta);
  return mudouLocal;
}

let puxando: Promise<boolean> | null = null;

// Baixa a nuvem uma vez por login. Telas que dependem do perfil esperam por isso.
function puxarUmaVez() {
  if (!puxando) {
    logado = true;
    puxando = baixarEMesclar()
      .then((mudou) => {
        agendarEnvio();
        return mudou;
      })
      .catch((err) => {
        console.warn("[sync] falha ao baixar dados da nuvem", err);
        puxando = null;
        return false;
      });
  }
  return puxando;
}

// Telas que tratam o login sozinhas (elas chamam sincronizarAgora e decidem para onde ir).
const TELAS_SEM_RECARGA = ["/", "/auth", "/onboarding"];

async function aoEntrar() {
  const mudou = await puxarUmaVez();
  // As telas leem o localStorage ao abrir; recarrega uma vez para mostrar os dados da nuvem.
  if (mudou && !TELAS_SEM_RECARGA.includes(window.location.pathname)) window.location.reload();
}

/** Se houver login, traz os dados da nuvem para este aparelho antes de continuar. */
export async function sincronizarAgora() {
  if (typeof window === "undefined") return false;
  iniciarSincronizacao();
  const { data } = await supabase.auth.getSession();
  if (!data.session) return false;
  return puxarUmaVez();
}

export function iniciarSincronizacao() {
  if (iniciado || typeof window === "undefined") return;
  iniciado = true;

  const chaves = new Set<string>(CHAVES_NUVEM);
  originalSetItem = Storage.prototype.setItem;
  originalRemoveItem = Storage.prototype.removeItem;

  Storage.prototype.setItem = function (chave: string, valor: string) {
    originalSetItem.call(this, chave, valor);
    if (this === window.localStorage && !aplicandoRemoto && chaves.has(chave)) marcarAlterada(chave);
  };
  Storage.prototype.removeItem = function (chave: string) {
    originalRemoveItem.call(this, chave);
    // Apagar localmente apaga na nuvem também.
    if (this === window.localStorage && !aplicandoRemoto && chaves.has(chave)) marcarAlterada(chave);
  };

  void supabase.auth.getSession().then(({ data }) => {
    if (data.session) void aoEntrar();
  });
  supabase.auth.onAuthStateChange((evento, session) => {
    if (session && (evento === "SIGNED_IN" || evento === "INITIAL_SESSION")) void aoEntrar();
    if (evento === "SIGNED_OUT") {
      logado = false;
      puxando = null;
    }
  });
}
