import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { GroupGate } from "@/components/group-gate";
import { PlayerCard } from "@/components/player-card";
import { SectionTitle } from "@/components/section-title";
import { getCardStats } from "@/lib/card-stats";
import { toPublicCard } from "@/lib/community";
import { POSITION_LABELS } from "@/types/player";
import { CollectionGallery } from "@/app/jogadores/[id]/_components/collection-gallery";
import { StatRadar } from "@/app/jogadores/[id]/_components/stat-radar";
import { getPublicAthlete } from "../../_data-access/community-data";

export const metadata: Metadata = {
  title: "Atleta · Cancha Club",
};

/** Perfil público de um atleta de outra pelada: carta, estatísticas da carta, gols e galeria. Sem notas nem histórico. */
export default function PublicAthletePage({ params }: PageProps<"/comunidade/[groupId]/[memberId]">) {
  return (
    <Suspense fallback={<main aria-busy className="mx-auto h-96 w-full max-w-2xl animate-pulse rounded-xl bg-card" />}>
      <GroupGate nextPath="/comunidade">
        <PublicAthleteContent params={params} />
      </GroupGate>
    </Suspense>
  );
}

async function PublicAthleteContent({ params }: { params: PageProps<"/comunidade/[groupId]/[memberId]">["params"] }) {
  const { groupId, memberId } = await params;
  const athlete = await getPublicAthlete(groupId, memberId);
  if (!athlete) notFound();
  const { group, player, awards } = athlete;
  const card = toPublicCard(player);
  const stats = getCardStats(card);
  const { total } = player;

  return (
    <>
      <AppHeader />
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-6">
        <Link href={`/comunidade/${group.id}`} className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeftIcon aria-hidden className="size-4" />
          {group.name}
        </Link>

        <div className="flex items-center gap-4">
          <PlayerCard player={card} size="fill" className="w-[46%] max-w-52 shrink-0 sm:w-60 sm:max-w-none" />
          <div className="flex min-w-0 flex-col gap-1.5">
            <p className="truncate font-display text-3xl leading-none font-bold">{player.nickname}</p>
            <p className="text-sm text-muted-foreground">
              {POSITION_LABELS[player.position]} · Nível {player.level}
            </p>
            <p className="text-sm text-muted-foreground">{group.name}</p>
          </div>
        </div>

        <section aria-labelledby="stats-title" className="flex flex-col gap-4 rounded-xl border bg-card p-4">
          <SectionTitle id="stats-title">Estatísticas da carta</SectionTitle>
          <StatRadar stats={stats} groupAverages={{}} nickname={player.nickname} />
          <ul className="grid grid-cols-3 gap-2 text-center">
            {stats.map((stat) => (
              <li key={stat.label} className="rounded-lg bg-background/60 p-2">
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="font-display text-2xl font-bold tabular-nums">{stat.value ?? "–"}</p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="numbers-title" className="flex flex-col gap-3 rounded-xl border bg-card p-4">
          <SectionTitle id="numbers-title">Em números</SectionTitle>
          <dl className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
            {[
              { label: "Pontos", value: total.points },
              { label: "Rodadas", value: total.rounds },
              { label: "Gols", value: total.goals },
              { label: "Jogos com gols contados", value: total.games },
            ].map((item) => (
              <div key={item.label} className="rounded-lg bg-background/60 p-2">
                <dt className="text-xs text-muted-foreground">{item.label}</dt>
                <dd className="font-display text-2xl font-bold tabular-nums">{item.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        {awards.length > 0 ? (
          <CollectionGallery awards={awards} shareableIds={[]} groupName={group.name} />
        ) : (
          <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
            {player.nickname} ainda não tem cartas especiais na coleção.
          </p>
        )}
      </main>
    </>
  );
}
