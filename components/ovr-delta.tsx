import { MinusIcon, TriangleIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type OvrDeltaProps = {
  delta: number | null;
  className?: string;
};

/** Variação do OVR na última rodada: ícone + número, nunca só cor. */
export function OvrDelta({ delta, className }: OvrDeltaProps) {
  if (delta === null) return null;

  if (delta === 0) {
    return (
      <span className={cn("inline-flex items-center gap-1 text-muted-foreground", className)}>
        <MinusIcon aria-hidden className="size-3" />
        <span className="sr-only">OVR </span>estável
      </span>
    );
  }

  const isUp = delta > 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-medium tabular-nums",
        isUp ? "text-success" : "text-destructive",
        className,
      )}
    >
      <TriangleIcon aria-hidden className={cn("size-2.5 fill-current", !isUp && "rotate-180")} />
      <span className="sr-only">{isUp ? "subiu" : "caiu"} </span>
      {Math.abs(delta)}
    </span>
  );
}
