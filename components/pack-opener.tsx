"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { PackContents } from "@/components/pack-contents";
import { PackStage } from "@/components/pack-stage";
import { Button } from "@/components/ui/button";
import { openPack, refreshAfterPack } from "@/app/loja/_actions/open-pack";
import { monthlyPrizeLabel, type MyPack, type OpenedPack } from "@/lib/packs";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(callback: () => void) {
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

type Step =
  | { status: "opening" }
  | { status: "error"; message: string }
  | { status: "revealed"; pack: OpenedPack }
  /** Pacote de várias skins (prêmio do mês): depois da animação da mais rara, a tela "O que veio no pacote". */
  | { status: "contents"; pack: OpenedPack };

type OpenerPack = Pick<MyPack, "id" | "round" | "odds" | "tier" | "month"> & Partial<Pick<MyPack, "source" | "place">>;

/**
 * Abre os pacotes em sequência em tela cheia: cada abertura chama o banco (que revela a skin sorteada no fechamento) e toca a animação.
 * Com movimento reduzido, mostra só o resultado. Fechar atualiza a página (saldo, ponto da Loja e coleção).
 */
export function PackOpener({ packs, onClose }: { packs: readonly OpenerPack[]; onClose: () => void }) {
  const router = useRouter();
  const reduced = useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => false,
  );
  const [index, setIndex] = useState(0);
  const [step, setStep] = useState<Step>({ status: "opening" });
  const [isFooterReady, setIsFooterReady] = useState(false);
  const requested = useRef<string | null>(null);
  const current = packs[index];

  // Abre o pacote atual assim que ele vira o da vez (uma vez por pacote).
  useEffect(() => {
    if (!current || requested.current === current.id) return;
    requested.current = current.id;
    let isStale = false;
    void openPack(current.id).then((result) => {
      if (isStale) return;
      setStep(result.success ? { status: "revealed", pack: result.pack } : { status: "error", message: result.message });
      if (result.success && "vibrate" in navigator) navigator.vibrate?.(result.pack.rarity === "lendaria" ? [30, 40, 90] : 25);
    });
    return () => {
      isStale = true;
      // Efeito refeito (Strict Mode): libera para pedir de novo.
      if (requested.current === current.id) requested.current = null;
    };
  }, [current]);

  // Os botões só aparecem quando a skin e os textos estão na tela (o palco avisa; na hora, com movimento reduzido).
  const handleReady = useCallback(() => setIsFooterReady(true), []);

  function handleNext() {
    setIsFooterReady(false);
    setStep({ status: "opening" });
    setIndex((value) => value + 1);
  }

  function handleClose() {
    // Atualiza a página só agora (a action de abrir não faz isso, para não travar nem remontar a animação).
    void refreshAfterPack().catch(() => router.refresh());
    onClose();
  }

  const remaining = packs.length - index - 1;
  const items = step.status === "revealed" || step.status === "contents" ? step.pack.items : null;
  const continueLabel = remaining > 0 ? `Abrir o próximo (${remaining})` : "Fechar";
  const handleContinue = remaining > 0 ? handleNext : handleClose;
  const oddsPercent = step.status === "revealed" && current ? (current.odds[step.pack.rarity] ?? null) : null;

  return (
    <div role="dialog" aria-modal="true" aria-label="Abrindo pacote" className="fixed inset-0 z-50 bg-black">
      {step.status === "revealed" && current && (
        <PackStage
          key={current.id}
          rarity={step.pack.rarity}
          tier={current.tier}
          month={current.month}
          skin={step.pack.skin}
          round={current.source === "monthly" ? null : current.round}
          oddsPercent={oddsPercent}
          isDuplicate={step.pack.wasDuplicate}
          reduced={reduced}
          onReady={handleReady}
        />
      )}
      {step.status === "opening" && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-white/70">Abrindo o pacote…</div>
      )}
      {step.status === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center text-white">
          <p className="max-w-xs text-base">{step.message}</p>
          <Button variant="outline" size="lg" onClick={handleClose}>Voltar</Button>
        </div>
      )}
      {step.status === "contents" && current && items && (
        <div className="absolute inset-0 overflow-y-auto">
          <PackContents
            items={items}
            subtitle={monthlyPrizeLabel(current.place ?? null, current.month)}
            continueLabel={continueLabel}
            onContinue={handleContinue}
            onLeave={handleClose}
          />
        </div>
      )}
      {step.status === "revealed" && isFooterReady && (
        <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col items-center gap-2 bg-gradient-to-t from-black/80 to-transparent px-4 pt-8 pb-[max(1.25rem,env(safe-area-inset-bottom))] animate-in fade-in">
          {items ? (
            <Button size="lg" className="h-12 w-full max-w-xs text-base" onClick={() => setStep({ status: "contents", pack: step.pack })}>
              Ver o que veio no pacote ({items.length})
            </Button>
          ) : (
            <Button size="lg" className="h-12 w-full max-w-xs text-base" onClick={handleContinue}>
              {continueLabel}
            </Button>
          )}
          <Link href="/eu#minhas-cartas" onClick={handleClose} className="flex h-11 items-center text-sm text-white/70 underline-offset-4 hover:underline">
            Ver em Minhas cartas
          </Link>
        </div>
      )}
    </div>
  );
}
