import type { Metadata } from "next";
import { Suspense } from "react";
import { SignInForm } from "./_components/sign-in-form";

export const metadata: Metadata = {
  title: "Entrar · Cancha Club",
};

export default function SignInPage({ searchParams }: PageProps<"/entrar">) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="flex w-full max-w-sm flex-col gap-8">
        <div className="flex flex-col gap-2 text-center">
          <p className="font-display text-4xl font-extrabold tracking-wide uppercase">
            Cancha<span className="text-primary">Club</span>
          </p>
          <h1 className="text-lg font-medium">Entrar</h1>
        </div>
        <div className="flex flex-col gap-4 rounded-xl border bg-card p-6">
          {/* `searchParams` é dado de requisição: só esta parte espera por ele. */}
          <Suspense fallback={<SignInForm />}>
            <SignInContent searchParams={searchParams} />
          </Suspense>
        </div>
        <p className="text-center text-sm text-muted-foreground">
          Ainda não tem conta ou esqueceu a senha? Fale com o organizador da pelada.
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
