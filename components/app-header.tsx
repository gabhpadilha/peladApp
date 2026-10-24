import { Suspense } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { MainNav, MainNavPlaceholder, type MainNavProps } from "@/components/main-nav";
import { LevelBadge } from "@/components/player-card";
import { getActiveMembership, getUserId } from "@/lib/session";
import type { Player } from "@/types/player";

type AppHeaderProps = {
  /** Jogador logado (selo de nível no "Eu" do computador e no canto do cabeçalho do celular). Omitido onde ainda não há carta para mostrar. */
  currentPlayer?: Player;
};

/** Lê na sessão se é o Administrador (botão Elenco). Deduplicado por requisição em `lib/session.ts`. */
async function NavWithAccess(props: Omit<MainNavProps, "isOwner">) {
  const userId = await getUserId();
  const membership = userId ? await getActiveMembership(userId) : null;
  return <MainNav {...props} isOwner={membership?.isOwner ?? false} />;
}

/**
 * Cabeçalho com o logo e a navegação principal: no computador, os botões ficam
 * aqui em cima; no celular, numa barra fixa no pé da tela (uma navegação por aparelho).
 */
export function AppHeader({ currentPlayer }: AppHeaderProps) {
  return (
    <>
      <header className="sticky top-0 z-20 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-2 px-4">
          <Link href="/">
            <BrandLogo />
          </Link>
          <Suspense fallback={<MainNavPlaceholder variant="top" currentPlayer={currentPlayer} />}>
            <NavWithAccess variant="top" currentPlayer={currentPlayer} />
          </Suspense>
          {/* Celular: só o selo de nível no canto, levando à própria conta (o "Eu" fica na barra de baixo). */}
          {currentPlayer && (
            <Link
              href="/eu"
              aria-label={`Eu · Nível ${currentPlayer.level ?? 0}`}
              className="-mr-1 flex size-11 items-center justify-center sm:hidden"
            >
              <LevelBadge player={currentPlayer} className="h-9 w-[25px]" />
            </Link>
          )}
        </div>
      </header>
      {/* Fora do header: o backdrop-blur dele prenderia o `fixed` dentro do cabeçalho. */}
      <Suspense fallback={<MainNavPlaceholder variant="bottom" />}>
        <NavWithAccess variant="bottom" />
      </Suspense>
    </>
  );
}
