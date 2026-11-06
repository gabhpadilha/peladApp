"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type CommunityTabsProps = { groups: ReactNode; feed: ReactNode };

/** Troca Peladas | Feed. As duas ficam montadas e só uma aparece. */
export function CommunityTabs({ groups, feed }: CommunityTabsProps) {
  const [active, setActive] = useState<"groups" | "feed">("groups");
  const tabs = [
    { key: "groups", label: "Peladas" },
    { key: "feed", label: "Feed" },
  ] as const;
  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" aria-label="Comunidade" className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={active === tab.key}
            onClick={() => setActive(tab.key)}
            className={cn(
              "h-11 rounded-lg text-sm font-bold transition-colors",
              active === tab.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div hidden={active !== "groups"}>{groups}</div>
      <div hidden={active !== "feed"}>{feed}</div>
    </div>
  );
}
