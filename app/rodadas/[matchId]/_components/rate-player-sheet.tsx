"use client";

import { AttributeSlider } from "@/app/avaliar/[matchId]/_components/attribute-slider";
import { OffPositionBadge } from "@/components/off-position-badge";
import { PlayerCard } from "@/components/player-card";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { countFilled, getAttributeKeys, isDraftComplete, type ScoreDraft } from "@/lib/rating-drafts";
import { teamRoleLabel } from "@/lib/teams";
import { ATTRIBUTE_LABELS, POSITION_LABELS, type PlayerAttribute } from "@/types/player";
import type { BoardPlayer } from "../_data-access/get-match-board";

type RatePlayerSheetProps = {
  entry: BoardPlayer | null;
  draft: ScoreDraft | undefined;
  onScore: (playerId: string, key: PlayerAttribute, value: number) => void;
  onClear: (playerId: string) => void;
  onClose: () => void;
};

/** Notas de um jogador (6 sliders), aberta ao tocar na carta da mesa tática. */
export function RatePlayerSheet({ entry, draft, onScore, onClear, onClose }: RatePlayerSheetProps) {
  const player = entry?.player;
  // Papel da rodada: quem jogou no gol recebe notas de goleiro.
  const filled = entry ? countFilled(entry.role, draft) : 0;
  const isComplete = entry ? isDraftComplete(entry.role, draft) : false;

  return (
    <Sheet open={entry !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="mx-auto max-h-[92dvh] w-full max-w-md gap-0 overflow-hidden rounded-t-2xl">
        {entry && player && (
          <>
            <SheetHeader className="flex-row items-center gap-4 border-b pb-4">
              <div className="w-20 shrink-0">
                <PlayerCard player={player} size="fill" />
              </div>
              <div className="min-w-0 text-left">
                <SheetDescription className="text-xs uppercase">
                  {teamRoleLabel(entry.team, entry.isReserve)} · {POSITION_LABELS[player.position]}
                </SheetDescription>
                <SheetTitle className="truncate font-display text-3xl font-bold">{player.nickname}</SheetTitle>
                <p className="text-sm text-muted-foreground tabular-nums">{filled}/6 atributos</p>
                {entry.playsInGoal !== null && <OffPositionBadge role={entry.role} withHint className="mt-1" />}
              </div>
            </SheetHeader>

            <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-4 py-5">
              {getAttributeKeys(entry.role).map((key) => (
                <AttributeSlider
                  key={`${player.id}-${key}`}
                  id={`board-score-${player.id}-${key}`}
                  abbreviation={ATTRIBUTE_LABELS[key].abbreviation}
                  name={ATTRIBUTE_LABELS[key].name}
                  value={draft?.[key] ?? null}
                  onChange={(value) => onScore(player.id, key, value)}
                />
              ))}
            </div>

            <div className="flex gap-2 border-t bg-background px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <Button
                type="button"
                variant="ghost"
                size="lg"
                className="h-12"
                disabled={filled === 0}
                onClick={() => onClear(player.id)}
              >
                Limpar
              </Button>
              <Button type="button" size="lg" className="h-12 flex-1 text-base" disabled={!isComplete} onClick={onClose}>
                {isComplete ? "Pronto" : `Faltam ${6 - filled} atributos`}
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
