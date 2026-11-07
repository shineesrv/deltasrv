export const PRICE = {
  ramPerGB: 1000, // Rp per GB RAM (1GB = Rp1.000)
  diskPerGB: 200, // Rp per GB disk
  cpuPer10: 500, // Rp per 10% CPU (100% = 1 core)
};

export const RANGE = {
  ram: { min: 1, max: 32, step: 1 }, // GB
  disk: { min: 5, max: 200, step: 5 }, // GB
  cpu: { min: 10, max: 400, step: 10 }, // %
};

export type Spec = { ram: number; disk: number; cpu: number };

type Range = { min: number; max: number; step: number };

function pick(value: unknown, r: Range): number {
  const n = Math.round(Number(value));
  const base = Number.isFinite(n) ? n : r.min;
  const stepped = Math.round(base / r.step) * r.step;
  return Math.min(r.max, Math.max(r.min, stepped));
}

// Membatasi dan merapikan input spesifikasi. Dipakai di server.
export function clampSpec(input: { ram?: unknown; disk?: unknown; cpu?: unknown }): Spec {
  return {
    ram: pick(input.ram, RANGE.ram),
    disk: pick(input.disk, RANGE.disk),
    cpu: pick(input.cpu, RANGE.cpu),
  };
}

export function calcPrice(s: Spec): number {
  return Math.round(
    s.ram * PRICE.ramPerGB + s.disk * PRICE.diskPerGB + (s.cpu / 10) * PRICE.cpuPer10
  );
}

export const rupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
