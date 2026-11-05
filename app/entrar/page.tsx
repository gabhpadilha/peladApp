import type { Metadata } from "next";
import { Suspense } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { SignInForm } from "./_components/sign-in-form";

export const metadata: Metadata = {
  title: "Entrar · Cancha Club",
};

export default function SignInPage({ searchParams }: PageProps<"/entrar">) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="flex w-full max-w-sm flex-col gap-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <BrandLogo layout="stack" markClassName="h-20" textClassName="text-4xl" />
          <div className="flex flex-col gap-1">
            <h1 className="text-lg font-medium">Entrar</h1>
            <p className="text-sm text-muted-foreground">Use o usuário e a senha que o Administrador te passou.</p>
          </div>
        </div>
        <div className="flex flex-col gap-4 rounded-xl border bg-card p-6">
          {/* `searchParams` é dado de requisição: só esta parte espera por ele. */}
          <Suspense fallback={<SignInForm />}>
            <SignInContent searchParams={searchParams} />
          </Suspense>
        </div>
        <p className="text-center text-sm text-muted-foreground">
          Sem conta ou esqueceu a senha? Peça ao Administrador da pelada: só ele cria e redefine acessos.
        </p>
      </div>
    </main>
  );
}

async function SignInContent({
  searchParams,
}: {
  searchParams: PageProps<"/entrar">["searchParams"];
}) {
  const { next } = await searchParams;
  return <SignInForm next={typeof next === "string" ? next : undefined} />;
}
