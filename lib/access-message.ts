type AccessMessageInput = {
  nickname: string;
  /** Usuário, ou e-mail nas contas antigas. */
  login: string;
  tempPassword: string;
  loginUrl: string;
};

/** Mensagem pronta para o organizador mandar no WhatsApp com o acesso do jogador. */
export function buildAccessMessage({ nickname, login, tempPassword, loginUrl }: AccessMessageInput): string {
  return [
    `Fala, ${nickname}! Seu acesso ao PeladApp:`,
    loginUrl,
    `${login.includes("@") ? "E-mail" : "Usuário"}: ${login}`,
    `Senha provisória: ${tempPassword}`,
    "No primeiro acesso você escolhe sua senha.",
  ].join("\n");
}
