import crypto from "crypto";

const BASE = "https://pay.kasera.id/v1";

export async function createPayment(p: {
  orderId: string;
  amount: number;
  description: string;
  customerName: string;
  customerEmail: string;
  returnUrl: string;
}): Promise<{ id: string; checkoutUrl: string; livemode: boolean }> {
  const apiKey = process.env.KASERA_API_KEY;
  if (!apiKey) throw new Error("KASERA_API_KEY belum diisi");

  const res = await fetch(`${BASE}/transactions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      // Mencegah pembayaran ganda jika request ini di-retry
      "Idempotency-Key": p.orderId,
    },
    body: JSON.stringify({
      amount: p.amount,
      description: p.description.slice(0, 255),
      external_id: p.orderId,
      customer: {
        name: p.customerName.slice(0, 120), // nama wajib untuk Virtual Account
        email: p.customerEmail,
      },
      return_url: p.returnUrl,
      expires_in_minutes: 60,
    }),
    cache: "no-store",
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Kasera ${res.status}: ${JSON.stringify(data)}`);
  }

  return {
    id: data.id,
    checkoutUrl: data.checkout_url,
    livemode: data.livemode,
  };
}

// Header: "t=<unix>,v1=<hex>[,v1=<hex>]". v1 = HMAC-SHA256 atas `${t}.${rawBody}`.
export function verifyWebhook(rawBody: string, header: string | null, toleranceSec = 300): boolean {
  const secret = process.env.KASERA_WEBHOOK_SECRET;
  if (!secret || !header) return false;

  const parts = header.split(",");
  const t = Number(parts.find((p) => p.startsWith("t="))?.slice(2));
  if (!Number.isFinite(t)) return false;
  if (Math.abs(Date.now() / 1000 - t) > toleranceSec) return false;

  const expected = Buffer.from(
    crypto.createHmac("sha256", secret).update(`${t}.${rawBody}`).digest("hex")
  );

  // Terima jika salah satu entri v1 cocok (masa transisi rotasi secret)
  return parts
    .filter((p) => p.startsWith("v1="))
    .some((p) => {
      const sig = Buffer.from(p.slice(3));
      return sig.length === expected.length && crypto.timingSafeEqual(sig, expected);
    });
}
