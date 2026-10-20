import { GhostIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CardThemeKey } from "@/lib/card-themes";
import { cn } from "@/lib/utils";
import { PACK_THEMES } from "./reveal-theme";

type RevealPackProps = {
  round: number;
  theme: CardThemeKey;
  /** Texto do conteúdo, ex.: "9 cartas + Time da Semana". */
  contents: string;
  isOpening: boolean;
  onOpen: () => void;
};

// Serrilhado de pacote de figurinha: em cima da tampa e embaixo do corpo.
const CAP_CLIP =
  "[clip-path:polygon(0%_10px,5%_0px,10%_10px,15%_0px,20%_10px,25%_0px,30%_10px,35%_0px,40%_10px,45%_0px,50%_10px,55%_0px,60%_10px,65%_0px,70%_10px,75%_0px,80%_10px,85%_0px,90%_10px,95%_0px,100%_10px,100%_100%,0%_100%)]";
const BODY_CLIP =
  "[clip-path:polygon(0%_0%,100%_0%,100%_97%,95%_100%,90%_97%,85%_100%,80%_97%,75%_100%,70%_97%,65%_100%,60%_97%,55%_100%,50%_97%,45%_100%,40%_97%,35%_100%,30%_97%,25%_100%,20%_97%,15%_100%,10%_97%,5%_100%,0%_97%)]";

/** O pacote da rodada: flutua até o toque; ao abrir, treme, a tampa voa e sai luz. */
export function RevealPack({ round, theme, contents, isOpening, onOpen }: RevealPackProps) {
  const look = PACK_THEMES[theme];

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-9 px-6">
      <button
        type="button"
        onClick={onOpen}
        disabled={isOpening}
        aria-label={`Abrir o pacote da rodada ${round}`}
        className={cn(
          "relative h-85 w-57.5 shrink-0 cursor-pointer outline-none focus-visible:ring-3 focus-visible:ring-ring/60",
          isOpening ? "animate-[reveal-shake_0.6s_ease-in-out_both]" : "animate-[reveal-float_3.2s_ease-in-out_infinite]",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "absolute inset-x-0 top-0 h-12",
            CAP_CLIP,
            look.cap,
            isOpening && "animate-[reveal-cap-off_0.7s_ease-in_0.6s_both]",
          )}
        />
        <span aria-hidden className={cn("absolute inset-x-0 top-11.5 bottom-0 overflow-hidden", BODY_CLIP, look.body)}>
          <span className={cn("absolute inset-2 rounded-md border-[1.5px]", look.border)} />
          {theme === "halloween" && (
            <GhostIcon className="absolute -right-8 -bottom-5 size-40 text-white/7" />
          )}
          <span className="absolute inset-y-0 left-0 w-[30%] animate-[reveal-shine_2.8s_ease-in-out_infinite] bg-linear-to-r from-transparent via-white/18 to-transparent" />
          <span className={cn("relative flex h-full flex-col items-center justify-center gap-2.5 font-display", look.text)}>
            <span className="text-xl font-extrabold tracking-[0.3em]">PELADAPP</span>
            {look.label && (
              <span className="text-sm font-bold tracking-[0.2em] text-award-gol-halloween-frame uppercase">
                {look.label}
              </span>
            )}
            <span className="text-6xl leading-none font-extrabold">?</span>
            <span className="text-4xl leading-none font-extrabold">RODADA {round}</span>
            <span className="font-sans text-xs tracking-wide text-white/80 uppercase">{contents}</span>
          </span>
        </span>
      </button>

      {isOpening ? (
        // Luz saindo da fresta, explosão e tela branca (sem animação, nada disso aparece).
        <>
          <span
            aria-hidden
            className="absolute top-[calc(50%-7.75rem)] left-1/2 h-1.5 w-60 -translate-x-1/2 animate-[reveal-seam_0.4s_ease-out_0.55s_both] rounded-full bg-[oklch(0.96_0.08_80)] shadow-[0_0_30px_10px_oklch(0.85_0.14_75/0.8)] motion-reduce:hidden"
          />
          <span
            aria-hidden
            className="absolute top-[calc(50%-14rem)] left-[calc(50%-6.25rem)] size-50 animate-[reveal-burst_0.8s_ease-in_0.75s_both] rounded-full bg-[radial-gradient(circle,oklch(0.98_0.06_80),oklch(0.85_0.14_75/0.6)_40%,transparent_70%)] motion-reduce:hidden"
          />
          <span
            aria-hidden
            className="fixed inset-0 z-30 animate-[reveal-flash_1.6s_linear_both] bg-[oklch(0.98_0.03_80)] motion-reduce:hidden"
          />
        </>
      ) : (
        <div className="flex w-full max-w-sm flex-col items-center gap-3">
          <Button size="lg" className="h-11 w-full text-base" onClick={onOpen}>
            Abrir o pacote
          </Button>
          <span className="text-sm text-muted-foreground">Ou toque no pacote</span>
        </div>
      )}
    </div>
  );
}
