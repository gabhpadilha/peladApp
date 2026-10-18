import type { ReactNode } from "react";

type SectionTitleProps = {
  children: ReactNode;
  /** Ação ou contexto à direita do título (ex.: link "Ver todos"). */
  aside?: ReactNode;
  id?: string;
};

export function SectionTitle({ children, aside, id }: SectionTitleProps) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <h2 id={id} className="font-display text-lg font-bold tracking-wide uppercase">
        {children}
      </h2>
      {aside && <div className="text-sm text-muted-foreground">{aside}</div>}
    </div>
  );
}
