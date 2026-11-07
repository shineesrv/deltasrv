import { randomBytes } from "crypto";
import { acquireLock, getOrder, releaseLock, updateOrder } from "./orders";
import { createServer, createUser, findUserIdByEmail } from "./pterodactyl";

export type ProvisionResult = {
  alreadyDone: boolean;
  userId: number;
  serverId: number;
  panel: string;
};

// Membuat user dan server di Pterodactyl. Aman dipanggil berulang.
export async function provisionOrder(orderId: string): Promise<ProvisionResult> {
  const order = await getOrder(orderId);
  if (!order) throw new Error("Order tidak ditemukan");

  const panel = process.env.PTERO_URL ?? "";

  if (order.status === "PROVISIONED" && order.pteroUserId && order.pteroServerId) {
    return { alreadyDone: true, userId: order.pteroUserId, serverId: order.pteroServerId, panel };
  }
  if (order.status !== "PAID") {
    throw new Error(`Order belum dibayar (status: ${order.status})`);
  }

  const lockName = `provision:${orderId}`;
  const locked = await acquireLock(lockName);
  if (!locked) throw new Error("Provisioning untuk order ini sedang berjalan");

  try {
    // Baca ulang setelah mendapat lock, karena proses lain mungkin sudah menyelesaikannya
    const fresh = await getOrder(orderId);
    if (!fresh) throw new Error("Order tidak ditemukan");
    if (fresh.status === "PROVISIONED" && fresh.pteroUserId && fresh.pteroServerId) {
      return { alreadyDone: true, userId: fresh.pteroUserId, serverId: fresh.pteroServerId, panel };
    }

    // Pakai user yang sudah ada jika email sudah terdaftar atau user dibuat pada percobaan sebelumnya
    let userId = fresh.pteroUserId ?? (await findUserIdByEmail(fresh.email));
    if (!userId) {
      const username = `cust_${randomBytes(4).toString("hex")}`;
      // Password acak. Pelanggan membuat password sendiri lewat "Lupa Password" di panel.
      const password = randomBytes(18).toString("base64url");
      userId = await createUser(fresh.email, username, password);
    }

    // Simpan userId dulu agar retry tidak membuat user baru
    await updateOrder(orderId, { pteroUserId: userId });

    const serverId = await createServer({
      userId,
      name: fresh.name,
      ram: fresh.ram,
      disk: fresh.disk,
      cpu: fresh.cpu,
    });

    await updateOrder(orderId, { status: "PROVISIONED", pteroServerId: serverId });

    return { alreadyDone: false, userId, serverId, panel };
  } finally {
    await releaseLock(lockName);
  }
}
