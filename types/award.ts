import type { CardThemeKey } from "@/lib/card-themes";
import type { Player } from "@/types/player";

type PlayerRole = Player["role"];

/**
 * Cartas especiais em jogo, na ordem em que aparecem na UI.
 * `craque` é o Melhor Jogador e `gol` é o Gol da Rodada (chaves antigas no banco).
 */
export const AWARD_KINDS = [
  "craque",
  "gol",
  "drible",
  "atacante",
  "defensor",
  "goleiro",
  "fominha",
  "bola_murcha",
  "time_da_semana",
  "jogador_do_mes",
] as const;

/** Prêmios que saíram do jogo (decisão do dono do app em 2026-10-21): o tipo ainda aceita, ninguém ganha mais. */
type RetiredAwardKind = "fair_play";

export type AwardKind = (typeof AWARD_KINDS)[number] | RetiredAwardKind;

/** Posição do prêmio na ordem da UI (os que saíram do jogo vão para o fim). */
export function awardOrder(kind: AwardKind): number {
  const index = (AWARD_KINDS as readonly AwardKind[]).indexOf(kind);
  return index === -1 ? AWARD_KINDS.length : index;
}

/** Prêmios por voto, na ordem da votação (só os que não dá para tirar das notas). */
export const VOTE_AWARD_KINDS = ["gol", "fominha", "bola_murcha"] as const;
export type VoteAwardKind = (typeof VOTE_AWARD_KINDS)[number];

/** Notas mínimas recebidas na rodada para entrar no Time da Semana e nos prêmios das notas (igual ao banco). */
export const TEAM_OF_THE_WEEK_MIN_RATINGS = 3;

/**
 * Prêmios que saem das notas da rodada (`compute_match_awards`) e o que decide:
 * a nota média (Melhor Jogador na linha, Melhor Goleiro no gol) ou a média de
 * um atributo da linha. `score` da carta guarda essa média (1–10).
 */
export const STAT_AWARD_SOURCES: Partial<Record<AwardKind, { label: string; short: string }>> = {
  craque: { label: "Nota da rodada", short: "nota" },
  goleiro: { label: "Nota da rodada", short: "nota" },
  drible: { label: "Drible na rodada", short: "DRI" },
  atacante: { label: "Chute na rodada", short: "CHU" },
  defensor: { label: "Defesa na rodada", short: "DEF" },
};

/** Notas mínimas recebidas no mês para concorrer ao Time do Mês (igual ao banco). */
export const PLAYER_OF_THE_MONTH_MIN_RATINGS = 5;

/**
 * O Time do Mês tem visual próprio (arte do dono do app) e não veste o tema
 * sazonal; os outros prêmios vestem o tema do mês.
 */
export function hasSeasonalTheme(kind: AwardKind): boolean {
  return kind !== "jogador_do_mes";
}

/** Quem pode receber o voto: o banco confere de novo (`guard_round_vote`). */
type AwardEligibility = "all" | PlayerRole;

export const AWARD_LABELS: Record<
  AwardKind,
  { title: string; question: string; hint: string; eligibility: AwardEligibility }
