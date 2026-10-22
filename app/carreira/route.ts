import { redirect } from "next/navigation";
import { requireActiveMembership } from "@/lib/session";

// Atalho "Carreira" da barra de baixo: o perfil (Estatísticas e Coleção) do próprio jogador.
export async function GET() {
  const membership = await requireActiveMembership("/carreira");
  redirect(`/jogadores/${membership.memberId}`);
}
