import { notFound } from "next/navigation";
import { getOrder, type OrderStatus } from "@/lib/orders";
import { rupiah } from "@/lib/pricing";

export const dynamic = "force-dynamic";

const STATUS_INFO: Record<OrderStatus, { title: string; body: string }> = {
  PENDING: {
    title: "Menunggu pembayaran",
    body: "Selesaikan pembayaran di halaman checkout. Muat ulang halaman ini setelah membayar untuk melihat statusnya.",
  },
  PAID: {
    title: "Pembayaran diterima",
    body: "Server kamu sedang disiapkan. Ini biasanya selesai dalam beberapa menit. Muat ulang halaman ini untuk melihat perkembangannya.",
  },
  PROVISIONED: {
    title: "Server kamu sudah aktif",
    body: "Akun panel sudah dibuat dengan email kamu. Buka panel, pilih Lupa Password, lalu masukkan email untuk membuat password baru.",
  },
  FAILED: {
    title: "Pembayaran belum berhasil",
    body: "Pesanan ini tidak bisa diproses. Kembali ke halaman utama dan buat pesanan baru.",
  },
};

export default async function OrderPage({ params }: { params: { id: string } }) {
  const order = await getOrder(params.id);
  if (!order) notFound();

  const info = STATUS_INFO[order.status];
  const panel = process.env.PTERO_URL;

  return (
    <main className="mx-auto max-w-xl px-6 py-20">
      <a href="/" className="text-sm text-[var(--muted)] hover:text-[var(--text)]">
        Kembali ke halaman utama
      </a>

      <h1 className="display mt-10 text-4xl">{info.title}</h1>
      <p className="mt-4 leading-relaxed text-[var(--muted)]">{info.body}</p>

      <dl className="mt-10 divide-y divide-[var(--line)] rounded-2xl border border-[var(--line)] bg-[var(--panel)] px-6">
        <div className="flex justify-between py-4">
          <dt className="text-[var(--muted)]">Nomor pesanan</dt>
          <dd className="font-mono text-sm">{order.id}</dd>
        </div>
        <div className="flex justify-between py-4">
          <dt className="text-[var(--muted)]">Nama server</dt>
          <dd>{order.name}</dd>
        </div>
        <div className="flex justify-between py-4">
          <dt className="text-[var(--muted)]">Spesifikasi</dt>
          <dd>
            {order.ram} GB RAM, {order.disk} GB disk, {order.cpu}% CPU
          </dd>
        </div>
        <div className="flex justify-between py-4">
          <dt className="text-[var(--muted)]">Total</dt>
          <dd>{rupiah(order.amount)}</dd>
        </div>
      </dl>

      {order.status === "PROVISIONED" && panel && (
        <a
          href={panel}
          target="_blank"
          rel="noreferrer"
          className="mt-8 inline-block rounded-lg bg-[var(--accent)] px-6 py-3 font-semibold text-[#1a1305] transition hover:brightness-110"
        >
          Buka panel
        </a>
      )}

      {order.status === "PENDING" && (
        <a
          href={`/order/${order.id}`}
          className="mt-8 inline-block text-sm text-[var(--accent)] underline underline-offset-4"
        >
          Muat ulang status
        </a>
      )}
    </main>
  );
}
