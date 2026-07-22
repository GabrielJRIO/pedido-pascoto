import { NextResponse } from "next/server";
import { destruirSessao } from "@/lib/session";

export const runtime = "nodejs";

export async function POST() {
  await destruirSessao();
  return NextResponse.json({ ok: true });
}
