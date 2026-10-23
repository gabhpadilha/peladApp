/**
 * Envios completos (nota para todos os outros presentes) que a rodada precisa
 * para o organizador poder fechar. Espelha `close_match` no banco: mudou um, mude o outro.
 */
export const MIN_SUBMISSIONS_TO_CLOSE = 5;

/**
 * A partir de quantas notas recebidas na rodada a maior e a menor saem da média
 * (modelo da Street League). Espelha `counted_evaluations` no banco, que já
 * devolve só as notas que contam; aqui é só para os textos.
 */
export const TRIMMED_MEAN_MIN_RATINGS = 4;
