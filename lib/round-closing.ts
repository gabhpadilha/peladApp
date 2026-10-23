/**
 * Para fechar a rodada, pelo menos 5 pessoas precisam ter avaliado todos os
 * outros presentes (ou todos, se a rodada tiver menos gente). O banco confere o
 * mesmo número em `close_match`: mudou aqui, mude lá.
 */
export const MIN_COMPLETE_RATERS = 5;

/** Quantas avaliações completas a rodada precisa para fechar. */
export function getRequiredCompleteRaters(presentCount: number): number {
  return Math.min(MIN_COMPLETE_RATERS, presentCount);
}
