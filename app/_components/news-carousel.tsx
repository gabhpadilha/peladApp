"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type NewsCarouselProps = {
  label: string;
  slides: { key: string; title: string; content: ReactNode }[];
};

/**
 * Carrossel de novidades da home: rolagem lateral com snap (arrastar no
 * celular), bolinhas e setas. Só a faixa interna rola; a página não.
 */
export function NewsCarousel({ label, slides }: NewsCarouselProps) {
  const trackRef = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState(0);

  // O slide que ocupa a maior parte da faixa é o ativo (arrastar, setas ou bolinhas).
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(Number((entry.target as HTMLElement).dataset.index));
        }
      },
      { root: track, threshold: 0.6 },
    );
    for (const slide of track.children) observer.observe(slide);
    return () => observer.disconnect();
  }, []);

  function goTo(index: number) {
    const track = trackRef.current;
    if (!track) return;
    const next = (index + slides.length) % slides.length;
    track.scrollTo({ left: next * track.clientWidth, behavior: "smooth" });
  }

  return (
    <section aria-roledescription="carrossel" aria-label={label} className="flex flex-col gap-3">
      <ul
        ref={trackRef}
        className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {slides.map((slide, index) => (
          <li
            key={slide.key}
            data-index={index}
            aria-roledescription="slide"
            aria-label={`${index + 1} de ${slides.length}: ${slide.title}`}
            className="flex w-full shrink-0 snap-center"
          >
            {slide.content}
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => goTo(active - 1)}
          aria-label="Novidade anterior"
          className="flex size-9 items-center justify-center rounded-full border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ChevronLeftIcon aria-hidden className="size-4" />
        </button>
        <div className="flex items-center gap-1.5">
          {slides.map((slide, index) => (
            <button
              key={slide.key}
              type="button"
              onClick={() => goTo(index)}
              aria-label={`Ver ${slide.title}`}
              aria-current={index === active}
              className="flex h-6 items-center px-0.5"
            >
              <span
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  index === active ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/40",
                )}
              />
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => goTo(active + 1)}
          aria-label="Próxima novidade"
          className="flex size-9 items-center justify-center rounded-full border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ChevronRightIcon aria-hidden className="size-4" />
        </button>
      </div>
    </section>
  );
}
