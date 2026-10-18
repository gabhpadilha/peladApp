import { z } from "zod";

export const signInSchema = z.object({
  // Normaliza antes de validar: espaço sobrando ou maiúscula não devem barrar o login.
  email: z.string().trim().toLowerCase().pipe(z.email("Digite um e-mail válido.")),
});

export type SignInInput = z.infer<typeof signInSchema>;
