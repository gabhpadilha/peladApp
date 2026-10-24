import { useId } from "react";
import { cn } from "@/lib/utils";

/** O formato das cartas (o mesmo `SHIELD_PATH` do player-card), em unidades 100 x 148. */
const CARD_SHAPE =
  "M16,5.18 Q50,0 84,5.18 Q88,13.32 100,12.58 L100,124.32 Q100,130.24 94,133.2 L56,145.78 Q50,148 44,145.78 L6,133.2 Q0,130.24 0,124.32 L0,12.58 Q12,13.32 16,5.18 Z";
const CARD_TRANSFORM = "translate(128.5 67) scale(2.55)";
/** Círculo central aberto à direita: vira o "c" (34° de abertura de cada lado). */
const CENTER_C = "M314.03 212.86A70 70 0 1 0 314.03 291.14";

/**
 * Marca do Cancha Club ("Quadra vazada", aprovada pelo dono do app em 2026-10-24): a carta do app
 * cheia é a quadra, com as linhas recortadas (vazadas, mostram o fundo); o círculo central vira o "c".
 * Cor da carta = `currentColor` (lima por padrão).
 */
export function BrandMark({ className }: { className?: string }) {
  // O id do React traz caracteres que quebram o `url(#...)` da máscara.
  const maskId = `brand-mark-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <svg viewBox="124 63 264 386" className={cn("text-primary", className)} aria-hidden="true">
      <defs>
        <mask id={maskId}>
          <path d={CARD_SHAPE} transform={CARD_TRANSFORM} fill="white" />
          <g fill="none" stroke="black" strokeWidth="16">
            <path d={CENTER_C} />
            <line x1="120" y1="252" x2="186" y2="252" />
            <path d="M206 60V112H306V60" />
            <path d="M206 452V392H306V452" />
          </g>
          <circle cx="256" cy="252" r="16" fill="black" />
        </mask>
      </defs>
      <rect x="124" y="63" width="264" height="386" fill="currentColor" mask={`url(#${maskId})`} />
    </svg>
  );
}

type BrandLogoProps = {
  /** "row": marca ao lado do nome (cabeçalho); "stack": marca em cima (telas de entrada). */
  layout?: "row" | "stack";
  className?: string;
  markClassName?: string;
  textClassName?: string;
};

/** Logo completo: a marca e o nome "CANCHA" + "CLUB" em lima, em `font-display` caixa alta. */
export function BrandLogo({ layout = "row", className, markClassName, textClassName }: BrandLogoProps) {
  return (
    <span
      className={cn("inline-flex items-center", layout === "row" ? "gap-2" : "flex-col gap-3", className)}
      aria-label="Cancha Club"
    >
      <BrandMark className={cn("h-8 w-auto", markClassName)} />
      <span
        aria-hidden="true"
        className={cn("font-display text-2xl font-extrabold tracking-wide uppercase", textClassName)}
      >
        Cancha<span className="text-primary">Club</span>
      </span>
    </span>
  );
}
