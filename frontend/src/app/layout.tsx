import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";

export const metadata: Metadata = {
  title: "Zuri Agency",
  description: "Encontra, avalia e converte empresas locais em clientes, com IA.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
