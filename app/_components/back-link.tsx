"use client";

import { useRouter } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";

/** "Voltar" que desfaz a navegação (volta para a tela de aceite ou para onde a pessoa estava); sem histórico, vai ao início. */
export function BackLink() {
  const router = useRouter();
  function handleBack() {
    if (window.history.length > 1) router.back();
    else router.push("/");
  }
  return (
    <button type="button" onClick={handleBack} className="inline-flex min-h-11 w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeftIcon aria-hidden className="size-4" />
      Voltar
    </button>
  );
}
