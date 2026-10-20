"use client";

import { useEffect, useRef, useState } from "react";
import { DownloadIcon, Loader2Icon, Share2Icon } from "lucide-react";
import { domToBlob } from "modern-screenshot";
import { restorePhotoMask } from "@/components/player-card";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AWARD_LABELS, type Award } from "@/types/award";
import { cn } from "@/lib/utils";
import { AwardStory, STORY_HEIGHT, STORY_WIDTH } from "./award-story";

/** 360 × 640 em 3x = 1080 × 1920, o tamanho do story do Instagram. */
const STORY_SCALE = 3;

type ShareAwardButtonProps = {
  award: Award;
  groupName: string;
  /** `full`: botão largo da última conquista; `compact`: pílula da galeria. */
  variant?: "full" | "compact";
};

type StoryImage = { file: File; url: string; canShare: boolean };

/** Transforma a arte do story numa imagem PNG, no próprio aparelho. */
async function renderStory(node: HTMLElement, fileName: string): Promise<File> {
  await document.fonts.ready;
  const blob = await domToBlob(node, {
    width: STORY_WIDTH,
    height: STORY_HEIGHT,
    scale: STORY_SCALE,
    type: "image/png",
    // A cópia perde a máscara da foto (ver `restorePhotoMask`).
    onCloneEachNode: restorePhotoMask,
  });
  return new File([blob], fileName, { type: "image/png" });
}

/** Botão "Compartilhar": monta o story da carta e abre o compartilhar do celular. */
export function ShareAwardButton({ award, groupName, variant = "full" }: ShareAwardButtonProps) {
  const storyRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [image, setImage] = useState<StoryImage | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!isOpen || image || hasError || !storyRef.current) return;
    let isCancelled = false;
    renderStory(storyRef.current, `peladapp-${award.kind.replaceAll("_", "-")}-r${award.round}.png`)
      .then((file) => {
        if (isCancelled) return;
        const canShare = typeof navigator.canShare === "function" && navigator.canShare({ files: [file] });
        setImage({ file, url: URL.createObjectURL(file), canShare });
      })
      .catch((error: unknown) => {
        console.error("Falha ao montar o story", error);
        if (!isCancelled) setHasError(true);
      });
    return () => {
      isCancelled = true;
    };
  }, [isOpen, image, hasError, award.kind, award.round]);

  useEffect(() => () => {
    if (image) URL.revokeObjectURL(image.url);
  }, [image]);

  async function handleShare() {
    if (!image) return;
    try {
      // Só o arquivo: com texto junto, o Instagram some da lista em alguns iPhones.
      await navigator.share({ files: [image.file] });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      console.error("Falha ao compartilhar", error);
    }
  }

  function handleOpenChange(open: boolean) {
    setIsOpen(open);
    if (open) setHasError(false);
  }

  const title = AWARD_LABELS[award.kind].title;

  return (
    <>
      <button
        type="button"
        onClick={() => handleOpenChange(true)}
        className={cn(
          "inline-flex items-center justify-center gap-2 bg-primary font-semibold text-primary-foreground transition-colors hover:bg-primary/90",
          variant === "full" ? "h-11 w-full rounded-lg text-base" : "h-9 rounded-full px-3 text-sm",
        )}
      >
        <Share2Icon aria-hidden className={variant === "full" ? "size-4" : "size-3.5"} />
        {variant === "full" ? "Compartilhar nos stories" : "Compartilhar"}
      </button>

      {/* A arte fica invisível atrás da folha, no tamanho real, só enquanto ela está aberta.
          Dentro da tela (e não fora dela): senão a foto com carregamento "lazy" nunca carrega. */}
      {isOpen && !image && (
        <div aria-hidden className="pointer-events-none fixed top-0 left-0 -z-50 opacity-0">
          <AwardStory ref={storyRef} award={award} groupName={groupName} />
        </div>
      )}

      <Sheet open={isOpen} onOpenChange={handleOpenChange}>
        <SheetContent side="bottom" className="mx-auto max-h-[92dvh] w-full max-w-md gap-0 overflow-y-auto rounded-t-2xl">
          <SheetHeader className="border-b pb-4 text-left">
            <SheetTitle className="font-display text-2xl font-bold">Compartilhar {title}</SheetTitle>
            <SheetDescription>
              Escolha Instagram → Stories (ou WhatsApp) no compartilhar do celular.
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-col items-center gap-4 px-4 py-5">
            <div className="flex aspect-9/16 w-44 items-center justify-center overflow-hidden rounded-xl border bg-muted/40">
              {image ? (
                // Prévia da imagem gerada (blob:), sem otimizador.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={image.url} alt={`Story da carta ${title}`} className="size-full object-cover" />
              ) : hasError ? (
                <p className="px-3 text-center text-sm text-muted-foreground">Não deu para montar a imagem. Tente de novo.</p>
              ) : (
                <Loader2Icon aria-label="Montando a imagem" className="size-6 animate-spin text-muted-foreground" />
              )}
            </div>

            <div className="flex w-full flex-col gap-2">
              {image?.canShare && (
                <button
                  type="button"
                  onClick={handleShare}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary text-base font-semibold text-primary-foreground"
                >
                  <Share2Icon aria-hidden className="size-4" />
                  Compartilhar
                </button>
              )}
              {hasError ? (
                <button
                  type="button"
                  onClick={() => setHasError(false)}
                  className="inline-flex h-11 items-center justify-center rounded-lg bg-muted text-base font-medium"
                >
                  Tentar de novo
                </button>
              ) : (
                <a
                  href={image?.url}
                  download={image?.file.name}
                  aria-disabled={!image}
                  className={cn(
                    "inline-flex h-11 items-center justify-center gap-2 rounded-lg text-base font-medium",
                    image?.canShare ? "bg-muted" : "bg-primary text-primary-foreground",
                    !image && "pointer-events-none opacity-50",
                  )}
                >
                  <DownloadIcon aria-hidden className="size-4" />
                  Baixar imagem
                </a>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
