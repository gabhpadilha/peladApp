import Link from "next/link";
import { ArrowRightIcon, LockIcon } from "lucide-react";
import { PlayerCard } from "@/components/player-card";
import { SAMPLE_PLAYER } from "@/lib/sample-player";
import { BOOSTED_AWARDS, withAwardBonus } from "@/lib/award-bonus";
import { CARD_THEME_LABELS, type CardThemeKey } from "@/lib/card-themes";
import { AWARD_KINDS, AWARD_LABELS } from "@/types/award";
import type { Player } from "@/types/player";

type EmptyCollectionProps = {
  player: Player;
  isOwnProfile: boolean;
  /** Tema deste mês: a prévia mostra as cartas que dá para ganhar agora. */
  theme: CardThemeKey;
};

/** Coleção vazia: prévia apagada das cartas que o atleta pode ganhar, e como ganhar. */
export function EmptyCollection({ player, isOwnProfile, theme }: EmptyCollectionProps) {
  return (
    <section aria-labelledby="empty-collection-title" className="flex flex-col gap-4 rounded-xl border border-dashed bg-card/50 p-4">
      <div>
        <h2 id="empty-collection-title" className="font-display text-lg font-bold tracking-wide uppercase">
          {isOwnProfile ? "Sua coleção começa aqui" : "Nenhuma carta ainda"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {isOwnProfile
            ? `Essas são as cartas que você pode ganhar ${theme === "default" ? "agora" : `no tema ${CARD_THEME_LABELS[theme]}`}. Quando a rodada fecha, as notas decidem quase tudo: Melhor Jogador, um prêmio por atributo, Goleiro, Time da Semana e, na zoeira, a Bola Murcha (a menor nota). Só o Gol da Rodada é no voto.`
            : `Quando ${player.nickname} ganhar uma carta especial, ela aparece aqui.`}
        </p>
      </div>

      <ul aria-label="Cartas que dá para ganhar" className="grid grid-cols-3 gap-2 sm:gap-4">
        {AWARD_KINDS.map((kind) => (
          <li key={kind} className="mx-auto flex w-full max-w-40 min-w-0 flex-col items-center gap-1.5 text-center">
            <div className="relative w-full">
              {/* Bloqueada: apagada e sem cor até ser ganha. */}
              <div className="opacity-40 grayscale">
                <PlayerCard player={withAwardBonus(SAMPLE_PLAYER, kind)} award={{ kind, theme }} size="fill" />
              </div>
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="rounded-full border bg-background/80 p-2">
                  <LockIcon aria-hidden className="size-4" />
                </span>
              </span>
            </div>
            <span className="text-xs leading-tight font-medium sm:text-sm">{AWARD_LABELS[kind].title}</span>
            <span className="text-xs text-muted-foreground">
              {BOOSTED_AWARDS.includes(kind) ? "+1 em tudo" : "sem bônus"}
            </span>
          </li>
        ))}
      </ul>

      {isOwnProfile && (
        <Link
          href="/rodadas"
          className="inline-flex w-fit items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          Ver as rodadas
          <ArrowRightIcon aria-hidden className="size-4" />
        </Link>
      )}
    </section>
  );
}
