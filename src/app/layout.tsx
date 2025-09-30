import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css"; // <-- A LINHA MÁGICA QUE ESTAVA FALTANDO!

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Sistema de Engenharia",
  description: "Gerenciamento de Liberação de Códigos",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-br">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
