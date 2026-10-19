import { PasswordForm } from "@/components/password-form";

type PasswordCardProps = {
  /** Usuário (ou e-mail, nas contas antigas) da conta logada. */
  login: string;
};

export function PasswordCard({ login }: PasswordCardProps) {
  return (
    <section aria-labelledby="password-title" className="flex flex-col gap-4 rounded-xl border bg-card p-4">
      <div>
        <h2 id="password-title" className="font-display text-lg font-bold tracking-wide uppercase">
          Sua senha
        </h2>
        <p className="text-sm text-muted-foreground">
          Para entrar com <span className="font-mono text-foreground">{login}</span> em outro aparelho.
        </p>
      </div>
      <PasswordForm email={login} />
    </section>
  );
}
