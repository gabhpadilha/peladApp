import type { Metadata } from "next";
import { Suspense } from "react";
import { AppHeader } from "@/components/app-header";
import { CreatePlayerForm } from "./_components/create-player-form";
import { MembersList } from "./_components/members-list";
import { getRoster } from "./_data-access/get-roster";

export const metadata: Metadata = {
  title: "Elenco · PeladApp",
};

/** Gestão de cadastro, só do Administrador. A própria conta (foto, nome, senha) fica em /eu. */
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

  return (
    <>
      <div className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">{roster.membership.groupName}</p>
        <h1 className="font-display text-4xl font-extrabold uppercase">Elenco</h1>
        <p className="max-w-prose text-sm text-muted-foreground">
          Cadastre a galera, corrija dados, redefina senhas e desative quem saiu da pelada.
        </p>
      </div>

      {/*
        Celular: cadastro e, embaixo, a lista. Desktop: lado a lado.
        key: trocou de conta na mesma aba, os formulários recomeçam do zero.
      */}
      <div
        key={roster.membership.memberId}
        className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start"
      >
        <CreatePlayerForm loginUrl={roster.loginUrl} />
        <MembersList
          members={roster.members}
          inactiveMembers={roster.inactiveMembers}
          currentMemberId={roster.membership.memberId}
          canManage
          loginUrl={roster.loginUrl}
        />
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
