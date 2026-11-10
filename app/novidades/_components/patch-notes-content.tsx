import Link from "next/link";
import { ArrowRightIcon, PlayIcon } from "lucide-react";
import { MarketGuideVisual, PacksGuideVisual, RarityGuideVisual, GoalsGuideVisual } from "@/app/_components/news-guide";
import { PatchVideoButton } from "@/components/patch-video-modal";
import { ShowcaseCard } from "@/components/showcase-card";
import { PACK_RARITY_NAMES, type PackRarity } from "@/lib/packs";
import type { PatchMonth, PatchSection } from "@/lib/patch-notes";
import { cn } from "@/lib/utils";
import type { AwardKind } from "@/types/award";
import type { CardSkinKey } from "@/types/card-skin";

/** Os cinco prêmios com o visual do Toró (tema `temporal`). */
const AWARDS: readonly [AwardKind, string][] = [
  ["craque", "Melhor Jogador"],
  ["gol", "Destaques"],
  ["jogador_do_mes", "Time do Mês"],
  ["campeao_do_mes", "Campeão do Mês"],
  ["bola_murcha", "Bola Murcha"],
];

/** As 12 skins do conjunto de novembro, por raridade (o mesmo que está em `pack_sets`). */
const SET: readonly { rarity: PackRarity; skins: readonly [CardSkinKey, string][] }[] = [
  { rarity: "lendaria", skins: [["diluvio", "Dilúvio"]] },
  { rarity: "epica", skins: [["relampago", "Relâmpago"], ["nuvem", "Nuvem"], ["lenda", "Lenda do Trovão"]] },
  { rarity: "rara", skins: [["aguaceiro", "Aguaceiro"], ["chuvavioleta", "Violeta"], ["chuvaesmeralda", "Esmeralda"], ["chuvarubi", "Rubi"]] },
  { rarity: "comum", skins: [["nublado", "Nublado"], ["neblina", "Neblina"], ["cerracao", "Cerração"], ["crepusculo", "Crepúsculo"]] },
];

const RARITY_TEXT: Record<PackRarity, string> = { comum: "text-zinc-300", rara: "text-sky-300", epica: "text-violet-300", lendaria: "text-amber-300" };

function Visual({ section, month }: { section: PatchSection; month: PatchMonth }) {
  switch (section.visual) {
    case "premios":
      return (
        <ul className="grid w-full grid-cols-3 gap-3 sm:grid-cols-5">
          {AWARDS.map(([kind, label]) => (
            <li key={kind} className="flex flex-col items-center gap-1.5 text-center">
              <ShowcaseCard award={{ kind, theme: "temporal" }} />
              <span className="font-display text-sm leading-tight font-bold uppercase">{label}</span>
            </li>
          ))}
        </ul>
      );
    case "skins":
      return (
        <div className="flex w-full flex-col gap-3">
          {SET.map((group) => (
            <div key={group.rarity} className="flex flex-col gap-1.5">
              <p className={cn("font-display text-sm font-bold tracking-[0.2em] uppercase", RARITY_TEXT[group.rarity])}>{PACK_RARITY_NAMES[group.rarity]}</p>
              <ul className="grid grid-cols-4 gap-2.5">
                {group.skins.map(([skin, name]) => (
                  <li key={skin} className="flex flex-col items-center gap-1 text-center">
                    <ShowcaseCard skin={skin} />
                    <span className="text-[0.6875rem] leading-tight text-muted-foreground">{name}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      );
    case "pacotes":
      return <PacksGuideVisual month={month.key} />;
    case "raridade":
      return <RarityGuideVisual />;
    case "mercado":
      return <MarketGuideVisual />;
    case "objetivos":
      return <GoalsGuideVisual month={month.key} />;
    case "lista":
      return (
        <ul className="flex w-full flex-col gap-2">
          {section.items?.map(([title, text]) => (
            <li key={title} className="flex items-start gap-3 rounded-lg border p-3">
              <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
              <span className="flex flex-col">
                <span className="font-display text-lg leading-tight font-bold uppercase">{title}</span>
                <span className="text-sm text-muted-foreground">{text}</span>
              </span>
            </li>
          ))}
        </ul>
      );
  }
}

/** Um mês de patch notes: capa com o vídeo, o resumo e as seções (cada uma com a arte e o atalho para a tela). */
export function PatchMonthView({ month, isLatest }: { month: PatchMonth; isLatest: boolean }) {
  return (
    <section aria-labelledby={`patch-${month.key}`} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <p className="text-xs font-medium tracking-wide text-primary uppercase">{isLatest ? "Último mês" : "Mês anterior"} · {month.event}</p>
        <h2 id={`patch-${month.key}`} className="font-display text-4xl leading-none font-extrabold uppercase">{month.title}</h2>
        <p className="text-sm text-muted-foreground">Versões {month.versions}</p>
      </div>

      <PatchVideoButton
        src={month.video.src}
        poster={month.video.poster}
        title={month.title}
        className="group relative flex w-full items-center gap-4 overflow-hidden rounded-xl border bg-card p-3 text-left transition-colors hover:bg-card/70"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={month.video.poster} alt="" className="h-28 w-16 shrink-0 rounded-md object-cover" />
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="font-display text-xl leading-tight font-bold uppercase">Assistir ao vídeo</span>
          <span className="text-sm text-muted-foreground">Tudo o que mudou no mês, em {month.video.duration}.</span>
        </span>
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <PlayIcon aria-hidden className="size-5 translate-x-px fill-current" />
        </span>
      </PatchVideoButton>

      <p className="text-base text-muted-foreground">{month.summary}</p>
      <ul className="flex flex-wrap gap-1.5">
        {month.highlights.map((item) => (
          <li key={item} className="rounded-full border px-2.5 py-1 text-xs">{item}</li>
        ))}
      </ul>

      <ol className="flex flex-col gap-4">
        {month.sections.map((section, index) => (
          <li key={section.title} className="flex flex-col gap-3 rounded-xl border bg-card p-4">
            <div className="flex flex-col gap-1">
              <p className="font-display text-sm tracking-[0.25em] text-primary">{String(index + 1).padStart(2, "0")}</p>
              <h3 className="font-display text-2xl leading-tight font-bold uppercase">{section.title}</h3>
              <p className="text-sm text-muted-foreground">{section.text}</p>
            </div>
            <div className="flex justify-center">
              <Visual section={section} month={month} />
            </div>
            {section.href && section.cta && (
              <Link href={section.href} className="inline-flex h-11 items-center justify-center gap-1.5 rounded-lg bg-muted text-base font-medium transition-colors hover:bg-muted/70">
                {section.cta}
                <ArrowRightIcon aria-hidden className="size-4" />
              </Link>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
