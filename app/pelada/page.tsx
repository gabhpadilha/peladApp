import type { Metadata } from "next";
import { Suspense } from "react";
import { AppHeader } from "@/components/app-header";
import { CreatePlayerForm } from "./_components/create-player-form";
import { MatchesList } from "./_components/matches-list";
import { MembersList } from "./_components/members-list";
import { NewMatchForm } from "./_components/new-match-form";
import { PasswordCard } from "./_components/password-card";
import { getGroupOverview } from "./_data-access/get-group-overview";

export const metadata: Metadata = {
  title: "Minha pelada · PeladApp",
};

export default function GroupPage() {
  return (
    <>
      <AppHeader />
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6">
        {/* Tudo aqui depende da sessão: faz streaming atrás do Suspense. */}
        <Suspense fallback={<GroupSkeleton />}>
          <GroupContent />
        </Suspense>
      </main>
    </>
  );
}

async function GroupContent() {
  const overview = await getGroupOverview();

  return (
    <>
      <div>
        <p className="text-sm text-muted-foreground">
          {overview.isOrganizer ? "Você organiza" : "Você joga em"}
        </p>
        <h1 className="font-display text-4xl font-extrabold">{overview.membership.groupName}</h1>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          {overview.isOrganizer && <CreatePlayerForm loginUrl={overview.loginUrl} />}
          {overview.isOrganizer && <NewMatchForm members={overview.members} today={overview.today} />}
          <PasswordCard login={overview.login} />
        </div>
        <div className="flex flex-col gap-6">
          <MatchesList matches={overview.matches} isOrganizer={overview.isOrganizer} />
          <MembersList
            members={overview.members}
            currentMemberId={overview.membership.memberId}
            canManage={overview.isOrganizer}
            loginUrl={overview.loginUrl}
          />
        </div>
      </div>
    </>
  );
}

function GroupSkeleton() {
  return (
    <div aria-busy className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="h-96 animate-pulse rounded-xl bg-card" />
      <div className="h-96 animate-pulse rounded-xl bg-card" />
    </div>
  );
}
