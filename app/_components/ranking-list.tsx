import Link from "next/link";
import { OvrBadge } from "@/components/ovr-badge";
import { OvrDelta } from "@/components/ovr-delta";
import { cn } from "@/lib/utils";
import { POSITION_LABELS } from "@/types/player";
import type { RankedPlayer } from "../_data-access/get-home-data";

type RankingListProps = {
  title: string;
  players: RankedPlayer[];
  currentPlayerId: string;
};

export function RankingList({ title, players, currentPlayerId }: RankingListProps) {
  return (
    <div className="flex flex-col gap-1">
      <h3 className="px-2 pb-1 text-xs font-medium text-muted-foreground uppercase">{title}</h3>
      <ol className="flex flex-col">
        {players.map(({ player, position, delta }) => (
          <li key={player.id}>
            <Link
              href={`/jogadores/${player.id}`}
              className={cn(
                "flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted",
                player.id === currentPlayerId && "bg-muted/60",
              )}
            >
              <span className="w-4 text-sm text-muted-foreground tabular-nums">{position}</span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-medium">{player.nickname}</span>
                <span className="text-xs text-muted-foreground">
                  {POSITION_LABELS[player.position]}
                </span>
              </span>
              <OvrDelta delta={delta} className="text-xs" />
              <OvrBadge ovr={player.ovr} />
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
