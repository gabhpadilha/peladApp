import { z } from "zod";
import { emailSchema } from "@/types/member-schema";

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Digite sua senha."),
});

export type SignInInput = z.infer<typeof signInSchema>;
