import type { AwardKind } from "@/types/award";
import type { Player } from "@/types/player";

const MAX_CARD_VALUE = 99;

/** Prêmios que somam +1 no OVR e em cada atributo (como o Team of the Week da EA FC). */
export const BOOSTED_AWARDS: readonly AwardKind[] = ["craque", "gol"];

function boost(value: number | null): number | null {
  return value === null ? null : Math.min(MAX_CARD_VALUE, value + 1);
}

/**
 * Carta como ficaria com o prêmio, para prévias. As cartas reais são geradas
 * no banco por `compute_match_awards`/`award_card_value`: mudou lá, mude aqui.
 */
export function withAwardBonus(player: Player, kind: AwardKind): Player {
  if (!BOOSTED_AWARDS.includes(kind)) return player;

  if (player.role === "goalkeeper") {
    return {
      ...player,
      ovr: boost(player.ovr),
      attributes: {
        ref: boost(player.attributes.ref),
        ela: boost(player.attributes.ela),
        pos: boost(player.attributes.pos),
        sai: boost(player.attributes.sai),
        rep: boost(player.attributes.rep),
        pes: boost(player.attributes.pes),
      },
    };
  }

  return {
    ...player,
    ovr: boost(player.ovr),
    attributes: {
      vel: boost(player.attributes.vel),
      chu: boost(player.attributes.chu),
      pas: boost(player.attributes.pas),
      dri: boost(player.attributes.dri),
      def: boost(player.attributes.def),
      fis: boost(player.attributes.fis),
    },
  };
}
