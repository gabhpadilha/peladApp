import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { LogOutIcon } from "lucide-react";
import { signOut } from "@/app/_actions/sign-out";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { getSafeRedirectPath } from "@/lib/safe-redirect";
import { hasAcceptedTerms, requireUserId } from "@/lib/session";
import { AcceptTermsForm } from "./_components/accept-terms-form";

export const metadata: Metadata = {
  title: "Termos · Cancha Club",
};

/** Primeiro acesso (e a cada nova versão dos termos): resumo, links dos documentos e o "Li e aceito". */
export default function AcceptTermsPage({ searchParams }: PageProps<"/aceitar-termos">) {
  return (
    <Suspense fallback={<main aria-busy className="flex flex-1 items-center justify-center px-4 py-12"><div className="h-96 w-full max-w-sm animate-pulse rounded-xl bg-card" /></main>}>
      <AcceptTermsContent searchParams={searchParams} />
    </Suspense>
  );
}

async function AcceptTermsContent({ searchParams }: { searchParams: PageProps<"/aceitar-termos">["searchParams"] }) {
  const { next } = await searchParams;
  const nextPath = typeof next === "string" ? getSafeRedirectPath(next) : null;
  const userId = await requireUserId("/aceitar-termos");
  if (await hasAcceptedTerms(userId)) redirect(nextPath ?? "/");

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="flex w-full max-w-md flex-col gap-5">
        <BrandLogo layout="stack" className="self-center" markClassName="h-16" textClassName="text-3xl" />
        <section className="flex flex-col gap-4 rounded-xl border bg-card p-5">
          <h1 className="font-display text-2xl font-bold tracking-wide uppercase">Antes de continuar</h1>
          <p className="text-sm text-muted-foreground">
            O Cancha Club é uma comunidade entre peladas. O que você precisa saber:
          </p>
          <ul className="flex flex-col gap-2 text-sm">
            <li className="flex gap-2"><span aria-hidden className="text-primary">●</span><span>Para outras peladas aparecem seu <strong>apelido, sua carta e foto, seus pontos e gols e suas conquistas</strong>.</span></li>
            <li className="flex gap-2"><span aria-hidden className="text-primary">●</span><span>Suas <strong>notas são anônimas</strong>, e seu nome completo e seu usuário <strong>nunca</strong> saem da sua pelada.</span></li>
            <li className="flex gap-2"><span aria-hidden className="text-primary">●</span><span>CanchaCoins e cartas são itens do jogo, sem valor em dinheiro.</span></li>
            <li className="flex gap-2"><span aria-hidden className="text-primary">●</span><span>Você pode pedir a correção ou a exclusão dos seus dados quando quiser.</span></li>
          </ul>
          <AcceptTermsForm next={nextPath} />
        </section>
        <form action={signOut}>
          <Button type="submit" variant="ghost" size="lg" className="h-11 w-full text-sm text-muted-foreground">
            <LogOutIcon aria-hidden className="size-4" />
            Sair sem aceitar
          </Button>
        </form>
      </div>
    </main>
  );
}
