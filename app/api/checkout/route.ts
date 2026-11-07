import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { calcPrice, clampSpec } from "@/lib/pricing";
import { saveOrder, updateOrder } from "@/lib/orders";
import { createPayment } from "@/lib/payment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Format permintaan tidak valid" }, { status: 400 });
  }

  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();

  if (name.length < 3 || name.length > 50) {
    return NextResponse.json({ error: "Nama server harus 3 sampai 50 karakter" }, { status: 400 });
  }
  if (!EMAIL_RE.test(email) || email.length > 191) {
    return NextResponse.json({ error: "Format email tidak valid" }, { status: 400 });
  }

  // Harga selalu dihitung ulang di server
  const spec = clampSpec(body);
  const amount = calcPrice(spec);
  const orderId = `ORD${Date.now()}${randomBytes(3).toString("hex")}`.toUpperCase();

  await saveOrder({
    id: orderId,
    status: "PENDING",
    name,
    email,
    ...spec,
    amount,
    createdAt: Date.now(),
  });

  try {
    const payment = await createPayment({
      orderId,
      amount,
      description: `Panel Pterodactyl ${spec.ram}GB RAM / ${spec.disk}GB Disk / ${spec.cpu}% CPU`,
      customerName: name,
      customerEmail: email,
      returnUrl: `${process.env.APP_URL}/order/${orderId}`,
    });

    await updateOrder(orderId, { gatewayRef: payment.id });

    return NextResponse.json({ paymentUrl: payment.checkoutUrl, orderId });
  } catch (e) {
    console.error("Gagal membuat pembayaran:", orderId, e);
    await updateOrder(orderId, { status: "FAILED" }).catch(() => undefined);
    return NextResponse.json(
      { error: "Pembayaran belum bisa dibuat. Silakan coba lagi." },
      { status: 502 }
    );
  }
}
