import { NextResponse } from "next/server";
import { usuarioDaSessao } from "@/lib/session";

export const runtime = "nodejs";

// Devolve o posto logado a partir do cookie assinado, ou 401. Usado no
// carregamento da página para restaurar a sessão sem reobrigar login.
export async function GET() {
  const user = await usuarioDaSessao();
  if (!user) return NextResponse.json({ user: null }, { status: 401 });
  return NextResponse.json({ user });
}
