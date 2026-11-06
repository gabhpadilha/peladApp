import type { Metadata } from "next";
import { Suspense } from "react";
import { AppHeader } from "@/components/app-header";
import { GroupGate } from "@/components/group-gate";
import { CommunityTabs } from "./_components/community-tabs";
import { CommunityGroupCard } from "./_components/group-card";
import { FeedPostCard } from "./_components/feed-post-card";
import { getCommunityGroups, getFeed } from "./_data-access/community-data";

export const metadata: Metadata = {
  title: "Comunidade · Cancha Club",
};

/** Peladas que aceitaram aparecer e o feed de conquistas. Só para quem tem conta. */
export default function CommunityPage() {
  return (
    <Suspense fallback={<CommunitySkeleton />}>
      <GroupGate nextPath="/comunidade">
        <CommunityContent />
      </GroupGate>
    </Suspense>
  );
}

async function CommunityContent() {
  const [groups, feed] = await Promise.all([getCommunityGroups(), getFeed()]);

  return (
    <>
      <AppHeader />
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-bold tracking-widest text-primary uppercase">Entre peladas</p>
          <h1 className="font-display text-4xl leading-none font-extrabold uppercase">Comunidade</h1>
          <p className="max-w-prose text-sm text-muted-foreground">
            Veja outras peladas e as conquistas que a galera publicou. Só aparece quem escolheu aparecer.
          </p>
        </div>
        <CommunityTabs
          groups={
            groups.length === 0 ? (
              <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                Nenhuma pelada na comunidade ainda. O administrador da sua pelada liga em Elenco → Comunidade.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {groups.map((group) => (
                  <CommunityGroupCard key={group.id} group={group} />
                ))}
              </div>
            )
          }
          feed={
            feed.length === 0 ? (
              <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                Ainda não tem conquistas no feed. Quem ganhar uma carta pode publicar em Carreira → Coleção.
              </p>
            ) : (
              <div className="flex flex-col gap-4">
                {feed.map((post) => (
                  <FeedPostCard key={post.id} post={post} />
                ))}
              </div>
            )
          }
        />
      </main>
    </>
  );
}

function CommunitySkeleton() {
  return (
    <>
      <AppHeader />
      <main aria-busy className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6">
        <div className="h-24 animate-pulse rounded-xl bg-card" />
        <div className="h-96 animate-pulse rounded-xl bg-card" />
      </main>
    </>
  );
}
