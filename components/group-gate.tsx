import type { ReactNode } from "react";
import { requireActiveMembership } from "@/lib/session";

type GroupGateProps = {
  children: ReactNode;
  /** Para onde voltar depois do login. */
  nextPath: string;
};

/**
 * Só mostra o conteúdo para quem está logado e participa de uma pelada;
 * sem grupo, manda para /bem-vindo. Lê cookies: use dentro de `<Suspense>`.
 */
export async function GroupGate({ children, nextPath }: GroupGateProps) {
  await requireActiveMembership(nextPath);
  return children;
}
