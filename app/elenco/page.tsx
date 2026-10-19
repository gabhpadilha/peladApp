import type { Metadata } from "next";
import { Suspense } from "react";
import { AppHeader } from "@/components/app-header";
import { CreatePlayerForm } from "./_components/create-player-form";
import { MembersList } from "./_components/members-list";
import { OwnPhotoCard } from "./_components/own-photo-card";
import { OwnProfileCard } from "./_components/own-profile-card";
import { PasswordCard } from "./_components/password-card";
import { getRoster } from "./_data-access/get-roster";

export const metadata: Metadata = {
  title: "Elenco · PeladApp",
};

/** Gestão de cadastro: o dono cadastra e gerencia; cada um edita o próprio perfil e senha. */
export default function RosterPage() {
  return (
    <>
      <AppHeader />
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6">
        {/* Tudo aqui depende da sessão: faz streaming atrás do Suspense. */}
        <Suspense fallback={<RosterSkeleton />}>
          <RosterContent />
        </Suspense>
      </main>
    </>
  );
}

async function RosterContent() {
  const roster = await getRoster();
  const { isOwner } = roster.membership;
  const me = roster.members.find((member) => member.id === roster.membership.memberId);

  return (
    <>
      <div className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">{roster.membership.groupName}</p>
        <h1 className="font-display text-4xl font-extrabold uppercase">Elenco</h1>
        <p className="max-w-prose text-sm text-muted-foreground">
          {isOwner
            ? "Cadastre a galera, corrija dados, redefina senhas e desative quem saiu da pelada."
            : "Quem joga a pelada. Aqui você também troca seu nome, apelido e senha."}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          {isOwner && <CreatePlayerForm loginUrl={roster.loginUrl} />}
          <MembersList
            members={roster.members}
            inactiveMembers={roster.inactiveMembers}
            currentMemberId={roster.membership.memberId}
            canManage={isOwner}
            loginUrl={roster.loginUrl}
          />
        </div>
        {/* key: trocou de conta na mesma aba, os formulários recomeçam do zero. */}
        <div key={roster.membership.memberId} className="flex flex-col gap-6">
          {me && <OwnPhotoCard member={me} />}
          <OwnProfileCard />
          <PasswordCard login={roster.login} />
        </div>
      </div>
    </>
  );
}

function RosterSkeleton() {
  return (
    <div aria-busy className="flex flex-col gap-6">
      <div className="h-24 animate-pulse rounded-xl bg-card" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="h-96 animate-pulse rounded-xl bg-card" />
        <div className="h-96 animate-pulse rounded-xl bg-card" />
      </div>
    </div>
  );
}
