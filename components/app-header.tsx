import Link from "next/link";
import { LogOutIcon, UsersIcon } from "lucide-react";
import { signOut } from "@/app/_actions/sign-out";
import { OvrBadge } from "@/components/ovr-badge";
import type { Player } from "@/types/player";

type AppHeaderProps = {
  /** Jogador logado (apelido + OVR). Omitido onde ainda não há carta para mostrar. */
  currentPlayer?: Player;
};

const NAV_LINK = "flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:px-3";

export function AppHeader({ currentPlayer }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-20 border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-2 px-4">
        <Link href="/" className="font-display text-2xl font-extrabold tracking-wide uppercase">
          Pelad<span className="text-primary">App</span>
        </Link>
        <nav aria-label="Principal" className="flex items-center gap-0.5 sm:gap-1">
          <Link href="/pelada" className={NAV_LINK} aria-label="Pelada">
            <UsersIcon aria-hidden className="size-4" />
            <span className="hidden sm:inline">Pelada</span>
          </Link>
          {currentPlayer && (
            // Perfil com carta, desempenho e coleção (#colecao).
            <Link
              href={`/jogadores/${currentPlayer.id}`}
              aria-label={`Meu perfil: ${currentPlayer.nickname}`}
              className="flex items-center gap-2 rounded-lg py-1 pr-1 pl-2.5 text-sm font-medium transition-colors hover:bg-muted"
            >
              <span className="hidden sm:inline">{currentPlayer.nickname}</span>
              <OvrBadge ovr={currentPlayer.ovr} />
            </Link>
          )}
          <form action={signOut}>
            <button type="submit" className={NAV_LINK} aria-label="Sair da conta">
              <LogOutIcon aria-hidden className="size-4" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </form>
        </nav>
      </div>
    </header>
  );
}
