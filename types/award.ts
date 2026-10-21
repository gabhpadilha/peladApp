import type { CardThemeKey } from "@/lib/card-themes";
import type { Player } from "@/types/player";

type PlayerRole = Player["role"];

/**
 * Todas as cartas especiais, na ordem em que aparecem na UI.
 * `craque` é o Melhor Jogador e `gol` é o Gol da Rodada (chaves antigas no banco).
 */
export const AWARD_KINDS = [
  "craque",
  "gol",
  "drible",
  "atacante",
  "defensor",
  "goleiro",
  "fair_play",
  "fominha",
  "bola_murcha",
  "time_da_semana",
  "jogador_do_mes",
] as const;
export type AwardKind = (typeof AWARD_KINDS)[number];

/** Prêmios que saem das notas, sem votação. */
type ScoreAwardKind = "time_da_semana" | "jogador_do_mes";

/** Prêmios por voto, na ordem da votação. O Time da Semana e o Jogador do Mês saem das notas. */
export const VOTE_AWARD_KINDS = AWARD_KINDS.filter(
  (kind): kind is Exclude<AwardKind, ScoreAwardKind> => kind !== "time_da_semana" && kind !== "jogador_do_mes",
);
export type VoteAwardKind = (typeof VOTE_AWARD_KINDS)[number];

/** Notas mínimas recebidas na rodada para entrar no Time da Semana (igual ao banco). */
export const TEAM_OF_THE_WEEK_MIN_RATINGS = 3;

/** Notas mínimas recebidas no mês para concorrer ao Jogador do Mês (igual ao banco). */
export const PLAYER_OF_THE_MONTH_MIN_RATINGS = 5;

/**
 * O Jogador do Mês tem visual próprio (arte do dono do app) e não veste o tema
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
    question: "Quem foi o melhor jogador da rodada?",
    hint: "O melhor em campo. A carta vem com +1 em cada atributo.",
    eligibility: "all",
  },
  gol: {
    title: "Gol da Rodada",
    question: "Quem fez o gol mais bonito?",
    hint: "O golaço da rodada. A carta vem com +1 em cada atributo.",
    eligibility: "all",
  },
  drible: {
    title: "Drible da Rodada",
    question: "Quem deu o drible mais bonito?",
    hint: "A caneta, o elástico, o chapéu. A carta vem com +1 em cada atributo.",
    eligibility: "outfield",
  },
  atacante: {
    title: "Melhor Atacante",
    question: "Quem foi o melhor atacante?",
    hint: "O mais perigoso lá na frente. A carta vem com +1 em cada atributo.",
    eligibility: "outfield",
  },
  defensor: {
    title: "Melhor Defensor",
    question: "Quem foi o melhor defensor?",
    hint: "Ninguém passou por ele. A carta vem com +1 em cada atributo.",
    eligibility: "outfield",
  },
  goleiro: {
    title: "Melhor Goleiro",
    question: "Quem foi o melhor goleiro?",
    hint: "Pegou o que não dava para pegar. A carta vem com +1 em cada atributo.",
    eligibility: "goalkeeper",
  },
  fair_play: {
    title: "Fair Play",
    question: "Quem foi o mais gente boa?",
    hint: "Sem reclamar, sem falta maldosa, levantou quem caiu. A carta não tem bônus.",
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
    title: "Jogador do Mês",
    question: "",
    hint: `A maior nota média do mês na linha e no gol (com pelo menos ${PLAYER_OF_THE_MONTH_MIN_RATINGS} notas), ao fechar a rodada da última quinta. Sem voto.`,
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
  /** Votos recebidos; no Time da Semana, quantas notas recebeu na rodada (no Jogador do Mês, no mês). */
  votes: number;
  /** Só no Time da Semana e no Jogador do Mês: média (1–10) das notas recebidas na rodada ou no mês. */
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

/** "6 votos" ou, no Time da Semana, "nota 8,6" (no Jogador do Mês, "média 8,6 no mês"). */
export function formatAwardResult(award: Pick<Award, "kind" | "votes" | "score">): string {
  if (award.kind === "time_da_semana") {
    return award.score === null ? "Time da Semana" : `nota ${formatRoundScore(award.score)}`;
  }
  if (award.kind === "jogador_do_mes") {
    return award.score === null ? "Jogador do Mês" : `média ${formatRoundScore(award.score)} no mês`;
  }
  return `${award.votes} ${award.votes === 1 ? "voto" : "votos"}`;
}
