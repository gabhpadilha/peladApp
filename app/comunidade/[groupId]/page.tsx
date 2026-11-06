import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { GroupGate } from "@/components/group-gate";
import { WEEKDAY_LABELS } from "@/lib/platform";
import { ShowcaseRanking } from "../_components/showcase-ranking";
import { getPublicGroup } from "../_data-access/community-data";

export const metadata: Metadata = {
  title: "Pelada · Cancha Club",
};

/** Ranking público de uma pelada da comunidade (só os jogadores que aceitaram aparecer). */
export default function PublicGroupPage({ params }: PageProps<"/comunidade/[groupId]">) {
  return (
    <Suspense fallback={<main aria-busy className="mx-auto h-96 w-full max-w-2xl animate-pulse rounded-xl bg-card" />}>
      <GroupGate nextPath="/comunidade">
        <PublicGroupContent params={params} />
      </GroupGate>
    </Suspense>
  );
}

async function PublicGroupContent({ params }: { params: PageProps<"/comunidade/[groupId]">["params"] }) {
  const { groupId } = await params;
  const group = await getPublicGroup(groupId);
  if (!group) notFound();
  const where = [group.city, group.state].filter(Boolean).join("/");
  const when = group.playWeekday === null ? null : `${WEEKDAY_LABELS[group.playWeekday]}${group.playTime ? ` · ${group.playTime}` : ""}`;

  return (
    <>
      <AppHeader />
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-6">
        <Link href="/comunidade" className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeftIcon aria-hidden className="size-4" />
          Comunidade
        </Link>
        <div className="flex flex-col gap-1">
          <p className="text-sm text-muted-foreground">{[where, when].filter(Boolean).join(" · ")}</p>
          <h1 className="font-display text-4xl leading-none font-extrabold uppercase">{group.name}</h1>
          <p className="text-sm text-muted-foreground">Só jogadores que escolheram aparecer. Toque num nome para ver o perfil.</p>
        </div>
        <ShowcaseRanking groupId={group.id} players={group.players} />
      </main>
    </>
  );
}
