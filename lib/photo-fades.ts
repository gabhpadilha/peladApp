import type { PlayerPhoto } from "@/types/player";

/** Parada de um degradê: posição (% da área da foto) e opacidade (0 ou 1). */
type FadeStop = readonly [position: number, alpha: 0 | 1];
type PhotoFade = { vertical: readonly FadeStop[]; horizontal: readonly FadeStop[] };

/**
 * Degradês que fazem a foto sumir na carta.
 * Recorte enquadrado pelos ombros (`lib/photo-cutout.ts`): eles vão de borda a
 * borda da carta e só somem rente ao corte da face; o peito some embaixo, atrás
 * do apelido. A original (só fotos antigas) some também do lado do OVR. Regra: as quatro bordas da área terminam
 * transparentes (borda com opacidade vira fio no Safari do iPhone); as laterais
 * ainda ficam fora do corte da face.
 */
const PHOTO_FADES: Record<PlayerPhoto["kind"], PhotoFade> = {
  cutout: {
    // Topo limpo: apaga a linha que o segmentador deixa na borda; embaixo, o
    // peito some aos poucos atrás do apelido (que começa em ~94% da área).
    vertical: [[0, 0], [3, 1], [70, 1], [100, 0]],
    // Laterais: a face vai de ~4% a ~96% da área; o ombro some só no fim, rente à moldura.
    horizontal: [[1, 0], [11, 1], [89, 1], [99, 0]],
  },
  original: {
    vertical: [[0, 0], [4, 1], [62, 1], [100, 0]],
    // Com fundo, o lado do OVR some mais (senão o número se perde na foto).
    horizontal: [[4, 0], [40, 1], [92, 1], [100, 0]],
  },
};

function cssGradient(direction: string, stops: readonly FadeStop[]): string {
  const parts = stops.map(([position, alpha]) => `${alpha ? "black" : "transparent"} ${position}%`);
  return `linear-gradient(to ${direction}, ${parts.join(", ")})`;
}

/** Camadas da `mask-image` da foto na carta. */
export function photoFadeLayers(kind: PlayerPhoto["kind"]): string[] {
  const fade = PHOTO_FADES[kind];
  return [cssGradient("bottom", fade.vertical), cssGradient("right", fade.horizontal)];
}

/**
 * Desenha a foto já com os degradês aplicados nos pixels (PNG), no tamanho em
 * que aparece na carta (`object-cover object-top`). Usado no story: o Safari
 * do iPhone, ao transformar a carta em imagem, ignora a máscara e a parte
 * transparente da foto vira um bloco preto.
 */
export async function bakePhotoFades(
  source: string,
  kind: PlayerPhoto["kind"],
  width: number,
  height: number,
): Promise<string> {
  const image = new Image();
  image.src = source;
  await image.decode();

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width);
  canvas.height = Math.round(height);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D indisponível");

  // object-cover object-top: cobre a área toda, centralizado na horizontal, preso no topo.
  const scale = Math.max(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight);
  const drawWidth = image.naturalWidth * scale;
  context.drawImage(image, (canvas.width - drawWidth) / 2, 0, drawWidth, image.naturalHeight * scale);

  // Cada degradê recorta o que sobrou (o mesmo que as camadas intersectadas da máscara).
  const fade = PHOTO_FADES[kind];
  context.globalCompositeOperation = "destination-in";
  for (const [stops, isVertical] of [[fade.vertical, true], [fade.horizontal, false]] as const) {
    const gradient = isVertical
      ? context.createLinearGradient(0, 0, 0, canvas.height)
      : context.createLinearGradient(0, 0, canvas.width, 0);
    for (const [position, alpha] of stops) gradient.addColorStop(position / 100, `rgba(0, 0, 0, ${alpha})`);
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
  }

  return canvas.toDataURL("image/png");
}
