"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3Icon, HomeIcon, ShuffleIcon, StoreIcon, UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// TESTE (spike/bottom-nav): barra fixa no pé da tela, só no celular, para ver como
// convive com a barra do Safari. Não vai para a main assim.
const ITEMS = [
  { href: "/", label: "Início", icon: HomeIcon, match: (path: string) => path === "/" },
  { href: "/rodadas", label: "Rodadas", icon: ShuffleIcon, match: (path: string) => path.startsWith("/rodadas") },
  { href: "/carreira", label: "Carreira", icon: BarChart3Icon, match: (path: string) => path.startsWith("/jogadores") },
  { href: "/loja", label: "Loja", icon: StoreIcon, match: (path: string) => path.startsWith("/loja") },
  { href: "/elenco", label: "Eu", icon: UserIcon, match: (path: string) => path.startsWith("/elenco") },
] as const;

export function BottomNav() {
  return <BottomNavView pathname={usePathname()} />;
}

/** Sem destaque: aparece enquanto a rota (dado dinâmico) não chega, dentro do `<Suspense>`. */
export function BottomNavView({ pathname }: { pathname: string }) {
  // A mesa tática já tem a barra "Votar e enviar" no mesmo lugar.
  if (/^\/rodadas\/[^/]+$/.test(pathname)) return null;

  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
    >
      <ul className="grid h-16 grid-cols-5">
        {ITEMS.map(({ href, label, icon: Icon, match }) => {
          const isActive = match(pathname);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex h-full flex-col items-center justify-center gap-1 text-xs",
                  isActive ? "font-semibold text-primary" : "text-muted-foreground",
                )}
              >
                <Icon aria-hidden className="size-5" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
