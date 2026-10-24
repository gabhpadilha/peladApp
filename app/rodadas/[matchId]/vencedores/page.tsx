import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GroupGate } from "@/components/group-gate";
import { Button } from "@/components/ui/button";
import { requireActiveMembership } from "@/lib/session";
import { WinnersReveal } from "./_components/winners-reveal";
import { getMatchWinners } from "./_data-access/get-match-winners";

export const metadata: Metadata = {
  title: "Vencedores · Cancha Club",
};

/** Revelação das cartas especiais de uma rodada fechada, como abrir um pacote do FIFA. */
export default function WinnersPage({ params }: PageProps<"/rodadas/[matchId]/vencedores">) {
  return (
    // `params` e a sessão são dados de requisição: a página faz streaming.
    <Suspense fallback={<div aria-busy className="fixed inset-0 bg-background" />}>
      <GroupGate nextPath="/rodadas">
        <WinnersContent params={params} />
      </GroupGate>
    </Suspense>
  );
}

async function WinnersContent({ params }: { params: PageProps<"/rodadas/[matchId]/vencedores">["params"] }) {
  const { matchId } = await params;
  const [winners, membership] = await Promise.all([
    getMatchWinners(matchId),
    requireActiveMembership(`/rodadas/${matchId}/vencedores`),
  ]);
  if (!winners) notFound();

  if (winners.revealed.length === 0 && winners.team.length === 0) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="font-display text-3xl font-extrabold uppercase">Rodada {winners.match.round}</h1>
        <p className="text-sm text-muted-foreground">
          Ninguém ganhou carta especial nessa rodada: não teve voto e ninguém recebeu notas suficientes para o Time
          da Semana.
        </p>
        <Button asChild size="lg" className="h-11 text-base">
          <Link href="/">Voltar para o início</Link>
        </Button>
      </main>
    );
  }

  return <WinnersReveal winners={winners} currentMemberId={membership.memberId} />;
}
