import { AWARD_ICONS } from "@/components/award-icons";
import { PlayerCard } from "@/components/player-card";
import { Button } from "@/components/ui/button";
import { assignFormation, type FormationSlotKey } from "@/lib/formation";
import { cn } from "@/lib/utils";
import { AWARD_LABELS, formatRoundScore, type Award } from "@/types/award";
import { revealColorStyle } from "./reveal-theme";

type RevealTeamProps = {
  /** Time da Semana ou Time do Mês (todas as cartas do mesmo prêmio). */
  team: Award[];
  subtitle: string;
  /** Texto do botão: o próximo passo ("E o Time do Mês…") ou "Ver todos os vencedores". */
  doneLabel: string;
  onDone: () => void;
};

/** Onde cada vaga fica no campo e quando a carta entra: do gol para o ataque. */
const SLOT_LAYOUT: Record<FormationSlotKey, { place: string; enter: string }> = {
  pivo: { place: "top-1.5 left-1/2 -translate-x-1/2", enter: "animate-[reveal-pop_0.45s_cubic-bezier(0.2,0.9,0.3,1.3)_2.6s_both]" },
  "ala-esquerda": { place: "top-26 left-3", enter: "animate-[reveal-pop_0.45s_cubic-bezier(0.2,0.9,0.3,1.3)_1.8s_both]" },
  "ala-direita": { place: "top-26 right-3", enter: "animate-[reveal-pop_0.45s_cubic-bezier(0.2,0.9,0.3,1.3)_2.2s_both]" },
  fixo: { place: "top-50 left-1/2 -translate-x-1/2", enter: "animate-[reveal-pop_0.45s_cubic-bezier(0.2,0.9,0.3,1.3)_1.4s_both]" },
  gol: { place: "top-86 left-1/2 -translate-x-1/2", enter: "animate-[reveal-pop_0.45s_cubic-bezier(0.2,0.9,0.3,1.3)_1s_both]" },
};

function TeamCard({ award }: { award: Award }) {
  return (
    <div className="flex w-19 flex-col items-center gap-1">
      <PlayerCard player={award.card} award={award} size="fill" />
      {award.score !== null && (
        <span className="rounded-full bg-primary px-2 text-xs font-semibold text-primary-foreground tabular-nums">
          {formatRoundScore(award.score)}
        </span>
      )}
    </div>
  );
}

/** Time da Semana (ou do Mês) entrando em campo no 1-2-1, uma carta por vez, com a nota. */
export function RevealTeam({ team, subtitle, doneLabel, onDone }: RevealTeamProps) {
  const slots = assignFormation(team.map((award) => ({ position: award.card.position, award })));
  const placed = new Set(Object.values(slots).flatMap((slot) => (slot ? [slot.award.id] : [])));
  // Empate na última vaga: quem não coube nas 5 vagas aparece embaixo do campo.
  const extras = team.filter((award) => !placed.has(award.id));
  const kind = team[0]?.kind ?? "time_da_semana";
  const theme = team[0]?.theme ?? "default";
  const title = AWARD_LABELS[kind].title;
  const Icon = AWARD_ICONS[kind];

  return (
    <section
      aria-live="polite"
      aria-label={title}
      style={revealColorStyle(kind, theme)}
      className="absolute inset-0 flex flex-col items-center gap-5 overflow-y-auto px-4 pt-20 pb-[max(2rem,env(safe-area-inset-bottom))]"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 animate-[reveal-fade_0.8s_ease-out_both] bg-[radial-gradient(circle_at_50%_15%,color-mix(in_oklch,var(--reveal-color)_40%,transparent),transparent_60%)]"
      />

      <div className="relative flex animate-[reveal-in_0.5s_ease-out_both] flex-col items-center gap-2 text-center">
        <span className="flex size-12 items-center justify-center rounded-full border-2 border-(--reveal-color) text-(--reveal-color)">
          <Icon aria-hidden className="size-6" />
        </span>
        <h2 className="font-display text-4xl leading-none font-extrabold uppercase">{title}</h2>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>

      <div className="relative h-124 w-full max-w-sm shrink-0 animate-[reveal-fade_0.5s_ease-out_0.6s_both] overflow-hidden rounded-2xl border border-white/8 bg-[repeating-linear-gradient(0deg,rgb(255_255_255/0.015)_0_40px,transparent_40px_80px)] bg-card">
        <span aria-hidden className="absolute -top-17.5 left-1/2 size-35 -translate-x-1/2 rounded-full border border-white/8" />
        <span aria-hidden className="absolute inset-x-[25%] bottom-0 h-20 rounded-t-[5rem] border border-b-0 border-white/8" />
        {(Object.keys(SLOT_LAYOUT) as FormationSlotKey[]).map((key) => {
          const slot = slots[key];
          if (!slot) return null;
          return (
            <div key={key} className={cn("absolute", SLOT_LAYOUT[key].place)}>
              <div className={SLOT_LAYOUT[key].enter}>
                <TeamCard award={slot.award} />
              </div>
            </div>
          );
        })}
      </div>

      {extras.length > 0 && (
        <div className="relative flex animate-[reveal-fade_0.4s_ease-out_3s_both] flex-col items-center gap-2">
          <p className="text-xs text-muted-foreground uppercase">Empate: também no time</p>
          <div className="flex flex-wrap justify-center gap-3">
            {extras.map((award) => (
              <TeamCard key={award.id} award={award} />
            ))}
          </div>
        </div>
      )}

      <Button
        size="lg"
        className="relative h-11 w-full max-w-sm shrink-0 animate-[reveal-fade_0.4s_ease-out_3.2s_both] text-base"
        onClick={onDone}
      >
        {doneLabel}
      </Button>
    </section>
  );
}
