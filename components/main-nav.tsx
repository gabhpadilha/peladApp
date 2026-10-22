"use client";

import { useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3Icon,
  HomeIcon,
  ShuffleIcon,
  StoreIcon,
  UserIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";
import { LevelBadge } from "@/components/player-card";
import { cn } from "@/lib/utils";
import type { Player } from "@/types/player";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  isActive: (pathname: string) => boolean;
  /** Só o Administrador (gestão de cadastro). */
  ownerOnly?: boolean;
};

const NAV_ITEMS: readonly NavItem[] = [
  { href: "/", label: "Início", icon: HomeIcon, isActive: (path) => path === "/" },
  { href: "/rodadas", label: "Rodadas", icon: ShuffleIcon, isActive: (path) => path.startsWith("/rodadas") },
  { href: "/carreira", label: "Carreira", icon: BarChart3Icon, isActive: (path) => path.startsWith("/jogadores") },
  { href: "/loja", label: "Loja", icon: StoreIcon, isActive: (path) => path.startsWith("/loja") },
  { href: "/elenco", label: "Elenco", icon: UsersIcon, isActive: (path) => path.startsWith("/elenco"), ownerOnly: true },
  { href: "/eu", label: "Eu", icon: UserIcon, isActive: (path) => path.startsWith("/eu") },
];


export type MainNavProps = {
  /** `bottom`: barra fixa no pé da tela (celular). `top`: no cabeçalho (computador). */
  variant: "top" | "bottom";
  /** Administrador: ganha o botão Elenco. */
  isOwner: boolean;
  /** Selo de nível no "Eu" do computador; sem ele, só o ícone. */
  currentPlayer?: Player;
};

/*
 * Enquanto a sessão de uma página nova carrega, a navegação aparece provisória
 * (`MainNavPlaceholder`). Ela usa o que o aparelho já sabe (é Administrador?),
 * para o botão Elenco não sumir e voltar a cada troca de página.
 */
const OWNER_STORAGE_KEY = "peladapp_nav_owner";
let rememberedOwner: boolean | null = null;

function readRememberedOwner(): boolean {
  if (rememberedOwner === null) {
    try {
      rememberedOwner = window.sessionStorage.getItem(OWNER_STORAGE_KEY) === "1";
    } catch {
      rememberedOwner = false;
    }
  }
  return rememberedOwner;
}

function rememberOwner(isOwner: boolean) {
  if (rememberedOwner === isOwner) return;
  rememberedOwner = isOwner;
  try {
    window.sessionStorage.setItem(OWNER_STORAGE_KEY, isOwner ? "1" : "0");
  } catch {
    // Sem armazenamento (aba privada): só a troca de página fica sem a memória.
  }
}

/** Nada muda por fora durante a tela: a leitura serve só para separar servidor e aparelho. */
function subscribeNothing() {
  return () => {};
}

/** Navegação principal: a mesma lista no celular (embaixo) e no computador (em cima). */
export function MainNav(props: MainNavProps) {
  const { isOwner } = props;
  useEffect(() => rememberOwner(isOwner), [isOwner]);
  return <MainNavView {...props} pathname={usePathname()} />;
}

/** Provisória, dentro do `<Suspense>`: no servidor sai sem Elenco e sem destaque; no aparelho, com o que ele já sabe. */
export function MainNavPlaceholder(props: Omit<MainNavProps, "isOwner">) {
  const isOwner = useSyncExternalStore(subscribeNothing, readRememberedOwner, () => false);
  const pathname = useSyncExternalStore(subscribeNothing, () => window.location.pathname, () => "");
  return <MainNavView {...props} isOwner={isOwner} pathname={pathname} />;
}

/** Sem rota (`pathname` vazio): aparece sem destaque enquanto o `<Suspense>` carrega. */
export function MainNavView({ variant, isOwner, currentPlayer, pathname }: MainNavProps & { pathname: string }) {
  const items = NAV_ITEMS.filter((item) => isOwner || !item.ownerOnly);

  if (variant === "top") {
    return (
      <nav aria-label="Principal" className="hidden items-center gap-1 sm:flex">
        {items.map(({ href, label, icon: Icon, isActive }) => {
          const isCurrent = isActive(pathname);
          const isMe = href === "/eu";
          return (
            <Link
              key={href}
              href={href}
              aria-current={isCurrent ? "page" : undefined}
              className={cn(
                "flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors",
                isCurrent ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                isMe && currentPlayer && "pl-1.5",
              )}
            >
              {isMe && currentPlayer ? <LevelBadge player={currentPlayer} /> : <Icon aria-hidden className="size-4" />}
              {label}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav
      aria-label="Principal"
      // `data-bottom-nav`: o <body> reserva o espaço da barra só onde ela aparece.
      data-bottom-nav
      className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
    >
      <ul className={cn("grid h-16", items.length > 5 ? "grid-cols-6" : "grid-cols-5")}>
        {items.map(({ href, label, icon: Icon, isActive }) => {
          const isCurrent = isActive(pathname);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={isCurrent ? "page" : undefined}
                className={cn(
                  "flex h-full flex-col items-center justify-center gap-1",
                  // Com 6 botões (Administrador), letra um pouco menor para caber.
                  items.length > 5 ? "text-[11px]" : "text-xs",
                  isCurrent ? "font-semibold text-primary" : "text-muted-foreground",
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
