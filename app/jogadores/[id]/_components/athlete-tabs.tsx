import Link from "next/link";
import { ChartColumnIcon, GalleryVerticalEndIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type AthleteTabsProps = {
  memberId: string;
  /** Quantas cartas especiais o atleta tem (contador da aba). */
  awardCount: number;
  active: "stats" | "collection";
};

const TAB = "flex h-11 items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors";

/** Alterna entre Estatísticas (carta vigente) e Coleção (cartas especiais) do atleta. */
export function AthleteTabs({ memberId, awardCount, active }: AthleteTabsProps) {
  const tabs = [
    { key: "stats", href: `/jogadores/${memberId}`, label: "Estatísticas", icon: ChartColumnIcon, count: null },
    {
      key: "collection",
      href: `/jogadores/${memberId}/colecao`,
      label: "Coleção",
      icon: GalleryVerticalEndIcon,
      count: awardCount,
    },
  ] as const;

  return (
    <nav aria-label="Seções do atleta" className="grid grid-cols-2 gap-1 rounded-xl border bg-card p-1">
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        const Icon = tab.icon;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              TAB,
              isActive ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
            )}
          >
            <Icon aria-hidden className={cn("size-4", isActive && "text-primary")} />
            {tab.label}
            {tab.count !== null && (
              <span className="rounded-md bg-background/60 px-1.5 text-xs tabular-nums">{tab.count}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
