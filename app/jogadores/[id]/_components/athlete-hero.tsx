import { OvrDelta } from "@/components/ovr-delta";
import { PlayerCard } from "@/components/player-card";
import { CARD_TIER_LABELS, getCardTier } from "@/lib/card-tier";
import { POSITION_LABELS } from "@/types/player";
import type { AthleteProfile } from "../_data-access/get-athlete-profile";

type AthleteHeroProps = {
  profile: AthleteProfile;
};

export function AthleteHero({ profile }: AthleteHeroProps) {
  const { player } = profile;
  const tier = getCardTier(player.ovr ?? 0);
  const rankLabel = player.role === "goalkeeper" ? "entre goleiros" : "na linha";

  const stats = [
    {
      label: "OVR",
      value: player.ovr ?? "–",
      detail: <OvrDelta delta={profile.delta} className="text-xs" />,
    },
    profile.isActive
      ? { label: "Ranking", value: `${profile.rank.position}º`, detail: rankLabel }
      : { label: "Ranking", value: "–", detail: "fora da pelada" },
    { label: "Jogos", value: profile.gamesPlayed, detail: null },
    { label: "Avaliações", value: profile.evaluationsReceived, detail: "recebidas" },
  ];

  return (
    <section
      aria-labelledby="athlete-name"
      className="relative flex flex-col items-center gap-6 overflow-hidden rounded-xl border bg-card p-6 md:flex-row md:items-center md:gap-10"
    >
      {/* Número gigante e apagado ao fundo, como nas referências de perfil */}
      <span
        aria-hidden
        className="pointer-events-none absolute -right-4 -bottom-16 font-display text-[16rem] leading-none font-extrabold text-foreground/[0.04] select-none"
      >
        {player.ovr ?? ""}
      </span>

      <PlayerCard player={player} size="lg" className="md:shrink-0" />

      <div className="relative flex w-full flex-col gap-6">
        <div className="text-center md:text-left">
          <p className="text-sm text-muted-foreground">
            {POSITION_LABELS[player.position]} · Carta {CARD_TIER_LABELS[tier]}
            {!profile.isActive && " · Desativado"}
          </p>
          <h1 id="athlete-name" className="font-display text-5xl font-extrabold">
            {player.nickname}
          </h1>
          <p className="text-muted-foreground">{player.fullName}</p>
        </div>

        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-lg bg-muted/50 px-3 py-2">
              <dt className="text-xs text-muted-foreground uppercase">{stat.label}</dt>
              <dd className="flex items-baseline gap-2">
                <span className="font-display text-3xl font-bold tabular-nums">{stat.value}</span>
                {stat.detail && <span className="text-xs text-muted-foreground">{stat.detail}</span>}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
