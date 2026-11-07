"use client";

import { useMemo, useState, type FormEvent } from "react";
import { PRICE, RANGE, calcPrice, rupiah, type Spec } from "@/lib/pricing";

const BRAND = "deltasrv";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SLIDERS: { key: keyof Spec; label: string; unit: string; hint: string }[] = [
  { key: "ram", label: "Memori (RAM)", unit: "GB", hint: `${rupiah(PRICE.ramPerGB)} per GB` },
  { key: "disk", label: "Penyimpanan", unit: "GB", hint: `${rupiah(PRICE.diskPerGB)} per GB` },
  { key: "cpu", label: "CPU", unit: "%", hint: `${rupiah(PRICE.cpuPer10)} per 10%` },
];

export default function Home() {
  const [spec, setSpec] = useState<Spec>({ ram: 2, disk: 20, cpu: 100 });
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = useMemo(() => calcPrice(spec), [spec]);
  const valid = name.trim().length >= 3 && EMAIL_RE.test(email.trim());

  // Rincian harga, ditampilkan seperti struk
  const lines = [
    { label: `${spec.ram} GB memori`, value: spec.ram * PRICE.ramPerGB },
    { label: `${spec.disk} GB penyimpanan`, value: spec.disk * PRICE.diskPerGB },
    { label: `${spec.cpu}% CPU`, value: (spec.cpu / 10) * PRICE.cpuPer10 },
  ];

  function update(key: keyof Spec, value: number) {
    setSpec((s) => ({ ...s, [key]: value }));
  }

  async function checkout(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!valid || loading) return;

    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...spec, name: name.trim(), email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Pesanan gagal dibuat");
      window.location.href = data.paymentUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <span className="display text-xl">{BRAND}</span>
        <span className="text-sm text-[var(--muted)]">Pembayaran QRIS dan Virtual Account</span>
      </header>

      <div className="mx-auto grid max-w-6xl gap-14 px-6 pb-24 pt-10 lg:grid-cols-[1.05fr_1fr] lg:pt-16">
        <section className="flex flex-col justify-center">
          <h1 className="display text-5xl leading-[1.04] sm:text-6xl">
            Server game yang bisa kamu atur sendiri.
          </h1>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-[var(--muted)]">
            Pilih memori, penyimpanan, dan CPU sesuai kebutuhan. Bayar dengan QRIS, lalu panel kamu disiapkan otomatis.
          </p>
          <p className="mt-8 text-sm text-[var(--muted)]">
            Mulai dari {rupiah(PRICE.ramPerGB)} per GB memori. Tanpa kontrak.
          </p>
        </section>

        <section
          aria-labelledby="configurator"
          className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-7 sm:p-9"
        >
          <h2 id="configurator" className="sr-only">
            Atur spesifikasi server
          </h2>

          <form onSubmit={checkout} className="space-y-8">
            {SLIDERS.map((s) => {
              const r = RANGE[s.key];
              const id = `range-${s.key}`;
              return (
                <div key={s.key}>
                  <div className="mb-3 flex items-baseline justify-between">
                    <label htmlFor={id} className="font-medium">
                      {s.label}
                    </label>
                    <span className="tabular-nums">
                      <span className="text-lg font-semibold">{spec[s.key]}</span>{" "}
                      <span className="text-sm text-[var(--muted)]">{s.unit}</span>
                    </span>
                  </div>
                  <input
                    id={id}
                    type="range"
                    min={r.min}
                    max={r.max}
                    step={r.step}
                    value={spec[s.key]}
                    onChange={(e) => update(s.key, Number(e.target.value))}
                    aria-describedby={`${id}-hint`}
                  />
                  <p id={`${id}-hint`} className="mt-2 text-xs text-[var(--muted)]">
                    {s.hint}
                  </p>
                </div>
              );
            })}

            <div className="rounded-xl border border-dashed border-[var(--line)] p-5">
              <ul className="space-y-2 text-sm">
                {lines.map((l) => (
                  <li key={l.label} className="flex justify-between text-[var(--muted)]">
                    <span>{l.label}</span>
                    <span className="tabular-nums">{rupiah(l.value)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex items-end justify-between border-t border-[var(--line)] pt-4">
                <span className="text-sm text-[var(--muted)]">Total per bulan</span>
                <span className="display text-3xl tabular-nums">{rupiah(total)}</span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="mb-2 block text-sm text-[var(--muted)]">
                  Nama server
                </label>
                <input
                  id="name"
                  className="field"
                  value={name}
                  maxLength={50}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Server Budi"
                  autoComplete="off"
                />
              </div>
              <div>
                <label htmlFor="email" className="mb-2 block text-sm text-[var(--muted)]">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  className="field"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  autoComplete="email"
                />
              </div>
            </div>

            {error && (
              <p role="alert" className="text-sm text-[var(--danger)]">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={!valid || loading}
              className="w-full rounded-lg bg-[var(--accent)] py-3.5 font-semibold text-[#1a1305] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? "Membuat pembayaran..." : "Bayar sekarang"}
            </button>

            <p className="text-center text-xs text-[var(--muted)]">
              Pembayaran diproses oleh Kasera Pay. Server aktif otomatis setelah pembayaran diterima.
            </p>
          </form>
        </section>
      </div>
    </main>
  );
}
