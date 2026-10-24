import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { LogOutIcon } from "lucide-react";
import { signOut } from "@/app/_actions/sign-out";
import { AppHeader } from "@/components/app-header";
import { CoinPill } from "@/components/coin-pill";
import { GroupGate } from "@/components/group-gate";
import { PlayerCard } from "@/components/player-card";
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

/** A própria conta: carta, Minhas cartas, foto, nome e apelido, senha e sair. */
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
          <PlayerCard player={me} size="sm" className="shrink-0" />
          <div className="flex min-w-0 flex-col items-start gap-1.5">
            <p className="truncate font-display text-3xl leading-none font-bold">{me.nickname}</p>
            <p className="text-sm text-muted-foreground">
              {POSITION_LABELS[me.position]} · Nível {data.progression.level}
            </p>
            <CoinPill value={data.balance} />
          </div>
        </div>

        <MyCards me={me} cards={data.cards} />

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
