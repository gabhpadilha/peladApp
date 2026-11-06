/*
 * Termos de Uso e Política de Privacidade (decisão do dono do app em 2026-11-06: o app é uma comunidade, então o aceite
 * é exigido de todos no primeiro acesso). RASCUNHO gerado por IA: revisar com advogada antes de divulgar para peladas de
 * fora. Mudou o texto de forma relevante? Suba `TERMS_VERSION`: todo mundo vê a tela de aceite de novo.
 */

/** Versão gravada em `profiles.terms_version` no aceite. */
export const TERMS_VERSION = "2026-11";
export const TERMS_DATE_LABEL = "6 de novembro de 2026";

/** Quem opera o Cancha Club (pessoa física por enquanto; sem CPF em página pública). */
export const CONTROLLER_NAME = "Gabriel Silveira Jammal Padilha";

/** E-mail de contato (privacidade e dúvidas). Vem da variável `NEXT_PUBLIC_CONTACT_EMAIL`; sem ela, a página orienta o caminho pelo app. */
export const CONTACT_EMAIL: string | null = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || null;
