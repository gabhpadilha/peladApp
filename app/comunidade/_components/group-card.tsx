import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";
import { WEEKDAY_LABELS } from "@/lib/platform";
import type { CommunityGroup } from "../_data-access/community-data";

/** Uma pelada da vitrine: nome, cidade, dia do jogo e o líder do ranking. */
export function CommunityGroupCard({ group }: { group: CommunityGroup }) {
  const where = [group.city, group.state].filter(Boolean).join("/");
  const when = group.playWeekday === null ? null : `${WEEKDAY_LABELS[group.playWeekday]}${group.playTime ? ` · ${group.playTime}` : ""}`;
  return (
    <Link
      href={`/comunidade/${group.id}`}
      className="flex flex-col gap-3 rounded-xl border bg-card p-4 transition-colors hover:bg-muted"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-bold">{group.name}</h3>
          <p className="text-sm text-muted-foreground">
            {[where, when].filter(Boolean).join(" · ") || "Sem cidade cadastrada"}
          </p>
        </div>
        <ChevronRightIcon aria-hidden className="mt-1 size-5 shrink-0 text-muted-foreground" />
      </div>
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
        <span>{group.activePlayers} {group.activePlayers === 1 ? "jogador" : "jogadores"}</span>
        {group.isOwnGroup && <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-bold text-primary">Sua pelada</span>}
      </p>
      {group.leader && (
        <div className="flex items-center gap-3 rounded-lg bg-background/60 p-2.5">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted font-display text-xl font-extrabold tabular-nums">
            {group.leader.ovr ?? "–"}
          </span>
          <div className="min-w-0">
            <p className="truncate font-bold">{group.leader.nickname}</p>
            <p className="text-sm text-muted-foreground">Líder · {group.leader.points} pts</p>
          </div>
        </div>
      )}
    </Link>
  );
}
