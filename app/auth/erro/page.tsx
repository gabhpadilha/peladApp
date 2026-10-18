import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Link inválido · PeladApp",
};

export default function AuthErrorPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        <h1 className="font-display text-3xl font-bold">Link inválido ou expirado</h1>
        <p className="text-sm text-muted-foreground">
          Os links de acesso valem por pouco tempo e só podem ser usados uma vez. Peça um novo.
        </p>
        <Button asChild size="lg">
          <Link href="/entrar">Pedir novo link</Link>
        </Button>
      </div>
    </main>
  );
}
