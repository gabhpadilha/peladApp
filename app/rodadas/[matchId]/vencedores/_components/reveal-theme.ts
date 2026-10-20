import type { CSSProperties } from "react";
import type { CardThemeKey } from "@/lib/card-themes";
import type { AwardKind } from "@/types/award";

/** Prêmios de zoeira: a carta cai e amassa, sem raios nem faíscas. */
export const ZOEIRA_AWARDS: readonly AwardKind[] = ["bola_murcha", "fominha"];

/**
 * Cor da moldura do prêmio no tema da carta, exposta como `--reveal-color`
 * para as classes da revelação (brilho, raios, ícone).
 */
export function revealColorStyle(kind: AwardKind, theme: CardThemeKey): CSSProperties {
  const token = `--award-${kind.replaceAll("_", "-")}${theme === "default" ? "" : `-${theme}`}-frame`;
  return { "--reveal-color": `var(${token})` } as CSSProperties;
}

/** Visual do pacote e do fundo em cada tema (classes literais para o Tailwind). */
export const PACK_THEMES: Record<
  CardThemeKey,
  { screen: string; cap: string; body: string; text: string; border: string; label: string | null }
> = {
  default: {
    screen: "bg-[radial-gradient(circle_at_50%_40%,oklch(0.22_0.02_160),oklch(0.1_0.01_160)_70%)]",
    cap: "bg-linear-to-b from-award-craque-frame to-[oklch(0.62_0.12_75)]",
    body: "bg-linear-160 from-[oklch(0.3_0.02_85)] to-award-craque-to",
    text: "text-award-craque-foreground",
    border: "border-award-craque-frame/60",
    label: null,
  },
  halloween: {
    screen: "bg-[radial-gradient(circle_at_50%_40%,oklch(0.2_0.04_300),oklch(0.09_0.015_300)_70%)]",
    cap: "bg-linear-to-b from-award-craque-halloween-frame to-[oklch(0.6_0.16_45)]",
    body: "bg-linear-160 from-[oklch(0.3_0.08_300)] to-award-craque-halloween-to",
    text: "text-award-craque-halloween-foreground",
    border: "border-award-craque-halloween-frame/60",
    label: "Halloween",
  },
};
