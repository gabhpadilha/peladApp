/**
 * Login sem e-mail: o jogador entra com um nome de usuário, e o Supabase Auth
 * recebe um e-mail técnico derivado dele. O domínio `.invalid` é reservado
 * (RFC 2606): nunca recebe mensagens, então nada é enviado a ninguém.
 */
export const USERNAME_PATTERN = /^[a-z0-9.]{3,20}$/;
export const USERNAME_RULE = "De 3 a 20 letras minúsculas, números ou ponto (sem acento nem espaço).";
const USERNAME_EMAIL_DOMAIN = "peladapp.invalid";
const USERNAME_MAX_LENGTH = 20;

export function usernameToEmail(username: string): string {
  return `${username}@${USERNAME_EMAIL_DOMAIN}`;
}

/** Usuário de um e-mail técnico, ou `null` se for um e-mail de verdade. */
export function emailToUsername(email: string): string | null {
  const suffix = `@${USERNAME_EMAIL_DOMAIN}`;
  return email.endsWith(suffix) ? email.slice(0, -suffix.length) : null;
}

/** Sugestão de usuário a partir do apelido: "Zé Carlos" → "ze.carlos". */
export function suggestUsername(nickname: string): string {
  return nickname
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[\s_-]+/g, ".")
    .replace(/[^a-z0-9.]/g, "")
    .replace(/\.{2,}/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .slice(0, USERNAME_MAX_LENGTH);
}
