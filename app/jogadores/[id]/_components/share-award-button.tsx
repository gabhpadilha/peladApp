"use client";

import { useEffect, useRef, useState } from "react";
import { DownloadIcon, Loader2Icon, Share2Icon } from "lucide-react";
import { domToBlob } from "modern-screenshot";
import { bakePhotoFades } from "@/lib/photo-fades";
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

/**
 * Troca cada foto da arte pela versão com os degradês já nos pixels: o Safari
 * do iPhone ignora a máscara ao gerar a imagem (o fundo da foto saía preto).
 */
async function bakePhotos(node: HTMLElement) {
  const photos = node.querySelectorAll<HTMLImageElement>("img[data-photo-kind]");
  await Promise.all(
    Array.from(photos).map(async (photo) => {
      const kind = photo.dataset.photoKind;
      if (kind !== "cutout" && kind !== "original") return;
      const box = photo.getBoundingClientRect();
      const baked = await bakePhotoFades(photo.currentSrc || photo.src, kind, box.width * STORY_SCALE, box.height * STORY_SCALE);
      photo.removeAttribute("srcset");
      photo.removeAttribute("sizes");
      photo.src = baked;
      photo.style.removeProperty("mask-image");
      photo.style.removeProperty("-webkit-mask-image");
      photo.style.removeProperty("mask-size");
      photo.style.removeProperty("-webkit-mask-size");
      photo.style.removeProperty("mask-repeat");
      photo.style.removeProperty("-webkit-mask-repeat");
      photo.style.removeProperty("mask-composite");
      photo.style.removeProperty("-webkit-mask-composite");
      await photo.decode();
    }),
  );
}

/** Lê uma imagem do próprio app como data URL (já decodificada antes da captura). */
async function toDataUrl(url: string): Promise<string> {
  const response = await fetch(url);
  const blob = await response.blob();
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
  const image = new Image();
  image.src = dataUrl;
  await image.decode();
  return dataUrl;
}

/**
 * No iPhone, o fundo da carta (CSS `background-image` numa caixa com cantos arredondados)
 * saía preto no story, enquanto as fotos (`<img>`) saíam certas. Aqui cada fundo vira um
 * `<img>` por baixo do conteúdo da caixa, já carregado e decodificado.
 */
async function bakeBackgrounds(node: HTMLElement) {
  const elements = node.querySelectorAll<HTMLElement>("[style*='background-image']");
  await Promise.all(
    Array.from(elements).map(async (element) => {
      const match = /url\(["']?([^"')]+)["']?\)/.exec(element.style.backgroundImage);
      if (!match) return;
      const image = document.createElement("img");
      image.src = match[1].startsWith("data:") ? match[1] : await toDataUrl(match[1]);
      image.alt = "";
      Object.assign(image.style, { position: "absolute", inset: "0", width: "100%", height: "100%", objectFit: "cover", zIndex: "0" });
      await image.decode();
      element.style.backgroundImage = "none";
      element.prepend(image);
    }),
  );
}

/**
 * Textos cortados com reticências (`truncate`) dentro de caixas flex sumiam no story do
 * iPhone (o nome da carta). Na captura, o texto não é cortado (os nomes já cabem).
 */
function unclipTexts(node: HTMLElement) {
  for (const element of node.querySelectorAll<HTMLElement>(".truncate")) {
    element.style.textOverflow = "clip";
    element.style.overflow = "visible";
  }
}

/** Transforma a arte do story numa imagem PNG, no próprio aparelho. */
async function renderStory(node: HTMLElement, fileName: string): Promise<File> {
  await document.fonts.ready;
  await Promise.all([bakePhotos(node), bakeBackgrounds(node)]);
  unclipTexts(node);
  const options = { width: STORY_WIDTH, height: STORY_HEIGHT, scale: STORY_SCALE, type: "image/png" } as const;
  // O Safari do iPhone às vezes desenha a primeira captura antes de terminar de montar as
  // imagens e as fontes dela; a segunda sai completa.
  await domToBlob(node, options);
  const blob = await domToBlob(node, options);
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
    renderStory(storyRef.current, `canchaclub-${award.kind.replaceAll("_", "-")}-r${award.round}.png`)
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
