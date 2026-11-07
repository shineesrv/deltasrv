import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "deltasrv | Panel Pterodactyl murah",
  description: "Atur sendiri RAM, disk, dan CPU server game kamu. Bayar dengan QRIS, server aktif otomatis.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <body className="antialiased">{children}</body>
    </html>
  );
}
