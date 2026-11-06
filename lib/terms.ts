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

/**
 * E-mail de contato (privacidade e dúvidas): `contato@canchaclub.com.br`, que o ImprovMX redireciona para a caixa do dono
 * (DNS no Registro.br: 2 MX e 1 TXT de SPF; confirmado ativo em 2026-11-07). A variável `NEXT_PUBLIC_CONTACT_EMAIL`, se
 * existir, sobrescreve o padrão.
 */
export const CONTACT_EMAIL: string = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || "contato@canchaclub.com.br";
