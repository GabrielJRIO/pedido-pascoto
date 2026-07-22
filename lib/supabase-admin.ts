import "server-only";
import { createClient } from "@supabase/supabase-js";

// ⚠️ Cliente com service role: ignora RLS e faz tudo no banco.
// O import "server-only" acima faz o BUILD FALHAR se algum componente
// client importar este arquivo por engano. É a trava, não o comentário.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL ausente.");
if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY ausente (configure no ambiente server-side).");

export const supabaseAdmin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
