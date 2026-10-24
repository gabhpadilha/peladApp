import type { Metadata } from "next";
import { Suspense } from "react";
import { CreateGroupForm } from "./_components/create-group-form";
import { getOnboardingData } from "./_data-access/get-onboarding-data";

export const metadata: Metadata = {
  title: "Criar pelada · Cancha Club",
};

/**
 * Só o organizador passa por aqui, uma vez: os jogadores se cadastram pelo
 * link de convite e já caem dentro da pelada.
 */
export default function WelcomePage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-8 px-4 py-10">
      <div className="flex flex-col gap-2">
        <p className="font-display text-3xl font-extrabold tracking-wide uppercase">
          Cancha<span className="text-primary">Club</span>
        </p>
        <h1 className="text-xl font-medium">Crie a sua pelada</h1>
        <p className="text-sm text-muted-foreground">
          Depois você recebe o link de cadastro para mandar no grupo do WhatsApp.
        </p>
      </div>

      <section className="rounded-xl border bg-card p-5">
        {/* Lê a sessão: o formulário faz streaming atrás do Suspense. */}
        <Suspense fallback={<div className="h-[36rem] animate-pulse rounded-lg bg-muted/40" />}>
          <CreateGroupSection />
        </Suspense>
      </section>
    </main>
  );
}

async function CreateGroupSection() {
  const { fullName } = await getOnboardingData();
  return <CreateGroupForm defaultFullName={fullName} />;
}
