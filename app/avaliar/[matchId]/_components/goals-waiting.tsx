"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HourglassIcon } from "lucide-react";
import { unlockRatings } from "@/app/_actions/match-goals";
import { Button } from "@/components/ui/button";

type GoalsWaitingProps = {
  matchId: string;
  /** `report`: falta gente informar os gols; `check`: todos informaram e falta gente concluir a conferência. */
  kind: "report" | "check";
  /** Apelidos de quem falta (informar ou concluir). */
  waitingNicknames: string[];
  isOrganizer: boolean;
};

/** Quanto esperar entre uma conferida e outra (a tela segue sozinha quando a etapa fecha). */
const REFRESH_MS = 5000;

/** Espera da etapa dos gols: as notas abrem quando todos informam e conferem (ou o organizador libera). */
export function GoalsWaiting({ matchId, kind, waitingNicknames, isOrganizer }: GoalsWaitingProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const timer = setInterval(() => router.refresh(), REFRESH_MS);
    return () => clearInterval(timer);
  }, [router]);

  function handleUnlock() {
    setError(null);
    startTransition(async () => {
      const result = await unlockRatings({ matchId });
      if (!result.success) setError(result.message);
      else router.refresh();
    });
  }

  const count = waitingNicknames.length;
  const isReport = kind === "report";
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-5 px-4 py-12 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-white/5 text-primary">
        <HourglassIcon className="size-7" />
      </span>
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">Etapa 1 de 2 · Gols</p>
        <h1 className="font-display text-3xl font-bold uppercase">
          {isReport ? "Esperando os gols" : "Esperando a conferência"}
        </h1>
        <p className="text-muted-foreground">
          {isReport
            ? "Quando todo mundo informar os gols, vocês conferem os números e as notas abrem."
            : "Seus gols e sua conferência estão feitos. As notas abrem quando todos concluírem."}{" "}
          {count === 1 ? "Falta 1 jogador" : `Faltam ${count} jogadores`}:
        </p>
        <p className="font-medium">{waitingNicknames.join(", ")}</p>
      </div>
      <div className="flex w-full flex-col gap-2">
        {isOrganizer && (
          <>
            {isReport && (
              <Button asChild size="lg" variant="secondary" className="h-11 text-base">
                <Link href={`/rodadas/${matchId}`}>Marcar os gols de quem não informou</Link>
              </Button>
            )}
            <Button size="lg" className="h-11 text-base" disabled={isPending} onClick={handleUnlock}>
              {isPending ? "Liberando…" : "Liberar as notas"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Quem ainda não informou os gols fica com 0 nessa rodada.
            </p>
          </>
        )}
        {!isOrganizer && (
          <p className="text-sm text-muted-foreground">Essa tela atualiza sozinha. Avise quem falta ou o organizador.</p>
        )}
        <Button asChild size="lg" variant="ghost" className="h-11 text-base">
          <Link href="/">Voltar ao Início</Link>
        </Button>
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </main>
  );
}
