import type { Metadata } from "next";
import { Suspense } from "react";
import { PasswordForm } from "@/components/password-form";
import { getPasswordChangeData } from "./_data-access/get-password-change-data";

export const metadata: Metadata = {
  title: "Escolha sua senha · PeladApp",
};

/** Primeiro acesso de quem foi cadastrado pelo organizador com senha provisória. */
export default function ChangePasswordPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="flex w-full max-w-sm flex-col gap-8">
        <div className="flex flex-col gap-2 text-center">
          <p className="font-display text-4xl font-extrabold tracking-wide uppercase">
            Pelad<span className="text-primary">App</span>
          </p>
          <h1 className="text-lg font-medium">Escolha sua senha</h1>
          <p className="text-sm text-muted-foreground">
            Você entrou com a senha provisória. Agora crie a sua; é ela que você vai usar daqui pra frente.
          </p>
        </div>
        <div className="rounded-xl border bg-card p-6">
          {/* Lê a sessão: o formulário faz streaming. */}
          <Suspense fallback={<div className="h-64 animate-pulse rounded-lg bg-muted/40" />}>
            <ChangePasswordForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}

async function ChangePasswordForm() {
  const { email } = await getPasswordChangeData();
  return <PasswordForm email={email} redirectTo="/" submitLabel="Salvar e entrar" />;
}
