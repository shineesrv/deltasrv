import { NextRequest, NextResponse } from "next/server";
import { getOrder, updateOrder } from "@/lib/orders";
import { verifyWebhook } from "@/lib/payment";
import { provisionOrder } from "@/lib/provision";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // Wajib raw body untuk verifikasi signature
  const rawBody = await req.text();

  if (!verifyWebhook(rawBody, req.headers.get("kasera-signature-v1"))) {
    return NextResponse.json({ error: "Signature tidak valid" }, { status: 401 });
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }

  // Hanya payment.paid yang diproses. Expired atau failed bisa disusul pembayaran,
  // jadi event itu tidak membatalkan order.
  if (event.type !== "payment.paid") {
    return NextResponse.json({ ok: true });
  }

  const orderId: string | undefined = event.data?.external_id;
  const order = orderId ? await getOrder(orderId) : null;
  if (!orderId || !order) {
    console.warn("Webhook untuk order tidak dikenal:", orderId);
    return NextResponse.json({ ok: true });
  }

  // Cegah manipulasi nominal: bandingkan dengan harga yang tersimpan
  if (Number(event.data.amount) !== order.amount) {
    console.error("Nominal tidak cocok:", orderId, event.data.amount, order.amount);
    return NextResponse.json({ error: "Nominal tidak cocok" }, { status: 400 });
  }

  if (order.status === "PENDING" || order.status === "FAILED") {
    await updateOrder(orderId, {
      status: "PAID",
      gatewayRef: event.data.payment_request_id ?? order.gatewayRef,
    });
  }

  try {
    const result = await provisionOrder(orderId);
    console.log("Provisioning selesai:", orderId, "server", result.serverId, "alreadyDone", result.alreadyDone);
  } catch (e) {
    // Balas non-2xx agar Kasera mengirim ulang. Order tetap PAID dan akan dicoba lagi.
    console.error("Provisioning gagal:", orderId, e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
