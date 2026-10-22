import { redirect } from "next/navigation";
import { requireActiveMembership } from "@/lib/session";

// TESTE (spike/bottom-nav): atalho "Carreira" para o perfil do próprio jogador.
export async function GET() {
  const membership = await requireActiveMembership("/carreira");
  redirect(`/jogadores/${membership.memberId}`);
}
