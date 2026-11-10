"use client";

import { useState, type ReactNode } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

type PatchVideoButtonProps = {
  src: string;
  poster: string;
  title: string;
  className?: string;
  /** O que aparece no botão que abre o vídeo. */
  children: ReactNode;
};

/** Botão que abre o vídeo dos patch notes num modal (o vídeo só carrega e toca depois do toque). */
export function PatchVideoButton({ src, poster, title, className, children }: PatchVideoButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)} className={className} aria-label={`Assistir ao vídeo: ${title}`}>
        {children}
      </button>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-h-[96dvh] w-[min(92vw,26rem)] gap-3 p-3">
          <DialogTitle className="px-1 font-display text-xl font-bold tracking-wide uppercase">{title}</DialogTitle>
          <DialogDescription className="sr-only">Vídeo com as novidades do mês.</DialogDescription>
          {isOpen && (
            <video src={src} poster={poster} controls autoPlay playsInline preload="metadata" className="max-h-[78dvh] w-full rounded-lg bg-black">
              Seu navegador não toca esse vídeo.
            </video>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
