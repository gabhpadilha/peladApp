import { z } from "zod";

export const PLAYER_POSITION_CODES = ["FIX", "ALA", "PIV", "GOL"] as const;

const PASSWORD_MIN_LENGTH = 8;
/** Limite do bcrypt usado pelo Supabase Auth. */
const PASSWORD_MAX_LENGTH = 72;

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Digite um e-mail válido."));

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Use pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`)
  .max(PASSWORD_MAX_LENGTH, `Use no máximo ${PASSWORD_MAX_LENGTH} caracteres.`);

/** Dados que todo jogador informa ao entrar na pelada. */
export const memberProfileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Digite seu nome.")
    .max(80, "Use no máximo 80 caracteres."),
  nickname: z
    .string()
    .trim()
    .min(1, "Digite como te chamam na pelada.")
    .max(12, "Use no máximo 12 caracteres (cabe na carta)."),
  position: z.enum(PLAYER_POSITION_CODES, { message: "Escolha sua posição." }),
});

export type MemberProfileInput = z.infer<typeof memberProfileSchema>;

const inviteCodeSchema = z.string().regex(/^[0-9a-f]{16}$/, "Convite inválido.");

/** Organizador criando a pelada (a conta já existe; define a senha aqui). */
export const createGroupSchema = memberProfileSchema.extend({
  groupName: z
    .string()
    .trim()
    .min(2, "Dê um nome para a pelada.")
    .max(60, "Use no máximo 60 caracteres."),
  password: passwordSchema,
});

export type CreateGroupInput = z.infer<typeof createGroupSchema>;

/** Quem já tem conta entrando pelo convite. */
export const joinGroupSchema = memberProfileSchema.extend({
  inviteCode: inviteCodeSchema,
});

export type JoinGroupInput = z.infer<typeof joinGroupSchema>;

/** Cadastro único pelo link de convite: cria a conta e já entra na pelada. */
export const signUpSchema = memberProfileSchema.extend({
  inviteCode: inviteCodeSchema,
  email: emailSchema,
  password: passwordSchema,
});

export type SignUpInput = z.infer<typeof signUpSchema>;

/** Organizador cadastrando um jogador (a senha provisória é gerada no servidor). */
export const createPlayerSchema = memberProfileSchema.extend({
  email: emailSchema,
});

export type CreatePlayerInput = z.infer<typeof createPlayerSchema>;

/** Definir ou trocar a própria senha. */
export const setPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmation: z.string(),
  })
  .refine((input) => input.password === input.confirmation, {
    message: "As senhas não são iguais.",
    path: ["confirmation"],
  });

export type SetPasswordInput = z.infer<typeof setPasswordSchema>;

export type FieldErrors<Input> = Partial<Record<keyof Input, string[]>>;
