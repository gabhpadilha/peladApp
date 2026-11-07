import { z } from "zod";
import { BRAZIL_STATES } from "@/lib/platform";
import { memberProfileSchema } from "@/types/member-schema";

const optionalText = (max: number) => z.string().trim().max(max, `Use no máximo ${max} caracteres.`);

/** Código curto da pelada: sufixo dos usuários novos (joao.cancha). */
export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]{3,6}$/, "De 3 a 6 letras ou números, sem acento nem espaço.");

/** Dados da pelada. Campos numéricos vêm como texto do formulário e são convertidos na action. */
export const groupDetailsSchema = z.object({
  groupName: z.string().trim().min(2, "Dê um nome para a pelada.").max(60, "Use no máximo 60 caracteres."),
  /** Vazio = sem código (pelada antiga, como a Fut de Quinta): usuários novos sem sufixo. Ao criar pelada nova o código é obrigatório. */
  slug: slugSchema.or(z.literal("")),
  city: z.string().trim().min(2, "Informe a cidade.").max(60, "Use no máximo 60 caracteres."),
  state: z.enum(BRAZIL_STATES, { message: "Escolha o estado." }),
  /** Dia do jogo (0 = domingo ... 6 = sábado). Vazio = qualquer dia, sem aviso de rodada fora do dia (a Fut de Quinta é assim). */
  playWeekday: z.string().regex(/^[0-6]?$/, "Escolha o dia da semana."),
  playTime: z.string().regex(/^(([01]\d|2[0-3]):[0-5]\d)?$/, "Informe o horário (ex.: 20:00)."),
  venue: optionalText(80),
  usualPlayers: z.string().trim().regex(/^(|\d{1,2})$/, "Informe um número.").refine(
    (value) => value === "" || (Number(value) >= 4 && Number(value) <= 30),
    "Entre 4 e 30 jogadores.",
  ),
  /** Rodadas por semana do plano. Vazio = sem limite. */
  weeklyRoundLimit: z.string().trim().regex(/^(|[1-7])$/, "Entre 1 e 7, ou deixe vazio para sem limite."),
  /** Pacotes de skins ao fechar a rodada (desligado por padrão; só o admin liga). */
  packsEnabled: z.boolean(),
  /** Mínimo de presentes na rodada para ela gerar pacotes. */
  packMinPlayers: z.string().trim().regex(/^\d{1,2}$/, "Informe um número.").refine(
    (value) => Number(value) >= 4 && Number(value) <= 30,
    "Entre 4 e 30 jogadores.",
  ),
  ownerContact: optionalText(40),
  adminNotes: optionalText(1000),
});
export type GroupDetailsInput = z.infer<typeof groupDetailsSchema>;

/** Nova pelada + a conta do dono (Administrador da pelada). O usuário final é `<usuario>.<código>`. */
export const createAdminGroupSchema = groupDetailsSchema.extend(memberProfileSchema.shape).extend({
  slug: slugSchema,
  ownerUsername: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9.]{2,14}$/, "De 2 a 14 letras minúsculas, números ou ponto."),
});
export type CreateAdminGroupInput = z.infer<typeof createAdminGroupSchema>;

export const updateAdminGroupSchema = groupDetailsSchema.extend({ groupId: z.uuid() });
export type UpdateAdminGroupInput = z.infer<typeof updateAdminGroupSchema>;
