import Link from "next/link";
import { ErrorState } from "@/components/state-panels";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Página ou jogador que não existe (link antigo, atleta fora da pelada). */
export default function NotFound() {
  return (
    <ErrorState
      title="Não achei essa página"
      actions={
        <Link href="/" className={cn(buttonVariants({ size: "lg" }), "h-11 text-base")}>
          Voltar ao Início
        </Link>
      }
    >
      <p>O endereço pode ter mudado, ou esse jogador não está nesta pelada.</p>
    </ErrorState>
  );
}
