import { PasswordForm } from "@/components/password-form";

type PasswordCardProps = {
  email: string;
};

export function PasswordCard({ email }: PasswordCardProps) {
  return (
    <section aria-labelledby="password-title" className="flex flex-col gap-4 rounded-xl border bg-card p-4">
      <div>
        <h2 id="password-title" className="font-display text-lg font-bold tracking-wide uppercase">
          Sua senha
        </h2>
        <p className="text-sm text-muted-foreground">
          Para entrar com <span className="text-foreground">{email}</span> em outro aparelho.
        </p>
      </div>
      <PasswordForm email={email} />
    </section>
  );
}