> = {
  craque: {
    title: "Melhor Jogador",
    question: "",
    hint: "A maior nota da rodada na linha. Sem voto. A carta vem com +1 em cada atributo.",
    eligibility: "outfield",
  },
  gol: {
    title: "Gol da Rodada",
    question: "Quem fez o gol mais bonito?",
    hint: "O golaço da rodada. A carta vem com +1 em cada atributo.",
    eligibility: "all",
  },
  drible: {
    title: "Drible da Rodada",
    question: "",
    hint: "A maior nota de drible (DRI) da rodada na linha. Sem voto. A carta vem com +1 em cada atributo.",
    eligibility: "outfield",
  },
  atacante: {
    title: "Melhor Atacante",
    question: "",
    hint: "A maior nota de chute (CHU) da rodada na linha. Sem voto. A carta vem com +1 em cada atributo.",
    eligibility: "outfield",
  },
  defensor: {
    title: "Melhor Defensor",
    question: "",
    hint: "A maior nota de defesa (DEF) da rodada na linha. Sem voto. A carta vem com +1 em cada atributo.",
    eligibility: "outfield",
  },
  goleiro: {
    title: "Melhor Goleiro",
    question: "",
    hint: "A maior nota da rodada no gol. Sem voto. A carta vem com +1 em cada atributo.",
    eligibility: "goalkeeper",
  },
  // Saiu do jogo (2026-10-21): fica só para cartas antigas.
  fair_play: {
    title: "Fair Play",
    question: "",
    hint: "Saiu do jogo.",
    eligibility: "all",
  },
  fominha: {
    title: "Fominha",
    question: "Quem foi o fominha?",
    hint: "Não passou a bola de jeito nenhum. Vale a zoeira.",
    eligibility: "all",
  },
  bola_murcha: {
    title: "Bola Murcha",
    question: "Quem foi a bola murcha?",
    hint: "Aquele que não estava nos seus dias. Vale a zoeira.",
    eligibility: "all",
  },
  time_da_semana: {
    title: "Time da Semana",
    question: "",
    hint: `As 4 maiores notas da linha e a maior do gol na rodada (com pelo menos ${TEAM_OF_THE_WEEK_MIN_RATINGS} notas). Sem voto.`,
    eligibility: "all",
  },
  jogador_do_mes: {
    title: "Time do Mês",
    question: "",
    hint: `As 4 maiores notas médias do mês na linha e a maior do gol (com pelo menos ${PLAYER_OF_THE_MONTH_MIN_RATINGS} notas), ao fechar a rodada da última quinta. Sem voto.`,
    eligibility: "all",
  },
};

/** Rótulo da regra de quem concorre ("Só goleiros"), ou `null` se vale para todos. */
export const ELIGIBILITY_LABELS: Record<AwardEligibility, string | null> = {
  all: null,
  outfield: "Só jogadores de linha",
  goalkeeper: "Só goleiros",
};

/** O jogador pode receber voto nesse prêmio? */
export function canReceiveVote(kind: VoteAwardKind, role: PlayerRole): boolean {
  const { eligibility } = AWARD_LABELS[kind];
  return eligibility === "all" || eligibility === role;
}

/**
 * Carta especial colecionável: foto congelada do jogador no dia do prêmio.
 * `card` traz OVR/atributos da carta (com o bônus) e o apelido/foto atuais.
 */
export type Award = {
  id: string;
  kind: AwardKind;
  theme: CardThemeKey;
  /** Votos recebidos; nos prêmios das notas, quantas notas recebeu na rodada (no Time do Mês, no mês). */
  votes: number;
  /**
   * Nos prêmios das notas: a média (1–10) que decidiu (nota da rodada, do mês ou
   * do atributo, ver `STAT_AWARD_SOURCES`). `null` nos prêmios por voto e nas
   * cartas antigas, de quando Melhor Jogador, Drible etc. eram votados.
   */
  score: number | null;
  matchId: string;
  round: number;
  /** Data do jogo, `AAAA-MM-DD`. */
  date: string;
  memberId: string;
  card: Player;
};

const scoreFormatter = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** Nota da rodada (1–10) com uma casa: "8,6". */
export function formatRoundScore(score: number): string {
  return scoreFormatter.format(score);
}

/** "6 votos"; nos prêmios das notas, a média que decidiu: "nota 8,6", "DRI 8,7", "média 8,6 no mês". */
export function formatAwardResult(award: Pick<Award, "kind" | "votes" | "score">): string {
  if (award.kind === "time_da_semana") {
    return award.score === null ? "Time da Semana" : `nota ${formatRoundScore(award.score)}`;
  }
  if (award.kind === "jogador_do_mes") {
    return award.score === null ? "Time do Mês" : `média ${formatRoundScore(award.score)} no mês`;
  }
  const source = STAT_AWARD_SOURCES[award.kind];
  if (source && award.score !== null) return `${source.short} ${formatRoundScore(award.score)}`;
  return `${award.votes} ${award.votes === 1 ? "voto" : "votos"}`;
}

/** Prêmio que saiu das notas (tem a média que decidiu), e não de voto. */
export function isScoredAward(award: Pick<Award, "kind" | "score">): boolean {
  return award.score !== null;
}
