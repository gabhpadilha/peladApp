"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { getPackAnimationMs, PackStage } from "@/components/pack-stage";
import { Button } from "@/components/ui/button";
import { openPack } from "@/app/loja/_actions/open-pack";
import type { MyPack, OpenedPack } from "@/lib/packs";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(callback: () => void) {
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

type Step =
  | { status: "opening" }
  | { status: "error"; message: string }
  | { status: "revealed"; pack: OpenedPack };

/**
 * Abre os pacotes em sequência em tela cheia: cada abertura chama o banco (que revela a skin sorteada no fechamento) e toca a animação.
 * Com movimento reduzido, mostra só o resultado. Fechar atualiza a página (saldo, ponto da Loja e coleção).
 */
export function PackOpener({ packs, onClose }: { packs: readonly Pick<MyPack, "id" | "round" | "odds" | "tier" | "month">[]; onClose: () => void }) {
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

  // Os botões só aparecem quando a animação termina (ou na hora, com movimento reduzido).
  useEffect(() => {
    if (step.status !== "revealed") return;
    const delay = reduced ? 0 : getPackAnimationMs(step.pack.rarity);
    const timer = window.setTimeout(() => setIsFooterReady(true), delay);
    return () => window.clearTimeout(timer);
  }, [step, reduced]);

  function handleNext() {
    setIsFooterReady(false);
    setStep({ status: "opening" });
    setIndex((value) => value + 1);
  }

  function handleClose() {
    router.refresh();
    onClose();
  }

  const remaining = packs.length - index - 1;
  const oddsPercent = step.status === "revealed" && current ? (current.odds[step.pack.rarity] ?? null) : null;

  return (
    <div role="dialog" aria-modal="true" aria-label="Abrindo pacote" className="fixed inset-0 z-50 bg-[#050907]">
      {step.status === "revealed" && current && (
        <PackStage
          key={current.id}
          rarity={step.pack.rarity}
          tier={current.tier}
          month={current.month}
          skin={step.pack.skin}
          round={current.round}
          oddsPercent={oddsPercent}
          duplicateCoins={step.pack.wasDuplicate ? step.pack.coinsAwarded : null}
          reduced={reduced}
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
      {step.status === "revealed" && isFooterReady && (
        <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col items-center gap-2 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] animate-in fade-in">
          {remaining > 0 ? (
            <Button size="lg" className="h-12 w-full max-w-xs text-base" onClick={handleNext}>
              Abrir o próximo ({remaining})
            </Button>
          ) : (
            <Button size="lg" className="h-12 w-full max-w-xs text-base" onClick={handleClose}>
              Fechar
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
