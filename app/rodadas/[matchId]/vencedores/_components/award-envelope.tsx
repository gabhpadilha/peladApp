import type { CSSProperties, ReactNode } from "react";
import { StarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type AwardEnvelopeProps = {
  /** Ordem de abertura: cada envelope começa um pouco depois do anterior. */
  order: number;
  /** Nome do prêmio, escrito no envelope. */
  label: string;
  /** `ash` = a zoeira (envelope cinza e a carta amassa). */
  tone?: "gold" | "ash";
  /** Segundos entre um envelope e o seguinte. */
  gap?: number;
  /** Quando o primeiro envelope entra (segundos). */
  start?: number;
  children: ReactNode;
};

/**
 * Um prêmio da noite de premiação: o envelope lacrado entra, a aba abre e a carta sobe de dentro dele
 * (pedido do dono do app em 2026-11-10). Só `transform` e `opacity`; sem animação, a carta aparece direto.
 */
export function AwardEnvelope({ order, label, tone = "gold", gap = 0.45, start = 0.5, children }: AwardEnvelopeProps) {
  const isAsh = tone === "ash";
  return (
    <div className="relative w-full" style={{ "--d": `${start + order * gap}s` } as CSSProperties}>
      <div className={cn("env-card", isAsh && "env-sagging")}>{children}</div>
      <div aria-hidden className="env-envelope pointer-events-none absolute inset-x-[-4%] bottom-[-4%] h-[42%] motion-reduce:hidden">
        <span
          className={cn(
            "absolute inset-0 rounded-md shadow-lg",
            isAsh ? "bg-linear-to-b from-zinc-500 to-zinc-700" : "bg-linear-to-b from-amber-100 to-amber-300",
          )}
        />
        <span
          className={cn(
            "absolute inset-0 rounded-md [clip-path:polygon(0_100%,50%_38%,100%_100%)]",
            isAsh ? "bg-linear-to-t from-zinc-600 to-zinc-500" : "bg-linear-to-t from-amber-200 to-amber-100",
          )}
        />
        <span
          className={cn(
            "absolute inset-x-1 bottom-1.5 text-center font-display text-[0.65rem] leading-tight font-bold tracking-wider uppercase",
            isAsh ? "text-zinc-100" : "text-amber-900",
          )}
        >
          {label}
        </span>
        <span
          className={cn(
            "env-flap absolute inset-x-0 top-0 h-[62%] rounded-t-md [clip-path:polygon(0_0,100%_0,50%_100%)]",
            isAsh ? "bg-linear-to-b from-zinc-400 to-zinc-500" : "bg-linear-to-b from-amber-300 to-amber-200",
          )}
        />
        <span
          className={cn(
            "env-seal absolute top-[42%] left-1/2 flex size-5 -translate-x-1/2 items-center justify-center rounded-full",
            isAsh ? "bg-zinc-800 text-zinc-300" : "bg-red-700 text-amber-200",
          )}
        >
          <StarIcon aria-hidden className="size-3" />
        </span>
      </div>
    </div>
  );
}
