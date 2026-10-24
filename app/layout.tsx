import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Geist, Geist_Mono } from "next/font/google";
import { PlayerCardDefs } from "@/components/player-card";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

export const metadata: Metadata = {
  title: "PeladApp",
  description: "Avaliações pós-jogo, cartinhas e sorteio equilibrado para a pelada semanal.",
  // iPhone: "Adicionar à Tela de Início" abre em tela cheia, com o nome curto embaixo do ícone.
  appleWebApp: { capable: true, title: "PeladApp", statusBarStyle: "black" },
};

export const viewport: Viewport = {
  themeColor: "#0b130f",
  colorScheme: "dark",
  // Libera env(safe-area-inset-bottom): a barra de baixo fica acima da área do gesto do iPhone.
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`dark ${geistSans.variable} ${geistMono.variable} ${barlowCondensed.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col has-[[data-bottom-nav]]:pb-[calc(4rem+env(safe-area-inset-bottom))] sm:has-[[data-bottom-nav]]:pb-0">
        <PlayerCardDefs />
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
