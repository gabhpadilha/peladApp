/**
 * Prepara a foto da carta no próprio aparelho (só no navegador):
 * 1. lê a foto respeitando a orientação do celular;
 * 2. acha a pessoa com o MediaPipe (modelo multiclasse de selfie, Apache 2.0);
 * 3. enquadra rosto e busto na proporção da área de foto da carta;
 * 4. gera o recorte sem fundo (PNG com alfa) e a original (JPEG).
 * O servidor converte as duas em WebP de 640px.
 */
import type { ImageSegmenter } from "@mediapipe/tasks-vision";

/**
 * Servidos pelo próprio app (sem depender de CDN que a rede pode bloquear):
 * o WASM é copiado do `@mediapipe/tasks-vision` instalado no postinstall
 * (`scripts/copy-mediapipe-wasm.mjs`, sempre na versão da biblioteca) e o
 * modelo fica versionado em `public/mediapipe/`.
 */
const WASM_URL = "/mediapipe/wasm";
const MODEL_URL = "/mediapipe/selfie_multiclass_256x256.tflite";

/** Área de foto da carta: largura ÷ altura. */
const CARD_PHOTO_RATIO = 0.87;
/** Lado maior antes de segmentar; saída já em 640px (tamanho final), o PNG com alfa fica < 1,5MB. */
const MAX_SIDE = 1280;
const OUTPUT_WIDTH = 640;
/** Curva da máscara: abaixo vira transparente, acima opaco (borda mais justa). */
const MASK_LOW = 0.35;
const MASK_HIGH = 0.7;
/** Faixa do topo do recorte que é apagada (resíduo do segmentador na borda). */
const TOP_EDGE_CLEAR = 0.015;
/** Pessoa precisa ocupar pelo menos isso da foto para o recorte fazer sentido. */
const MIN_PERSON_SHARE = 0.03;

export type CardPhotoDraft = {
  cutout: Blob;
  original: Blob;
  /** `false` = nem o aparelho nem o servidor tiraram o fundo; `cutout` é só uma cópia da original. */
  hasCutout: boolean;
};

/** Recorte de reserva: recebe a foto (JPEG já reduzido) e devolve a máscara da pessoa (PNG cinza, mesmo tamanho). */
export type RemoteMask = (photo: Blob) => Promise<Blob>;

export class NoPersonFoundError extends Error {
  constructor() {
    super("Não encontramos uma pessoa na foto.");
  }
}

let segmenterPromise: Promise<ImageSegmenter> | null = null;

/** Carrega o segmentador uma vez por sessão (WASM + modelo ~16MB, ficam em cache). */
function getSegmenter(): Promise<ImageSegmenter> {
  segmenterPromise ??= (async () => {
    const { FilesetResolver, ImageSegmenter } = await import("@mediapipe/tasks-vision");
    const vision = await FilesetResolver.forVisionTasks(WASM_URL);
    return ImageSegmenter.createFromOptions(vision, {
      baseOptions: { modelAssetPath: MODEL_URL },
      runningMode: "IMAGE",
      outputCategoryMask: false,
      outputConfidenceMasks: true,
    });
  })().catch((error: unknown) => {
    segmenterPromise = null; // deixa tentar de novo
    throw error;
  });
  return segmenterPromise;
}

function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function get2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D indisponível neste navegador.");
  return context;
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Falha ao gerar a imagem."))), type, quality);
  });
}

