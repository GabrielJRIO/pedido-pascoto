import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { criarSessao } from "@/lib/session";
import { extrairIp, extrairDevice } from "@/lib/http";
import { checarRateLimit, registrarFalha, limparTentativas } from "@/lib/rate-limit";

export const runtime = "nodejs";

// Resposta única para qualquer falha: não revela se o login existe, se está
// inativo ou se a senha errou. Enumerar postos fica caro.
const GENERICA = { error: "Usuário ou senha inválidos." };

async function auditar(campos: Record<string, unknown>) {
  const { error } = await supabaseAdmin.from("audit_logs").insert(campos);
  if (error) console.error("[portal/login] falha ao auditar:", error.message);
}

export async function POST(req: Request) {
  const operationId = randomUUID();
  const ip = extrairIp(req.headers);
  const device = extrairDevice(req.headers);

  let username: string, password: string;
  try {
    const body = await req.json();
    username = String(body.username ?? "").trim().toLowerCase();
    password = String(body.password ?? "");
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }
  if (!username || !password) return NextResponse.json(GENERICA, { status: 401 });

  // Rate limit por IP + login: trava força bruta sem punir os outros postos.
  const chave = `${ip}:${username}`;
  const limite = checarRateLimit(chave);
  if (!limite.ok) {
    await auditar({
      user_name: username, user_login: username, action: "Login BLOQUEADO",
      details: `Rate limit: excesso de tentativas. Liberado em ~${limite.segundos}s.`,
      success: false, motivo: "RATE_LIMIT", operation_id: operationId,
      application: "Portal de Pedidos", ip_address: ip, device, entity_type: "auth",
    });
    return NextResponse.json(
      { error: "Muitas tentativas. Tente novamente em alguns minutos." },
      { status: 429 },
    );
  }

  // select("*") de propósito: a coluna password_hash só passa a existir depois
  // da migration 001. Listá-la explicitamente quebraria o login ANTES da
  // migration; com "*", a rota funciona nas duas fases (sem a coluna, cai no
  // texto plano legado; com ela, usa o bcrypt). Tudo fica no servidor.
  const { data: user, error } = await supabaseAdmin
    .from("pedido_users")
    .select("*")
    .eq("username", username)
    .maybeSingle();

  if (error) {
    console.error("[portal/login] erro ao consultar usuário:", error.message);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }

  const falhar = async (motivo: string, detalhe: string) => {
    registrarFalha(chave);
    await auditar({
      user_name: user?.name ?? username, user_login: username,
      action: "Login BLOQUEADO", details: detalhe, success: false, motivo,
      operation_id: operationId, application: "Portal de Pedidos",
      ip_address: ip, device, entity_type: "auth", entity_id: user?.id ?? null,
    });
    return NextResponse.json(GENERICA, { status: 401 });
  };

  if (!user) return falhar("USUARIO_INEXISTENTE", `Tentativa de login com usuário inexistente: ${username}.`);

  // Senha: bcrypt se já migrado; senão compara o texto plano legado (e migra
  // no ato — ver abaixo). A coluna `password` some quando a migration trancar
  // a tabela, mas o compare por texto plano é só a ponte da 1ª entrada.
  const senhaConfere = user.password_hash
    ? await bcrypt.compare(password, user.password_hash)
    : (user.password ?? "") === password;

  if (!senhaConfere) return falhar("SENHA_INCORRETA", `Senha incorreta para ${username}.`);

  // Status só é checado DEPOIS da senha: quem erra a senha não descobre se o
  // posto existe nem se está ativo.
  if (user.active === false) return falhar("USUARIO_DESATIVADO", `Posto ${username} está desativado.`);

  // Migração progressiva: grava o hash no 1º login válido de quem só tinha
  // texto plano. Ninguém precisa trocar a senha para migrar.
  if (!user.password_hash) {
    const hash = await bcrypt.hash(password, 10);
    const { error: hashErr } = await supabaseAdmin
      .from("pedido_users").update({ password_hash: hash }).eq("id", user.id);
    if (hashErr) console.error("[portal/login] falha ao gravar password_hash:", hashErr.message);
  }

  // last_login (antes ia pelo cliente, agora aqui)
  await supabaseAdmin.from("pedido_users")
    .update({ last_login: new Date().toISOString() }).eq("id", user.id);

  limparTentativas(chave);
  await criarSessao(user.id);

  await auditar({
    user_name: user.name ?? user.username, user_login: user.username,
    action: "Login realizado", details: "Login pela API server-side.", success: true,
    operation_id: operationId, application: "Portal de Pedidos",
    ip_address: ip, device, entity_type: "auth", entity_id: user.id,
  });

  // A senha NUNCA volta ao cliente — nem o hash.
  return NextResponse.json({
    user: {
      id: user.id, username: user.username, name: user.name,
      unit: user.unit, localityType: user.locality_type || "unidade",
      active: user.active !== false,
    },
  });
}
