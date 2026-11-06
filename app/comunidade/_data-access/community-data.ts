import "server-only";
import { parseCardTheme } from "@/lib/card-themes";
import { rankShowcase, toPublicCard, type ShowcasePlayer } from "@/lib/community";
import { saveShowcase } from "@/lib/community-showcase";
import { getLeague, readFrozenAttributes } from "@/lib/league";
import { toPlayerPhoto } from "@/lib/player-photo";
import { requireActiveMembership } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { isCardSkinKey } from "@/types/card-skin";
import type { Award, AwardKind } from "@/types/award";
import type { Json } from "@/types/database";
import { GOALKEEPER_ATTRIBUTES, OUTFIELD_ATTRIBUTES, type PlayerPosition } from "@/types/player";

export type CommunityGroup = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  playWeekday: number | null;
  playTime: string | null;
  activePlayers: number;
  publicPlayers: number;
  isOwnGroup: boolean;
  leader: { nickname: string; ovr: number | null; points: number } | null;
};

/** O recorte público da própria pelada some ou fica velho (peladas antigas, rodada excluída pelo admin): refaz depois de 1 hora. */
const SHOWCASE_MAX_AGE_MS = 60 * 60 * 1000;

/** Vitrine de peladas: as que estão ligadas (por padrão todas) e não suspensas, com o líder do ranking. */
export async function getCommunityGroups(): Promise<CommunityGroup[]> {
  const membership = await requireActiveMembership("/comunidade");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_listed_groups");
  if (error) throw error;

  // Quem é da pelada recalcula o recorte dela (sessão própria, nunca de outra pelada) se faltar ou estiver velho.
  if (data.some((group) => group.group_id === membership.groupId)) {
    const { data: own } = await supabase.rpc("get_group_showcase", { target_group: membership.groupId });
    const updatedAt = own?.[0]?.updated_at;
    if (!updatedAt || Date.now() - new Date(updatedAt).getTime() > SHOWCASE_MAX_AGE_MS) {
      try {
        await saveShowcase(membership.groupId, await getLeague("/comunidade"));
      } catch (refreshError) {
        console.error("getCommunityGroups: recorte da própria pelada", refreshError);
      }
    }
  }

  return Promise.all(
    data.map(async (group) => {
      const { data: showcase } = await supabase.rpc("get_group_showcase", { target_group: group.group_id });
      const players = readPlayers(showcase?.[0]?.players);
      const leader = rankShowcase(players, "points", "all")[0];
      return {
        id: group.group_id,
        name: group.name,
        city: group.city,
        state: group.state,
        playWeekday: group.play_weekday,
        playTime: group.play_time?.slice(0, 5) ?? null,
        activePlayers: group.active_players,
        publicPlayers: group.public_players,
        isOwnGroup: group.group_id === membership.groupId,
        leader: leader ? { nickname: leader.player.nickname, ovr: leader.player.ovr, points: leader.value } : null,
      };
    }),
  );
}

/** Um jogador do recorte vem de jsonb: confere o essencial antes de usar. */
function readPlayers(value: Json | undefined): ShowcasePlayer[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is ShowcasePlayer =>
      item !== null && typeof item === "object" && !Array.isArray(item) && typeof item.id === "string" && typeof item.nickname === "string",
  );
}

export type PublicGroup = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  playWeekday: number | null;
  playTime: string | null;
  players: ShowcasePlayer[];
  updatedAt: string | null;
};

/** Uma pelada da comunidade: nome, cidade, dia do jogo e os jogadores que aceitaram aparecer. `null` se não estiver ligada. */
export async function getPublicGroup(groupId: string): Promise<PublicGroup | null> {
  await requireActiveMembership(`/comunidade/${groupId}`);
  const { data, error } = await (await createClient()).rpc("get_group_showcase", { target_group: groupId });
  if (error) throw error;
  const row = data[0];
  if (!row) return null;
  return {
    id: row.group_id,
    name: row.name,
    city: row.city,
    state: row.state,
    playWeekday: row.play_weekday,
    playTime: row.play_time?.slice(0, 5) ?? null,
    players: readPlayers(row.players),
    updatedAt: row.updated_at,
  };
}

function toAward(row: { award_id: string; kind: string; theme: string; ovr: number | null; card_position: PlayerPosition; score: number | null; votes: number; attributes: Json; round: number; played_on: string }, base: ShowcasePlayer): Award {
  const frozen = row.card_position === "GOL" ? GOALKEEPER_ATTRIBUTES : OUTFIELD_ATTRIBUTES;
  const card = toPublicCard({
    ...base,
    position: row.card_position,
    ovr: row.ovr,
    attributes: readFrozenAttributes(row.attributes, frozen),
  });
  return {
    id: row.award_id,
    kind: row.kind as AwardKind,
    theme: parseCardTheme(row.theme),
    votes: row.votes,
    score: row.score === null ? null : Number(row.score),
    matchId: "",
    round: row.round,
    date: row.played_on,
    memberId: base.id,
    card,
  };
}

export type PublicAthlete = { group: PublicGroup; player: ShowcasePlayer; awards: Award[]; isOwnProfile: boolean };

/** Perfil público de um atleta (só se ele e a pelada aceitaram): carta, estatísticas, gols e galeria. */
export async function getPublicAthlete(groupId: string, memberId: string): Promise<PublicAthlete | null> {
  const membership = await requireActiveMembership(`/comunidade/${groupId}/${memberId}`);
  const group = await getPublicGroup(groupId);
  const player = group?.players.find((candidate) => candidate.id === memberId);
  if (!group || !player) return null;

  const { data, error } = await (await createClient()).rpc("get_public_awards", { target_member: memberId });
  if (error) throw error;
  return { group, player, awards: data.map((row) => toAward(row, player)), isOwnProfile: membership.memberId === memberId };
}

export type FeedPost = {
  id: string;
  createdAt: string;
  award: Award;
  groupId: string;
  groupName: string;
  city: string | null;
  state: string | null;
  reactions: Record<string, number>;
  myReaction: string | null;
  isMine: boolean;
};

/** Feed de conquistas publicadas (mais novas primeiro). */
export async function getFeed(): Promise<FeedPost[]> {
  await requireActiveMembership("/comunidade");
  const { data, error } = await (await createClient()).rpc("get_feed", { max_rows: 30 });
  if (error) throw error;
  return data.map((row) => {
    const base: ShowcasePlayer = {
      id: row.member_id,
      nickname: row.nickname,
      position: row.card_position,
      ovr: row.ovr,
      level: 0,
      photo: toPlayerPhoto(row.photo_path, row.photo_kind),
      cardSkin: isCardSkinKey(row.card_skin) ? row.card_skin : null,
      attributes: {},
      total: { points: 0, rounds: 0, goals: 0, games: 0 },
      byMonth: {},
    };
    const reactions =
      row.reactions !== null && typeof row.reactions === "object" && !Array.isArray(row.reactions)
        ? Object.fromEntries(Object.entries(row.reactions).filter((entry): entry is [string, number] => typeof entry[1] === "number"))
        : {};
    return {
      id: row.post_id,
      createdAt: row.created_at,
      award: toAward(row, base),
      groupId: row.group_id,
      groupName: row.group_name,
      city: row.city,
      state: row.state,
      reactions,
      myReaction: row.my_reaction,
      isMine: row.is_mine,
    };
  });
}
