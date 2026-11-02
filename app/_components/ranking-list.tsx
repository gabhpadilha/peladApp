import Link from "next/link";
import { OvrBadge } from "@/components/ovr-badge";
import { PlayerCard } from "@/components/player-card";
import { cn } from "@/lib/utils";
import { POSITION_LABELS } from "@/types/player";
import type { RankedPlayer } from "../_data-access/get-home-data";

type RankingListProps = {
  players: RankedPlayer[];
  currentPlayerId: string;
};

export function RankingList({ players, currentPlayerId }: RankingListProps) {
  return (
    <ol className="flex flex-col">
      {players.map(({ player, position, points, rounds }) => (
        <li key={player.id}>
          <Link
            href={`/jogadores/${player.id}`}
            className={cn(
              "flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted",
              player.id === currentPlayerId && "bg-muted/60",
            )}
          >
            <span className="w-4 text-sm text-muted-foreground tabular-nums">{position}</span>
            {/* Miniatura da carta (com a foto, quando tem): a carta escala pela largura. */}
            <div className="w-16 shrink-0 sm:w-20">
              <PlayerCard player={player} size="fill" />
            </div>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate font-medium">{player.nickname}</span>
              <span className="text-xs text-muted-foreground">
                {POSITION_LABELS[player.position]} · {rounds === 1 ? "1 rodada" : `${rounds} rodadas`}
              </span>
            </span>
            <OvrBadge ovr={player.ovr} />
            <span className="flex w-14 flex-col items-end leading-none">
              <span className="font-display text-xl font-bold tabular-nums">{points}</span>
              <span className="text-[10px] text-muted-foreground uppercase">pontos</span>
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
