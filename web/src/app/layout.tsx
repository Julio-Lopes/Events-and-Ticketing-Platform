import type { Metadata } from "next";
import { Archivo, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { SiteHeader } from "@/components/site-header";

/**
 * Dois pontos de import, nao mais. O nome da variavel gerada pelo
 * next/font (--font-archivo, --font-plex-mono) fica desacoplado do
 * nome semantico (--font-sans, --font-mono) usado no resto do app:
 * o mapeamento entre os dois vive so no @theme do globals.css. Trocar
 * a fonte no futuro exige mudar dois arquivos, nunca os componentes.
 */
const archivo = Archivo({
  subsets: ["latin", "latin-ext"],
  variable: "--font-archivo",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Bilheteria",
  description: "Plataforma de eventos e ingressos.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${archivo.variable} ${plexMono.variable}`}>
      <body>
        <AuthProvider>
          <SiteHeader />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}