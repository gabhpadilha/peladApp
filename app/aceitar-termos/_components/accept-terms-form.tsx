"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { acceptTerms } from "../_actions/accept-terms";

/** Checkbox "Li e aceito" e o botão. O botão só liga com o aceite marcado. */
export function AcceptTermsForm({ next }: { next: string | null }) {
  const [isChecked, setIsChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await acceptTerms(next);
      // Em caso de sucesso a action redireciona; só chega aqui com erro.
      if (result && !result.success) setError(result.message);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm">
        <Checkbox checked={isChecked} onCheckedChange={(value) => setIsChecked(value === true)} className="mt-0.5 size-6" aria-label="Li e aceito" />
        <span>
          Li e aceito os{" "}
          <Link href="/termos" className="font-medium text-primary underline">Termos de Uso</Link> e a{" "}
          <Link href="/privacidade" className="font-medium text-primary underline">Política de Privacidade</Link>.
        </span>
      </label>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button type="submit" size="lg" disabled={!isChecked || isPending} className="h-11 w-full text-base">
        {isPending ? "Salvando…" : "Aceitar e continuar"}
      </Button>
    </form>
  );
}
