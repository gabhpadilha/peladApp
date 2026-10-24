import type { Metadata } from "next";
import { LogOutIcon } from "lucide-react";
import { signOut } from "@/app/_actions/sign-out";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Conta desativada · Cancha Club",
};

/** Quem foi desativado pelo organizador cai aqui até a sessão acabar. */
export default function DeactivatedAccountPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="flex w-full max-w-sm flex-col gap-6 text-center">
        <p className="font-display text-4xl font-extrabold tracking-wide uppercase">
          Cancha<span className="text-primary">Club</span>
        </p>
        <div className="flex flex-col gap-2 rounded-xl border bg-card p-6">
          <h1 className="font-display text-xl font-bold tracking-wide uppercase">Conta desativada</h1>
          <p className="text-sm text-muted-foreground">
            O organizador desativou sua conta na pelada. Suas notas e cartas continuam no histórico. Se você
            voltar a jogar, peça para ele reativar.
          </p>
        </div>
        <form action={signOut}>
          <Button type="submit" variant="outline" size="lg" className="h-11 w-full text-base">
            <LogOutIcon aria-hidden className="size-4" />
            Sair
          </Button>
        </form>
      </div>
    </main>
  );
}
