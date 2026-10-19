import { z } from "zod";
import { USERNAME_PATTERN } from "@/lib/username";

/** Aceita usuário (cadastrado pelo organizador) ou e-mail (contas antigas). */
export const signInSchema = z.object({
  login: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Digite seu usuário ou e-mail.")
    .refine(
      (value) => (value.includes("@") ? z.email().safeParse(value).success : USERNAME_PATTERN.test(value)),
      "Usuário ou e-mail inválido.",
    ),
  password: z.string().min(1, "Digite sua senha."),
});

export type SignInInput = z.infer<typeof signInSchema>;
