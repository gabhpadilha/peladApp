import Link from "next/link";
import { OvrBadge } from "@/components/ovr-badge";
import type { Player } from "@/types/player";

type AppHeaderProps = {
  currentPlayer: Player;
};

export function AppHeader({ currentPlayer }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-20 border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
        <Link href="/" className="font-display text-2xl font-extrabold tracking-wide uppercase">
          Pelad<span className="text-primary">App</span>
        </Link>
        <Link
          href={`/jogadores/${currentPlayer.id}`}
          className="flex items-center gap-2 rounded-lg py-1 pr-1 pl-3 text-sm font-medium transition-colors hover:bg-muted"
        >
          {currentPlayer.nickname}
          <OvrBadge ovr={currentPlayer.ovr} />
        </Link>
      </div>
    </header>
  );
}
