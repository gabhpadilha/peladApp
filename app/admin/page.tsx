import type { Metadata } from "next";
import { Suspense } from "react";
import { AppHeader } from "@/components/app-header";
import { MAX_ACTIVE_GROUPS } from "@/lib/platform";
import { CreateGroupForm } from "./_components/create-group-form";
import { GroupCard } from "./_components/group-card";
import { getAdminOverview } from "./_data-access/get-overview";

export const metadata: Metadata = {
  title: "Painel · Cancha Club",
};

/** Painel da plataforma, só para o admin (flag em `profiles`): peladas, plano e novas peladas. */
export default function AdminPage() {
  return (
    <>
      <AppHeader />
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6">
        <Suspense fallback={<AdminSkeleton />}>
          <AdminContent />
        </Suspense>
      </main>
    </>
  );
}

async function AdminContent() {
  const overview = await getAdminOverview();
  const canCreate = overview.activeGroups < MAX_ACTIVE_GROUPS;

  return (
    <>
      <div className="flex flex-col gap-1">
        <p className="text-xs font-bold tracking-widest text-primary uppercase">Painel da plataforma</p>
        <h1 className="font-display text-4xl leading-none font-extrabold uppercase">Peladas</h1>
        <p className="max-w-prose text-sm text-muted-foreground">
          Só você vê esta tela. Mostra números e cadastro, nunca notas, votos ou fotos.
        </p>
      </div>

      <dl className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl border bg-card p-3">
          <dt className="text-xs text-muted-foreground">Ativas</dt>
          <dd className="font-display text-2xl font-bold tabular-nums">{overview.activeGroups} / {MAX_ACTIVE_GROUPS}</dd>
        </div>
        <div className="rounded-xl border bg-card p-3">
          <dt className="text-xs text-muted-foreground">Suspensas</dt>
          <dd className="font-display text-2xl font-bold tabular-nums">{overview.suspendedGroups}</dd>
        </div>
        <div className="rounded-xl border bg-card p-3">
          <dt className="text-xs text-muted-foreground">Jogadores</dt>
          <dd className="font-display text-2xl font-bold tabular-nums">{overview.totalPlayers}</dd>
        </div>
      </dl>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
        <div className="flex flex-col gap-3">
          {overview.groups.map((group) => (
            <GroupCard key={`${group.id}-${group.isSuspended}`} group={group} />
          ))}
        </div>
        <CreateGroupForm loginUrl={`${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/entrar`} canCreate={canCreate} />
      </div>
    </>
  );
}

function AdminSkeleton() {
  return (
    <div aria-busy className="flex flex-col gap-6">
      <div className="h-24 animate-pulse rounded-xl bg-card" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="h-72 animate-pulse rounded-xl bg-card" />
        <div className="h-96 animate-pulse rounded-xl bg-card" />
      </div>
    </div>
  );
}
