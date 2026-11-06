import type { CardSkinKey } from "@/types/card-skin";
import type { Player, PlayerPhoto, PlayerPosition } from "@/types/player";

/*
 * Comunidade entre peladas (2026-11-06; design em docs/superpowers/specs/2026-11-06-comunidade-design.md).
 * De fora, só circula o recorte público que a pelada grava em `group_showcase`: apelido, carta, pontos e gols.
 * Nunca notas, histórico por rodada, nome completo nem usuário.
 */

export type ShowcaseTotals = { points: number; rounds: number; goals: number; games: number };

/** Um jogador no recorte público da pelada (jsonb em `group_showcase.players`). */
export type ShowcasePlayer = {
  id: string;
  nickname: string;
  position: PlayerPosition;
  ovr: number | null;
  level: number;
  photo: PlayerPhoto | null;
  cardSkin: CardSkinKey | null;
  /** Atributos da carta (médias de todas as notas, nunca uma nota individual). */
  attributes: Record<string, number | null>;
  /** De todos os tempos. */
  total: ShowcaseTotals;
  /** Por mês (`AAAA-MM`). */
  byMonth: Record<string, ShowcaseTotals>;
};

export type CommunityPeriod = "all" | string;
export type RankingKind = "points" | "goals";

export type RankedShowcasePlayer = { player: ShowcasePlayer; position: number; value: number; rounds: number; games: number };

/** Ranking público (pontos ou gols) de um período; posições empatadas dividem o número. */
export function rankShowcase(players: readonly ShowcasePlayer[], kind: RankingKind, period: CommunityPeriod): RankedShowcasePlayer[] {
  const rows = players
    .map((player) => {
      const totals = period === "all" ? player.total : (player.byMonth[period] ?? { points: 0, rounds: 0, goals: 0, games: 0 });
      return { player, value: kind === "points" ? totals.points : totals.goals, rounds: totals.rounds, games: totals.games };
    })
    .filter((row) => (kind === "points" ? row.rounds > 0 : row.value > 0))
    .toSorted((a, b) =>
      kind === "points"
        ? b.value - a.value || b.rounds - a.rounds || (b.player.ovr ?? 0) - (a.player.ovr ?? 0)
        : b.value - a.value || a.games - b.games || a.player.nickname.localeCompare(b.player.nickname, "pt-BR"),
    );
  let position = 0;
  return rows.map((row, index) => {
    const previous = rows[index - 1];
    const isTie = previous && previous.value === row.value && (kind === "goals" ? previous.games === row.games : previous.rounds === row.rounds);
    if (!isTie) position = index + 1;
    return { ...row, position };
  });
}

/** Meses (`AAAA-MM`) que aparecem no recorte, do mais novo para o mais antigo. */
export function showcaseMonths(players: readonly ShowcasePlayer[]): string[] {
  return [...new Set(players.flatMap((player) => Object.keys(player.byMonth)))].toSorted().toReversed();
}

/** A carta do jogador do recorte (só o que a carta mostra; sem nome completo). */
export function toPublicCard(player: ShowcasePlayer): Player {
  const base = {
    id: player.id,
    nickname: player.nickname,
    fullName: player.nickname,
    photo: player.photo,
    cardSkin: player.cardSkin,
    level: player.level,
    levelProgress: 0,
  };
  return player.position === "GOL"
    ? {
        ...base,
        role: "goalkeeper",
        position: "GOL",
        ovr: player.ovr,
        attributes: pick(player.attributes, ["ref", "ela", "pos", "sai", "rep", "pes"] as const),
      }
    : {
        ...base,
        role: "outfield",
        position: player.position,
        ovr: player.ovr,
        attributes: pick(player.attributes, ["vel", "chu", "pas", "dri", "def", "fis"] as const),
      };
}

function pick<Key extends string>(source: Record<string, number | null>, keys: readonly Key[]): Record<Key, number | null> {
  return Object.fromEntries(keys.map((key) => [key, source[key] ?? null])) as Record<Key, number | null>;
}

/** Quem o jogador vê numa conquista do feed. */
export const REACTIONS = [
  { key: "clap", emoji: "👏", label: "Palmas" },
  { key: "fire", emoji: "🔥", label: "Fogo" },
  { key: "glove", emoji: "🧤", label: "Luva" },
  { key: "laugh", emoji: "😂", label: "Risada" },
] as const;
export type ReactionKey = (typeof REACTIONS)[number]["key"];
