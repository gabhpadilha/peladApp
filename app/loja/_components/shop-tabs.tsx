import Link from "next/link";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "loja", href: "/loja", label: "Loja" },
  { key: "mercado", href: "/loja/mercado", label: "Mercado" },
] as const;

/** Loja e Mercado no mesmo botão da barra: a troca fica aqui em cima (decisão do dono do app em 2026-11-09). */
export function ShopTabs({ current }: { current: (typeof TABS)[number]["key"] }) {
  return (
    <nav aria-label="Loja e Mercado" className="grid grid-cols-2 rounded-xl bg-muted p-1 sm:max-w-sm">
      {TABS.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          prefetch
          aria-current={tab.key === current ? "page" : undefined}
          className={cn(
            "flex h-10 items-center justify-center rounded-lg text-sm font-medium text-muted-foreground transition-colors",
            tab.key === current && "bg-background font-semibold text-foreground shadow-sm",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
