import { buildPlayers, getLatestClosedMatch, getOvrDelta, getRoundMvpId } from "@/lib/players";
import type { Player } from "@/types/player";
import { MOCK_EVALUATIONS, MOCK_MATCHES, MOCK_UPCOMING_MATCH } from "./matches";
import { MOCK_CURRENT_USER_ID, MOCK_PROFILES } from "./players";

/**
 * Fonte de dados temporária (substituída pelo Supabase). Monta o estado da
 * pelada a partir dos mocks; os `_data-access/` das rotas leem daqui.
 */
export function getMockLeague() {
  const latestClosedMatch = getLatestClosedMatch(MOCK_MATCHES);
  const players = buildPlayers(MOCK_PROFILES, MOCK_MATCHES, MOCK_EVALUATIONS);
  const previousPlayers = latestClosedMatch
    ? buildPlayers(MOCK_PROFILES, MOCK_MATCHES, MOCK_EVALUATIONS, {
        upToRound: latestClosedMatch.round - 1,
      })
    : [];
  const mvpId = latestClosedMatch ? getRoundMvpId(latestClosedMatch, MOCK_EVALUATIONS) : null;

  function getDelta(player: Player): number | null {
    return getOvrDelta(
      player,
      previousPlayers.find((previous) => previous.id === player.id),
    );
  }

  return {
    currentUserId: MOCK_CURRENT_USER_ID,
    matches: MOCK_MATCHES,
    evaluations: MOCK_EVALUATIONS,
    upcomingMatch: MOCK_UPCOMING_MATCH,
    players,
    latestClosedMatch,
    mvpId,
    getDelta,
  };
}

export type MockLeague = ReturnType<typeof getMockLeague>;
