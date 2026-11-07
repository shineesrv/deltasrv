// Penyimpanan order. Memakai Upstash Redis (REST) jika dikonfigurasi.
// Tanpa Redis, data disimpan di memori: hanya cocok untuk pengembangan lokal,
// karena di Vercel data akan hilang saat instance berganti.

export type OrderStatus = "PENDING" | "PAID" | "PROVISIONED" | "FAILED";

export type Order = {
  id: string;
  status: OrderStatus;
  name: string;
  email: string;
  ram: number;
  disk: number;
  cpu: number;
  amount: number;
  gatewayRef?: string;
  pteroUserId?: number;
  pteroServerId?: number;
  createdAt: number;
};

const memory = new Map<string, string>();
const hasRedis = Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

if (!hasRedis && process.env.NODE_ENV === "production") {
  console.warn("UPSTASH_REDIS_REST_URL belum diisi. Order akan hilang di produksi.");
}

async function redis(command: (string | number)[]): Promise<any> {
  const res = await fetch(process.env.UPSTASH_REDIS_REST_URL!, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN!}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  const data = await res.json();
  if (data.error) throw new Error(`Redis: ${data.error}`);
  return data.result;
}

async function kvGet(key: string): Promise<string | null> {
  if (!hasRedis) return memory.get(key) ?? null;
  return (await redis(["GET", key])) ?? null;
}

async function kvSet(key: string, value: string): Promise<void> {
  if (!hasRedis) {
    memory.set(key, value);
    return;
  }
  await redis(["SET", key, value]);
}

export async function saveOrder(o: Order): Promise<void> {
  await kvSet(`order:${o.id}`, JSON.stringify(o));
}

export async function getOrder(id: string): Promise<Order | null> {
  const raw = await kvGet(`order:${id}`);
  return raw ? (JSON.parse(raw) as Order) : null;
}

export async function updateOrder(id: string, patch: Partial<Order>): Promise<Order> {
  const current = await getOrder(id);
  if (!current) throw new Error(`Order ${id} tidak ditemukan`);
  const next = { ...current, ...patch };
  await kvSet(`order:${id}`, JSON.stringify(next));
  return next;
}

// Lock sederhana agar dua webhook yang datang bersamaan tidak membuat server dobel.
export async function acquireLock(name: string): Promise<boolean> {
  const key = `lock:${name}`;
  if (!hasRedis) {
    if (memory.has(key)) return false;
    memory.set(key, "1");
    return true;
  }
  // Kunci kedaluwarsa otomatis setelah 120 detik jika proses terhenti
  const res = await redis(["SET", key, "1", "NX", "EX", 120]);
  return res === "OK";
}

export async function releaseLock(name: string): Promise<void> {
  const key = `lock:${name}`;
  if (!hasRedis) {
    memory.delete(key);
    return;
  }
  await redis(["DEL", key]);
}
