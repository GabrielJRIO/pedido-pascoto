import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// ⚠️ Cliente com service role: ignora RLS e faz tudo no banco.
// O import "server-only" acima faz o BUILD FALHAR se algum componente
// client importar este arquivo por engano. É a trava, não o comentário.
//
// IMPORTANTE: a criação do cliente é PREGUIÇOSA (só no 1º uso, em request).
// Se montasse no topo do módulo, o `next build` — que avalia o módulo ao
// "coletar page data" — quebraria quando a env não estivesse presente no
// build. Agora o build nunca falha por env ausente; se a chave faltar mesmo,
// o erro acontece no request, com mensagem clara, sem derrubar o deploy.

// URL tem fallback conhecido (mesmo projeto), como o supabase.ts do portal já
// fazia — nunca é "ausente". A service key NUNCA tem fallback: é segredo e
// vem exclusivamente do ambiente server-side.
const URL_FALLBACK = "https://todeupahpgoopcxvfakt.supabase.co";

let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || URL_FALLBACK;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY ausente (configure no ambiente server-side da Vercel).");
  }
  _client = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _client;
}

// Proxy: mantém o uso `supabaseAdmin.from(...)` idêntico ao de antes, mas o
// cliente real só nasce no primeiro acesso. Funções vêm bound ao cliente para
// não perder o `this` do supabase-js.
export const supabaseAdmin: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getClient();
    const value = Reflect.get(client as object, prop);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
