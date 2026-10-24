import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { GroupGate } from "@/components/group-gate";
import { formatWeekdayDate } from "@/lib/format-date";
import { cn } from "@/lib/utils";
import { MatchBoardView } from "./_components/match-board";
import { getMatchBoard } from "./_data-access/get-match-board";

export const metadata: Metadata = {
  title: "Mesa tática · Cancha Club",
};

/** Mesa tática da rodada: Branco x Preto em campo, com as cartas dos jogadores. */
export default function MatchBoardPage({ params }: PageProps<"/rodadas/[matchId]">) {
  return (
    // `params` e a sessão são dados de requisição: a página faz streaming.
    <Suspense fallback={<BoardSkeleton />}>
      <GroupGate nextPath="/rodadas">
        <BoardContent params={params} />
      </GroupGate>
    </Suspense>
  );
}

async function BoardContent({ params }: { params: PageProps<"/rodadas/[matchId]">["params"] }) {
  const { matchId } = await params;
  const board = await getMatchBoard(matchId);
  if (!board) notFound();

  const isOpen = board.match.status === "open";
  return (
    <>
      <AppHeader currentPlayer={board.currentPlayer} />
      <main className={cn("mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6", board.canRate && "pb-28")}>
        <Link
          href="/rodadas"
          className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon aria-hidden className="size-4" />
          Rodadas
        </Link>

        <div className="flex flex-col gap-1">
          <p className="text-sm text-muted-foreground">{board.groupName}</p>
          <h1 className="flex flex-wrap items-center gap-x-3 gap-y-1 font-display text-4xl font-extrabold uppercase">
            Rodada {board.match.round}
            <span
              className={cn(
                "rounded-md px-2 py-0.5 font-sans text-xs font-medium tracking-normal normal-case",
                isOpen ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
              )}
            >
              {isOpen ? "Em avaliação" : "Fechada"}
            </span>
          </h1>
          <p className="text-sm text-muted-foreground first-letter:uppercase">
            {formatWeekdayDate(board.match.date)} · Branco x Preto
          </p>
        </div>

        <MatchBoardView board={board} />
      </main>
    </>
  );
}

function BoardSkeleton() {
  return (
    <>
      <AppHeader />
      <main aria-busy className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6">
        <div className="h-20 animate-pulse rounded-xl bg-card" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="h-[34rem] animate-pulse rounded-2xl bg-card" />
          <div className="h-[34rem] animate-pulse rounded-2xl bg-card" />
        </div>
      </main>
    </>
  );
}
