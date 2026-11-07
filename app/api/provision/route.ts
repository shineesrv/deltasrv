import { NextRequest, NextResponse } from "next/server";
import { createServer, createUser } from "@/lib/pterodactyl";
import { clampSpec } from "@/lib/pricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Endpoint admin untuk membuat akun dan server secara manual.
// Gunakan hanya jika diperlukan. Alur utama dilakukan lewat webhook pembayaran.
export async function POST(req: NextRequest) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret || req.headers.get("x-admin-secret") !== secret) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Format permintaan tidak valid" }, { status: 400 });
  }

  const email = String(body.email ?? "");
  const username = String(body.username ?? "");
  const password = String(body.password ?? "");
  const name = String(body.name ?? "");

  if (!email || !username || password.length < 8 || !name) {
    return NextResponse.json(
      { error: "email, username, password (min 8 karakter), dan name wajib diisi" },
      { status: 400 }
    );
  }

  try {
    const spec = clampSpec(body);
    const userId = await createUser(email, username, password);
    const serverId = await createServer({ userId, name, ...spec });
    return NextResponse.json({ ok: true, userId, serverId, spec });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Terjadi kesalahan";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