/** Decodifica a foto já na orientação certa. Navegadores mais velhos (iOS) recusam as opções do `createImageBitmap`: cai para `<img>`, que aplica o EXIF sozinho. */
async function decodeImage(file: File): Promise<{ source: CanvasImageSource; width: number; height: number; release: () => void }> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    return { source: bitmap, width: bitmap.width, height: bitmap.height, release: () => bitmap.close() };
  } catch {
    // tenta o caminho antigo abaixo
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = "async";
    image.src = url;
    await image.decode();
    return { source: image, width: image.naturalWidth, height: image.naturalHeight, release: () => URL.revokeObjectURL(url) };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

/** Desenha a foto (já na orientação certa) com o lado maior em `MAX_SIDE`. */
async function loadScaled(file: File): Promise<HTMLCanvasElement> {
  const decoded = await decodeImage(file);
  try {
    const scale = Math.min(1, MAX_SIDE / Math.max(decoded.width, decoded.height));
    const canvas = createCanvas(Math.round(decoded.width * scale), Math.round(decoded.height * scale));
    get2d(canvas).drawImage(decoded.source, 0, 0, canvas.width, canvas.height);
    return canvas;
  } finally {
    decoded.release();
  }
}

/** Probabilidade de cada pixel ser pessoa (1 − fundo), já no tamanho da foto. */
function personAlpha(segmenter: ImageSegmenter, source: HTMLCanvasElement): Float32Array {
  const result = segmenter.segment(source);
  try {
    const background = result.confidenceMasks?.[0];
    if (!background) throw new Error("O segmentador não devolveu máscara.");
    const values = background.getAsFloat32Array();
    // Copia: a memória do MPMask é liberada no close().
    const alpha = new Float32Array(values.length);
    for (let i = 0; i < values.length; i++) alpha[i] = 1 - values[i];
    if (background.width !== source.width || background.height !== source.height) {
      throw new Error("Máscara com tamanho diferente da foto.");
    }
    return alpha;
  } finally {
    result.close();
  }
}

type Box = { x: number; y: number; width: number; height: number };

/** Enquadramento rosto + busto: largura da pessoa, topo um pouco acima da cabeça. */
function bustBox(alpha: Float32Array, width: number, height: number): Box {
  let minX = width;
  let maxX = -1;
  let minY = height;
  let count = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (alpha[y * width + x] > 0.5) {
        count++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
      }
    }
  }
  if (count < width * height * MIN_PERSON_SHARE) throw new NoPersonFoundError();

  const personWidth = maxX - minX + 1;
  let boxWidth = Math.min(width, Math.round(personWidth * 1.08));
  let boxHeight = Math.round(boxWidth / CARD_PHOTO_RATIO);
  if (boxHeight > height) {
    boxHeight = height;
    boxWidth = Math.min(width, Math.round(boxHeight * CARD_PHOTO_RATIO));
  }
  const centerX = (minX + maxX) / 2;
  const x = Math.round(Math.min(width - boxWidth, Math.max(0, centerX - boxWidth / 2)));
  const y = Math.round(Math.min(height - boxHeight, Math.max(0, minY - boxHeight * 0.06)));
  return { x, y, width: boxWidth, height: boxHeight };
}

/** Máscara (alfa com curva) como imagem do tamanho da foto, para compor com destination-in. */
function maskCanvas(alpha: Float32Array, width: number, height: number): HTMLCanvasElement {
  const canvas = createCanvas(width, height);
  const context = get2d(canvas);
  const image = context.createImageData(width, height);
  for (let i = 0; i < alpha.length; i++) {
    const t = Math.min(1, Math.max(0, (alpha[i] - MASK_LOW) / (MASK_HIGH - MASK_LOW)));
    image.data[i * 4] = 255;
    image.data[i * 4 + 1] = 255;
    image.data[i * 4 + 2] = 255;
    image.data[i * 4 + 3] = Math.round(t * 255);
  }
  context.putImageData(image, 0, 0);
  return canvas;
}

/** Quanto esperar o segmentador do aparelho (download de ~16MB + WASM) antes de pedir ao servidor. */
const SEGMENTER_TIMEOUT_MS = 20_000;

