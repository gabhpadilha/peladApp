import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Link inválido · Cancha Club",
};

export default function AuthErrorPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        <h1 className="font-display text-3xl font-bold">Link inválido ou expirado</h1>
        <p className="text-sm text-muted-foreground">
          Links de acesso por e-mail só funcionam uma vez. Entre com seu e-mail e senha.
        </p>
        <Button asChild size="lg">
          <Link href="/entrar">Ir para o login</Link>
        </Button>
      </div>
    </main>
  );
}
