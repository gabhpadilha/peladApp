import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { enterGroup } from "./_actions/enter-group";
import { JoinGroupForm } from "./_components/join-group-form";
import { SignUpForm } from "./_components/sign-up-form";
import { getInviteData } from "./_data-access/get-invite-data";

export const metadata: Metadata = {
  title: "Convite · PeladApp",
};

export default function InvitePage({ params }: PageProps<"/convite/[code]">) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-8 px-4 py-10">
      <p className="font-display text-3xl font-extrabold tracking-wide uppercase">
        Pelad<span className="text-primary">App</span>
      </p>
      {/* `params` e a sessão são dados de requisição: o convite faz streaming. */}
      <Suspense fallback={<div className="h-[32rem] animate-pulse rounded-xl bg-card" />}>
        <InviteContent params={params} />
      </Suspense>
    </main>
  );
}

async function InviteContent({ params }: { params: PageProps<"/convite/[code]">["params"] }) {
  const { code } = await params;
  const invite = await getInviteData(code.toLowerCase());

  if (invite.status === "invalid") {
    return (
      <section className="flex flex-col gap-4 rounded-xl border bg-card p-5">
        <h1 className="font-display text-2xl font-bold">Convite inválido</h1>
        <p className="text-sm text-muted-foreground">
          Esse link não existe ou foi trocado. Peça um novo para o organizador da pelada.
        </p>
        <Button asChild variant="secondary" size="lg">
          <Link href="/entrar">Ir para o login</Link>
        </Button>
      </section>
    );
  }

  if (invite.status === "member") {
    return (
      <section className="flex flex-col gap-4 rounded-xl border bg-card p-5">
        <h1 className="font-display text-2xl font-bold">Você já está nessa</h1>
        <p className="text-sm text-muted-foreground">
          Você já faz parte de <span className="font-medium text-foreground">{invite.groupName}</span>.
        </p>
        <form action={enterGroup.bind(null, invite.groupId)}>
          <Button type="submit" size="lg" className="h-11 w-full text-base">
            Abrir a pelada
          </Button>
        </form>
      </section>
    );
  }

  const inviteCode = code.toLowerCase();

  return (
    <section className="flex flex-col gap-5 rounded-xl border bg-card p-5">
      <div>
        <p className="text-sm text-muted-foreground">Você foi convidado para</p>
        <h1 className="font-display text-3xl font-bold">{invite.groupName}</h1>
      </div>
      {invite.status === "sign-up" ? (
        <>
          <SignUpForm inviteCode={inviteCode} />
          <p className="text-center text-sm text-muted-foreground">
            Já tem conta?{" "}
            <Link href={`/entrar?next=/convite/${inviteCode}`} className="text-primary underline">
              Entrar
            </Link>
          </p>
        </>
      ) : (
        <JoinGroupForm inviteCode={inviteCode} defaultFullName={invite.defaultFullName} />
      )}
    </section>
  );
}
