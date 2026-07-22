import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { supabaseAdmin } from "./supabase-admin";

// Cookie PRÓPRIO do portal — nome diferente do Gestão para as duas sessões
// nunca se confundirem, mesmo que um dia dividam domínio.
export const COOKIE_NAME = "pascoto_portal_session";
const OITO_HORAS = 60 * 60 * 8;

function segredo(): Uint8Array {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) {
    throw new Error("SESSION_SECRET ausente ou curto demais (mínimo 32 caracteres).");
  }
  return new TextEncoder().encode(s);
}

/**
 * O token carrega APENAS o id do usuário — nunca unidade, nome ou permissão.
 * Motivo: se o vínculo viajasse no cookie, desativar um posto exigiria esperar
 * as 8h de validade. Com só o id, cada leitura relê o banco e a desativação
 * vale no ato.
 */
export async function criarSessao(userId: string) {
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${OITO_HORAS}s`)
    .sign(segredo());

  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,                                   // JS da página não lê
    secure: process.env.NODE_ENV === "production",    // http no dev, https em prod
    sameSite: "lax",
    path: "/",
    maxAge: OITO_HORAS,
  });
}

export async function destruirSessao() {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

export type UsuarioPortal = {
  id: string;
  username: string;
  name: string | null;
  unit: string | null;
  localityType: string;
  active: boolean;
};

/**
 * Identidade validada da requisição, ou null.
 * SEMPRE relê o banco: unidade e status atuais, não os do login. Um posto
 * desativado às 10h para de pedir às 10h. Nunca devolve senha nem hash.
 */
export async function usuarioDaSessao(): Promise<UsuarioPortal | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;

  let userId: string;
  try {
    const { payload } = await jwtVerify(token, segredo(), { algorithms: ["HS256"] });
    if (!payload.sub) return null;
    userId = payload.sub;
  } catch {
    return null; // assinatura inválida ou expirada
  }

  const { data, error } = await supabaseAdmin
    .from("pedido_users")
    .select("id, username, name, unit, locality_type, active")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return null;
  if (data.active === false) return null; // desativado no meio da sessão

  return {
    id: data.id,
    username: data.username,
    name: data.name,
    unit: data.unit,
    localityType: data.locality_type || "unidade",
    active: data.active !== false,
  };
}
