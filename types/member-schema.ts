import { z } from "zod";
import { USERNAME_PATTERN, USERNAME_RULE } from "@/lib/username";

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

/** Login sem e-mail (ver lib/username.ts). */
export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(USERNAME_PATTERN, USERNAME_RULE);

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

/** Organizador cadastrando um jogador por usuário (a senha é gerada no servidor). */
export const createPlayerSchema = memberProfileSchema.extend({
  username: usernameSchema,
});

export type CreatePlayerInput = z.infer<typeof createPlayerSchema>;

/**
 * Organizador editando um jogador. `username` vazio = conta antiga com e-mail
 * (não tem usuário para trocar).
 */
export const editPlayerSchema = memberProfileSchema.extend({
  username: usernameSchema.or(z.literal("")),
});

export type EditPlayerInput = z.infer<typeof editPlayerSchema>;

/**
 * Qualquer jogador editando o próprio cadastro: só nome e apelido. Os campos
 * vêm em branco; vazio = manter o atual, mas pelo menos um precisa vir.
 */
export const ownProfileSchema = z
  .object({
    fullName: z.string().trim().max(80, "Use no máximo 80 caracteres.").refine(
      (value) => value === "" || value.length >= 2,
      "Use pelo menos 2 letras.",
    ),
    nickname: z.string().trim().max(12, "Use no máximo 12 caracteres (cabe na carta)."),
  })
  .refine((input) => input.fullName !== "" || input.nickname !== "", {
    message: "Preencha o nome ou o apelido que quer trocar.",
    path: ["fullName"],
  });

export type OwnProfileInput = z.infer<typeof ownProfileSchema>;

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
