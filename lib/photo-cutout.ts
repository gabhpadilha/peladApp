/**
 * Prepara a foto da carta no próprio aparelho (só no navegador):
 * 1. lê a foto respeitando a orientação do celular;
 * 2. acha a pessoa com o MediaPipe (modelo multiclasse de selfie, Apache 2.0);
 * 3. enquadra rosto e busto na proporção da área de foto da carta;
 * 4. gera o recorte sem fundo (PNG com alfa) e a original (JPEG).
 * O servidor converte as duas em WebP de 640px.
 */
import type { ImageSegmenter } from "@mediapipe/tasks-vision";

/** Mesma versão do package.json: o WASM precisa bater com a biblioteca. */
const TASKS_VISION_VERSION = "1.1.1";
const WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${TASKS_VISION_VERSION}/wasm`;
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite";

/** Área de foto da carta: largura ÷ altura. */
const CARD_PHOTO_RATIO = 0.87;
/** Lado maior antes de segmentar; saída já em 640px (tamanho final), o PNG com alfa fica < 1,5MB. */
const MAX_SIDE = 1280;
const OUTPUT_WIDTH = 640;
/** Curva da máscara: abaixo vira transparente, acima opaco (borda mais justa). */
const MASK_LOW = 0.35;
const MASK_HIGH = 0.7;
/** Pessoa precisa ocupar pelo menos isso da foto para o recorte fazer sentido. */
const MIN_PERSON_SHARE = 0.03;

export type CardPhotoDraft = {
  cutout: Blob;
  original: Blob;
};

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

/** Desenha a foto (já na orientação certa) com o lado maior em `MAX_SIDE`. */
async function loadScaled(file: File): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = createCanvas(Math.round(bitmap.width * scale), Math.round(bitmap.height * scale));
  get2d(canvas).drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas;
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

/** Faz o recorte e a original enquadrados para a carta. Lança `NoPersonFoundError` sem pessoa. */
export async function prepareCardPhoto(file: File): Promise<CardPhotoDraft> {
  const [segmenter, photo] = await Promise.all([getSegmenter(), loadScaled(file)]);
  const alpha = personAlpha(segmenter, photo);
  const box = bustBox(alpha, photo.width, photo.height);
  const mask = maskCanvas(alpha, photo.width, photo.height);

  const outputWidth = Math.min(OUTPUT_WIDTH, box.width);
  const outputHeight = Math.round(outputWidth / CARD_PHOTO_RATIO);

  const original = createCanvas(outputWidth, outputHeight);
  get2d(original).drawImage(photo, box.x, box.y, box.width, box.height, 0, 0, outputWidth, outputHeight);

  const cutout = createCanvas(outputWidth, outputHeight);
  const context = get2d(cutout);
  context.drawImage(photo, box.x, box.y, box.width, box.height, 0, 0, outputWidth, outputHeight);
  // Mantém só onde a máscara é opaca (a suavização do drawImage amacia a borda).
  context.globalCompositeOperation = "destination-in";
  context.drawImage(mask, box.x, box.y, box.width, box.height, 0, 0, outputWidth, outputHeight);

  const [cutoutBlob, originalBlob] = await Promise.all([toBlob(cutout, "image/png"), toBlob(original, "image/jpeg", 0.9)]);
  return { cutout: cutoutBlob, original: originalBlob };
}
