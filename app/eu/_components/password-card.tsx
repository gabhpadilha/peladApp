import { PasswordForm } from "@/components/password-form";

type PasswordCardProps = {
  /** Usuário (ou e-mail, nas contas antigas) da conta logada. */
  login: string;
};

/** Formulário de "Sua senha" (página Eu, dentro de `AccountDisclosure`). */
export function PasswordCard({ login }: PasswordCardProps) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Para entrar com <span className="font-mono text-foreground">{login}</span> em outro aparelho.
      </p>
      <PasswordForm email={login} />
    </div>
  );
}
