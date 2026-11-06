/** Regras da plataforma (várias peladas no mesmo app). Decisão do dono do app em 2026-11-06. */

/** Peladas ativas ao mesmo tempo. Suspensas não contam. Sobe quando as cotas dos serviços externos permitirem. */
export const MAX_ACTIVE_GROUPS = 5;

/** Rodadas por semana do plano Grátis nas peladas novas (a pelada antiga fica sem limite). */
export const FREE_WEEKLY_ROUND_LIMIT = 1;

export const WEEKDAY_LABELS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"] as const;

export const BRAZIL_STATES = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA",
  "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;

/** Mensagens dos erros do banco que o organizador vê ao criar rodada. */
export const GROUP_SUSPENDED_MESSAGE =
  "Sua pelada está com o plano suspenso: dá para ver tudo, mas não criar rodadas novas. Fale com o administrador da plataforma.";
export const WEEKLY_LIMIT_MESSAGE =
  "O plano da sua pelada permite criar menos rodadas por semana do que isso. Se a rodada anterior ficou errada, exclua ela e crie de novo.";
