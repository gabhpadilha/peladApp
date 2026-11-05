import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { goalsToCheck } from "@/lib/goal-rules";
import { GoalsCheckStep } from "./_components/goals-check-step";
import { GoalsStep } from "./_components/goals-step";
import { GoalsWaiting } from "./_components/goals-waiting";
import { RatingWizard } from "./_components/rating-wizard";
import { getRatingSession } from "./_data-access/get-rating-session";

export const metadata: Metadata = {
  title: "Avaliar rodada · Cancha Club",
};

/** Tela de notas do vestiário: sem navbar, para caber tudo no celular. */
export default function RatePage({ params }: PageProps<"/avaliar/[matchId]">) {
  return (
    // `params` e a sessão são dados de requisição: a tela faz streaming.
    <Suspense fallback={<div className="mx-auto h-dvh w-full max-w-md animate-pulse bg-card/40" />}>
      <RateContent params={params} />
    </Suspense>
  );
}

const STATUS_MESSAGES = {
  closed: {
    title: "Rodada fechada",
    text: "Essa rodada já foi fechada pelo organizador e não aceita mais notas.",
  },
  "not-present": {
    title: "Você não jogou essa",
    text: "Só quem esteve na rodada avalia. Se você jogou, peça ao organizador para te marcar.",
  },
  submitted: {
    title: "Notas já enviadas",
    text: "Você já avaliou essa rodada. As notas entram no OVR quando o organizador fechar a rodada.",
  },
} as const;

async function RateContent({ params }: { params: PageProps<"/avaliar/[matchId]">["params"] }) {
  const { matchId } = await params;
  const session = await getRatingSession(matchId);

  if (session.status === "not-found") notFound();

  if (session.status === "open") {
    if (session.targets.length === 0) {
      return <StatusScreen title="Ninguém para avaliar" text="Só você esteve nessa rodada." />;
    }
    // Duas votações separadas (decisão do dono do app em 2026-11-04). Etapa 1, gols: informar os seus, esperar todos
    // informarem, conferir os gols dos colegas e esperar todos concluírem. Etapa 2, notas: só depois que a 1 fecha.
    const { goals } = session;
    if (!goals.ratingsOpen) {
      if (!(session.memberId in goals.byMember)) {
        return <GoalsStep match={session.match} memberId={session.memberId} />;
      }
      if (goals.missingIds.length > 0) {
        return <GoalsWaiting matchId={session.match.id} kind="report" waitingNicknames={session.missingNicknames} isOrganizer={session.isOrganizer} />;
      }
      if (!goals.myChecked) {
        const items = goalsToCheck(goals, session.memberId).map((goal) => ({
          goal,
          nickname: session.nicknames[goal.memberId] ?? "Jogador",
          myVote: goals.myVotes[goal.memberId],
        }));
        return <GoalsCheckStep match={session.match} items={items} />;
      }
      return <GoalsWaiting matchId={session.match.id} kind="check" waitingNicknames={session.pendingCheckNicknames} isOrganizer={session.isOrganizer} />;
    }
    return <RatingWizard match={session.match} targets={session.targets} />;
  }

  const message = STATUS_MESSAGES[session.status];
  return <StatusScreen title={`${message.title} · Rodada ${session.match.round}`} text={message.text} />;
}

function StatusScreen({ title, text }: { title: string; text: string }) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-12 text-center">
      <h1 className="font-display text-3xl font-bold">{title}</h1>
      <p className="text-muted-foreground">{text}</p>
      <Button asChild size="lg" className="h-11 w-full text-base">
        <Link href="/">Voltar ao Início</Link>
      </Button>
    </main>
  );
}
