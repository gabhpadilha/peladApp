import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { GroupGate } from "@/components/group-gate";
import { AthleteTabs } from "../_components/athlete-tabs";
import { CollectionGallery } from "../_components/collection-gallery";
import { CollectionSummary } from "../_components/collection-summary";
import { EmptyCollection } from "../_components/empty-collection";
import { LatestAwardSpotlight } from "../_components/latest-award-spotlight";
import { getAthleteProfile } from "../_data-access/get-athlete-profile";

export const metadata: Metadata = {
  title: "Coleção · Cancha Club",
};

/** Galeria das cartas especiais do atleta, separada das estatísticas (vai crescer com o tempo). */
export default function CollectionPage({ params }: PageProps<"/jogadores/[id]/colecao">) {
  return (
    // `params` e a sessão são dados de requisição: a página faz streaming.
    <Suspense fallback={<CollectionSkeleton />}>
      <GroupGate nextPath="/">
        <CollectionContent params={params} />
      </GroupGate>
    </Suspense>
  );
}

async function CollectionContent({ params }: { params: PageProps<"/jogadores/[id]/colecao">["params"] }) {
  const { id } = await params;
  const profile = await getAthleteProfile(id);
  if (!profile) notFound();

  const { player, awards } = profile;
  const latest = awards.at(0);

  return (
    <>
      <AppHeader currentPlayer={profile.currentPlayer} />
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6">
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon aria-hidden className="size-4" />
          Início
        </Link>
        <AthleteTabs memberId={player.id} awardCount={awards.length} active="collection" />
        <CollectionSummary
          awards={awards}
          title={profile.isOwnProfile ? "Minha coleção" : `Coleção de ${player.nickname}`}
        />
        {latest ? (
          <>
            <LatestAwardSpotlight
              award={latest}
              isShareable={profile.shareableAwardIds.includes(latest.id)}
              groupName={profile.groupName}
            />
            <CollectionGallery awards={awards} shareableIds={profile.shareableAwardIds} groupName={profile.groupName} />
          </>
        ) : (
          <EmptyCollection player={player} isOwnProfile={profile.isOwnProfile} theme={profile.currentTheme} />
        )}
      </main>
    </>
  );
}

function CollectionSkeleton() {
  return (
    <>
      <AppHeader />
      <main aria-busy className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6">
        <div className="h-13 animate-pulse rounded-xl bg-card" />
        <div className="h-40 animate-pulse rounded-xl bg-card" />
        <div className="h-96 animate-pulse rounded-xl bg-card" />
      </main>
    </>
  );
}
