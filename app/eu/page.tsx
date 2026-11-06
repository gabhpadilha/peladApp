import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRightIcon, LogOutIcon, ShieldIcon, UsersIcon } from "lucide-react";
import { signOut } from "@/app/_actions/sign-out";
import { AppHeader } from "@/components/app-header";
import { CoinPill } from "@/components/coin-pill";
import { GroupGate } from "@/components/group-gate";
import { PlayerCard } from "@/components/player-card";
import { getActiveMembership, getUserId } from "@/lib/session";
import { setPublicProfile } from "@/app/comunidade/_actions/community-actions";
import { CommunityToggle } from "@/app/comunidade/_components/community-toggle";
import { getCommunityStatus } from "@/app/comunidade/_data-access/community-data";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { Button } from "@/components/ui/button";
import { POSITION_LABELS } from "@/types/player";
import { AccountDisclosure } from "./_components/account-disclosure";
import { MyCards } from "./_components/my-cards";
import { OwnPhotoCard } from "./_components/own-photo-card";
import { OwnProfileCard } from "./_components/own-profile-card";
import { PasswordCard } from "./_components/password-card";
import { getMe } from "./_data-access/get-me";

export const metadata: Metadata = {
  title: "Eu · Cancha Club",
};

/** A própria conta: carta, Minhas cartas, Gerenciar elenco (Administrador), foto, nome e apelido, senha e sair. */
export default function MePage() {
  return (
    // Tudo aqui depende da sessão: faz streaming atrás do Suspense.
    <Suspense fallback={<MeSkeleton />}>
      <GroupGate nextPath="/eu">
        <MeContent />
      </GroupGate>
    </Suspense>
  );
}

async function MeContent() {
  const data = await getMe();
  if (!data) notFound();
  const { me } = data;
  // Só o Administrador: o Elenco saiu da barra de baixo do celular e mora aqui.
  const userId = await getUserId();
  const isOwner = userId ? ((await getActiveMembership(userId))?.isOwner ?? false) : false;
  const isAdmin = userId ? await isPlatformAdmin(userId) : false;
  const community = await getCommunityStatus();

  return (
    <>
      <AppHeader currentPlayer={me} />
      {/* key: trocou de conta na mesma aba, os formulários recomeçam do zero. */}
      <main key={me.id} className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6">
        <div className="flex flex-col gap-1">
          <p className="text-sm text-muted-foreground">{data.groupName}</p>
          <h1 className="font-display text-4xl leading-none font-extrabold uppercase">Eu</h1>
        </div>

        <div className="flex items-center gap-4">
          <PlayerCard player={me} size="fill" className="w-[46%] max-w-52 shrink-0 sm:w-60 sm:max-w-none" />
          <div className="flex min-w-0 flex-col items-start gap-1.5">
            <p className="truncate font-display text-3xl leading-none font-bold">{me.nickname}</p>
            <p className="text-sm text-muted-foreground">
              {POSITION_LABELS[me.position]} · Nível {data.progression.level}
            </p>
            <CoinPill value={data.balance} />
          </div>
        </div>

        <MyCards me={me} cards={data.cards} />

        {isOwner && (
          <Link
            href="/elenco"
            className="flex min-h-16 items-center gap-3 rounded-xl border bg-card px-4 transition-colors hover:bg-muted"
          >
            <UsersIcon aria-hidden className="size-5 shrink-0 text-primary" />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-base font-medium">Gerenciar elenco</span>
              <span className="text-sm text-muted-foreground">Cadastrar jogadores, redefinir senhas e dar acesso de organizador.</span>
            </span>
            <ChevronRightIcon aria-hidden className="size-5 shrink-0 text-muted-foreground" />
          </Link>
        )}

        {isAdmin && (
          <Link
            href="/admin"
            className="flex min-h-16 items-center gap-3 rounded-xl border bg-card px-4 transition-colors hover:bg-muted"
          >
            <ShieldIcon aria-hidden className="size-5 shrink-0 text-primary" />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-base font-medium">Painel da plataforma</span>
              <span className="text-sm text-muted-foreground">Peladas, planos, suspensão e novas peladas.</span>
            </span>
            <ChevronRightIcon aria-hidden className="size-5 shrink-0 text-muted-foreground" />
          </Link>
        )}

        <CommunityToggle
          title="Mostrar meu perfil para outras peladas"
          description={
            community.groupListed
              ? "Aparece no ranking público da sua pelada, no seu perfil e permite publicar conquistas no feed. Não mostra suas notas nem seu nome completo."
              : "Funciona quando o administrador ligar a sua pelada na comunidade."
          }
          initialEnabled={community.publicProfile}
          action={setPublicProfile}
        />

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:items-start">
          <OwnPhotoCard member={data.photoMember} />
          <div className="flex flex-col gap-3">
            <AccountDisclosure title="Seu nome e apelido">
              <OwnProfileCard />
            </AccountDisclosure>
            <AccountDisclosure title="Sua senha">
              <PasswordCard login={data.login} />
            </AccountDisclosure>
            <form action={signOut}>
              <Button
                type="submit"
                variant="outline"
                size="lg"
                className="h-11 w-full gap-2 text-base text-destructive hover:text-destructive"
              >
                <LogOutIcon aria-hidden className="size-5" />
                Sair da conta
              </Button>
            </form>
          </div>
        </div>
      </main>
    </>
  );
}

function MeSkeleton() {
  return (
    <>
      <AppHeader />
      <main aria-busy className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6">
        <div className="h-16 animate-pulse rounded-xl bg-card" />
        <div className="h-40 animate-pulse rounded-xl bg-card" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 2 }, (_, index) => (
            <div key={index} className="h-72 animate-pulse rounded-xl bg-card" />
          ))}
        </div>
      </main>
    </>
  );
}