function withTimeout<T>(promise: Promise<T>, milliseconds: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Tempo esgotado ao carregar o segmentador.")), milliseconds);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/** Enquadramento sem segmentação (aparelho que não roda o modelo): centro, do topo, na proporção da carta. */
function fallbackBox(width: number, height: number): Box {
  const boxWidth = Math.min(width, Math.round(height * CARD_PHOTO_RATIO));
  const boxHeight = Math.round(boxWidth / CARD_PHOTO_RATIO);
  return { x: Math.round((width - boxWidth) / 2), y: 0, width: boxWidth, height: Math.min(height, boxHeight) };
}

/** Tenta de novo em larguras menores até o envio caber (o servidor aceita 3MB por arquivo e ~4MB no total). */
const OUTPUT_WIDTHS = [OUTPUT_WIDTH, 480, 360];
const MAX_TOTAL_BYTES = 3.5 * 1024 * 1024;

/** Lê a máscara PNG do servidor como alfa (0–1) no tamanho da foto. */
async function maskToAlpha(mask: Blob, width: number, height: number): Promise<Float32Array> {
  const decoded = await decodeImage(new File([mask], "mask.png", { type: mask.type || "image/png" }));
  try {
    const canvas = createCanvas(width, height);
    const context = get2d(canvas);
    context.drawImage(decoded.source, 0, 0, width, height);
    const { data } = context.getImageData(0, 0, width, height);
    const alpha = new Float32Array(width * height);
    for (let i = 0; i < alpha.length; i++) alpha[i] = data[i * 4] / 255;
    return alpha;
  } finally {
    decoded.release();
  }
}

/** Alfa da pessoa: primeiro no aparelho (MediaPipe); se não der, pelo servidor. `null` = nenhum dos dois. */
async function findPersonAlpha(photo: HTMLCanvasElement, remoteMask: RemoteMask | undefined): Promise<Float32Array | null> {
  try {
    return personAlpha(await withTimeout(getSegmenter(), SEGMENTER_TIMEOUT_MS), photo);
  } catch (error) {
    console.warn("Segmentação no aparelho indisponível; tentando no servidor.", error);
  }
  if (!remoteMask) return null;
  try {
    const mask = await remoteMask(await toBlob(photo, "image/jpeg", 0.9));
    return await maskToAlpha(mask, photo.width, photo.height);
  } catch (error) {
    console.warn("Recorte no servidor indisponível; usando só a foto original.", error);
    return null;
  }
}

/**
 * Faz o recorte e a original enquadrados para a carta. Lança `NoPersonFoundError` sem pessoa.
 * A máscara vem do aparelho ou, se ele não rodar o MediaPipe, de `remoteMask`; o
 * enquadramento e a curva são os mesmos nos dois casos. Sem máscara nenhuma,
 * devolve só a original (`hasCutout: false`).
 */
export async function prepareCardPhoto(file: File, remoteMask?: RemoteMask): Promise<CardPhotoDraft> {
  const photo = await loadScaled(file);

  const alpha = await findPersonAlpha(photo, remoteMask);
  const box = alpha ? bustBox(alpha, photo.width, photo.height) : fallbackBox(photo.width, photo.height);
  const mask = alpha ? maskCanvas(alpha, photo.width, photo.height) : null;

  let draft: CardPhotoDraft | null = null;
  for (const targetWidth of OUTPUT_WIDTHS) {
    const outputWidth = Math.min(targetWidth, box.width);
    const outputHeight = Math.round(outputWidth / CARD_PHOTO_RATIO);

    const original = createCanvas(outputWidth, outputHeight);
    get2d(original).drawImage(photo, box.x, box.y, box.width, box.height, 0, 0, outputWidth, outputHeight);
    const originalBlob = await toBlob(original, "image/jpeg", 0.9);

    let cutoutBlob = originalBlob;
    if (mask) {
      const cutout = createCanvas(outputWidth, outputHeight);
      const context = get2d(cutout);
      context.drawImage(photo, box.x, box.y, box.width, box.height, 0, 0, outputWidth, outputHeight);
      // Mantém só onde a máscara é opaca (a suavização do drawImage amacia a borda).
      context.globalCompositeOperation = "destination-in";
      context.drawImage(mask, box.x, box.y, box.width, box.height, 0, 0, outputWidth, outputHeight);
      // O segmentador deixa uma faixa semitransparente na borda de cima (vira uma
      // linha sobre a cabeça na carta): limpa as primeiras linhas.
      context.globalCompositeOperation = "source-over";
      context.clearRect(0, 0, outputWidth, Math.ceil(outputHeight * TOP_EDGE_CLEAR));
      cutoutBlob = await toBlob(cutout, "image/png");
    }

    draft = { cutout: cutoutBlob, original: originalBlob, hasCutout: mask !== null };
    if (cutoutBlob.size + originalBlob.size <= MAX_TOTAL_BYTES) break;
  }
  if (!draft) throw new Error("Falha ao gerar a imagem.");
  return draft;
}
