/**
 * Prepara a foto da carta (só no navegador):
 * 1. lê a foto respeitando a orientação do celular;
 * 2. acha a pessoa: máscara do servidor (BiRefNet no Hugging Face, remove.bg ou MODNet) ou, sem rede, do MediaPipe no aparelho;
 * 3. enquadra no padrão das cartas do EA FC (ombros na largura toda da carta, do peito para cima) para a área de foto da carta;
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

/**
 * Área de foto da carta (largura ÷ altura): passa um pouco das laterais da
 * face e vai do topo até o apelido (`player-card.tsx`). O quadro pode sair mais
 * estreito que isso (foto em pé); a carta centraliza e apoia embaixo.
 */
const CARD_PHOTO_RATIO = 1.18;
/** Laterais e pé da foto que somem aos poucos (fração da largura/altura da foto): ombro ou peito cortados pela borda não viram um risco reto. */
const SIDE_FEATHER = 0.06;
const BOTTOM_FEATHER = 0.06;
/** Lado maior antes de segmentar; saída já em 640px (tamanho final), o PNG com alfa fica < 1,5MB. */
const MAX_SIDE = 1280;
const OUTPUT_WIDTH = 640;
/** Curva da máscara: abaixo vira transparente, acima opaco (borda mais justa). */
const MASK_LOW = 0.45;
const MASK_HIGH = 0.8;
/** Quanto a máscara encolhe antes da curva, em fração do lado maior da foto (~3px em 1280). */
const EDGE_ERODE = 0.0022;
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

/** Pixel conta como pessoa acima disso (para medir a silhueta). */
const PERSON_THRESHOLD = 0.5;
/** A linha só conta como topo da cabeça com pelo menos isso de largura (ignora fios soltos). */
const MIN_TOP_RUN = 0.02;
/**
 * A largura da cabeça é medida do topo até essa profundidade (× a largura já
 * medida): numa cabeça (elipse ~1,3 de altura por largura) isso para logo
 * depois do ponto mais largo, na altura de olhos e orelhas, antes de gola,
 * capuz ou ombros alargarem a silhueta.
 */
const HEAD_SCAN = 0.7;
/** Altura da cabeça (topo do cabelo ao queixo) ≈ 1,3 × a largura dela. */
const HEAD_PROPORTION = 1.3;
/*
 * Modelo "C" escolhido pelo dono do app (2026-10-19, entre 4 variantes com
 * fotos reais): ombros ocupando a largura toda da carta, topo da cabeça a
 * ~11% da carta e rosto a ~52% da largura. Em fração da área de foto (top 2%,
 * altura 62%, laterais -4% da carta, `player-card.tsx`):
 */
/** Largura do quadro ÷ largura dos ombros: área de 108% da carta ÷ ombros em 100% dela. */
const FRAME_PER_SHOULDERS = 1.08;
/** Folga acima da cabeça, em fração da altura do quadro: (11% − 2%) ÷ 62%. */
const HEADROOM = 0.145;
/** Centro do rosto, em fração da largura do quadro: (52% + 4%) ÷ 108%. */
const FACE_X = 0.519;
/** Faixa dos ombros, em alturas de cabeça estimadas abaixo do topo (do queixo ao fim dos ombros). */
const SHOULDER_SCAN_FROM = 0.9;
const SHOULDER_SCAN_TO = 1.8;
/** Limites dos ombros em larguras de cabeça: foto que corta os ombros ou braço aberto não estragam o quadro. */
const MIN_SHOULDER_HEADS = 2.4;
const MAX_SHOULDER_HEADS = 3.4;

/** Trecho contínuo de pessoa que passa por `centerX` na linha `y` (largura 0 = fora). */
function runAt(alpha: Float32Array, width: number, y: number, centerX: number): { width: number; center: number } {
  const row = y * width;
  const start = Math.round(centerX);
  if (start < 0 || start >= width || alpha[row + start] <= PERSON_THRESHOLD) return { width: 0, center: centerX };
  let left = start;
  let right = start;
  while (left > 0 && alpha[row + left - 1] > PERSON_THRESHOLD) left--;
  while (right < width - 1 && alpha[row + right + 1] > PERSON_THRESHOLD) right++;
  return { width: right - left + 1, center: (left + right) / 2 };
}

/**
 * Largura dos ombros: o trecho mais largo que passa pelo centro do rosto entre
 * o queixo e o fim dos ombros, limitado em cabeças (foto que corta os ombros
 * mede menos: vale o mínimo; braço aberto mede demais: vale o máximo).
 */
function measureShoulders(alpha: Float32Array, width: number, height: number, top: number, headWidth: number, headCenter: number): number {
  const headHeight = headWidth * HEAD_PROPORTION;
  const from = Math.min(height - 1, Math.round(top + headHeight * SHOULDER_SCAN_FROM));
  const to = Math.min(height - 1, Math.round(top + headHeight * SHOULDER_SCAN_TO));
  let shoulders = 0;
  for (let y = from; y <= to; y++) shoulders = Math.max(shoulders, runAt(alpha, width, y, headCenter).width);
  return Math.min(headWidth * MAX_SHOULDER_HEADS, Math.max(headWidth * MIN_SHOULDER_HEADS, shoulders));
}

/**
 * Enquadramento no padrão das cartas do EA FC: acha a cabeça, mede os ombros e
 * monta o quadro para eles ocuparem a largura toda da carta, com a cabeça
 * sempre no mesmo lugar. O quadro pode passar da foto (pouco espaço acima da
 * cabeça, ombro cortado pela borda): o que fica fora sai transparente e a
 * borda da foto some aos poucos.
 */
function bustBox(alpha: Float32Array, width: number, height: number): Box {
  let count = 0;
  let top = -1;
  let topCenter = 0;
  for (let y = 0; y < height; y++) {
    let rowCount = 0;
    let rowSum = 0;
    for (let x = 0; x < width; x++) {
      if (alpha[y * width + x] > PERSON_THRESHOLD) {
        rowCount++;
        rowSum += x;
      }
    }
    count += rowCount;
    if (top < 0 && rowCount >= width * MIN_TOP_RUN) {
      top = y;
      topCenter = rowSum / rowCount;
    }
  }
  if (top < 0 || count < width * height * MIN_PERSON_SHARE) throw new NoPersonFoundError();

  // Desce pela cabeça seguindo o trecho que passa pelo centro dela, só até a
  // parte mais larga: abaixo disso gola, capuz e ombros alargam a silhueta.
  let centerX = topCenter;
  let headWidth = 0;
  let centerSum = 0;
  let headRows = 0;
  for (let y = top; y < height; y++) {
    if (headWidth > 0 && y - top > headWidth * HEAD_SCAN) break;
    const run = runAt(alpha, width, y, centerX);
    if (run.width === 0) continue;
    headWidth = Math.max(headWidth, run.width);
    centerX = run.center;
    centerSum += run.center;
    headRows++;
  }
  const headCenter = headRows > 0 ? centerSum / headRows : topCenter;
  // Os ombros fixam o tamanho da pessoa na carta.
  const shoulders = measureShoulders(alpha, width, height, top, headWidth, headCenter);
  const boxWidth = Math.round(shoulders * FRAME_PER_SHOULDERS);
  const boxHeight = Math.round(boxWidth / CARD_PHOTO_RATIO);
  // Posição fixa da cabeça no quadro, mesmo que ele passe das bordas da foto.
  const x = Math.round(headCenter - boxWidth * FACE_X);
  const y = Math.round(top - boxHeight * HEADROOM);
  return { x, y, width: boxWidth, height: boxHeight };
}

/**
 * Encolhe a máscara alguns pixels (mínimo numa janela, separável): a borda
 * da silhueta costuma levar um fio do fundo (parede clara vira contorno branco).
 */
function erode(alpha: Float32Array, width: number, height: number, radius: number): Float32Array {
  if (radius < 1) return alpha;
  const horizontal = new Float32Array(alpha.length);
  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      let min = 1;
      const from = Math.max(0, x - radius);
      const to = Math.min(width - 1, x + radius);
      for (let k = from; k <= to; k++) min = Math.min(min, alpha[row + k]);
      horizontal[row + x] = min;
    }
  }
  const result = new Float32Array(alpha.length);
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      let min = 1;
      const from = Math.max(0, y - radius);
      const to = Math.min(height - 1, y + radius);
      for (let k = from; k <= to; k++) min = Math.min(min, horizontal[k * width + x]);
      result[y * width + x] = min;
    }
  }
  return result;
}

/**
 * Máscara (alfa com curva) como imagem do tamanho da foto, para compor com
 * destination-in. As laterais e o pé da foto somem aos poucos: ombro ou peito
 * cortados pela borda da foto não viram um risco reto na carta.
 */
function maskCanvas(alpha: Float32Array, width: number, height: number): HTMLCanvasElement {
  const canvas = createCanvas(width, height);
  const context = get2d(canvas);
  const image = context.createImageData(width, height);
  const sideFeather = Math.max(1, width * SIDE_FEATHER);
  const bottomFeather = Math.max(1, height * BOTTOM_FEATHER);
  for (let i = 0; i < alpha.length; i++) {
    const x = i % width;
    const y = (i - x) / width;
    const edge = Math.min(1, x / sideFeather, (width - 1 - x) / sideFeather, (height - 1 - y) / bottomFeather);
    const t = edge * Math.min(1, Math.max(0, (alpha[i] - MASK_LOW) / (MASK_HIGH - MASK_LOW)));
    image.data[i * 4] = 255;
    image.data[i * 4 + 1] = 255;
    image.data[i * 4 + 2] = 255;
    image.data[i * 4 + 3] = Math.round(t * 255);
  }
  context.putImageData(image, 0, 0);
  return canvas;
}

/** Quanto esperar o recorte do servidor (Space até 20s + remove.bg até 15s + MODNet de reserva, cold start incluído) antes de tentar no aparelho. */
const REMOTE_TIMEOUT_MS = 45_000;
/** Quanto esperar o segmentador do aparelho (download de ~16MB + WASM) antes de seguir só com a original. */
const SEGMENTER_TIMEOUT_MS = 30_000;

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

/** Enquadramento sem segmentação (nenhum recorte funcionou): centro, do topo, até a proporção da carta. */
function fallbackBox(width: number, height: number): Box {
  const boxWidth = Math.min(width, Math.round(height * CARD_PHOTO_RATIO));
  const boxHeight = Math.min(height, Math.round(boxWidth / CARD_PHOTO_RATIO));
  return { x: Math.round((width - boxWidth) / 2), y: 0, width: boxWidth, height: boxHeight };
}

/**
 * Desenha o trecho `box` da imagem ocupando o canvas todo. O quadro pode passar
 * da foto: desenha a imagem inteira deslocada e o que fica fora sai transparente.
 */
function drawBox(context: CanvasRenderingContext2D, image: HTMLCanvasElement, box: Box, outputWidth: number, outputHeight: number) {
  const scaleX = outputWidth / box.width;
  const scaleY = outputHeight / box.height;
  context.drawImage(image, -box.x * scaleX, -box.y * scaleY, image.width * scaleX, image.height * scaleY);
}

/** Parte do quadro que está dentro da foto (a original não tem transparência). */
function clampBox(box: Box, width: number, height: number): Box {
  const x = Math.max(0, box.x);
  const y = Math.max(0, box.y);
  return {
    x,
    y,
    width: Math.max(1, Math.min(width, box.x + box.width) - x),
    height: Math.max(1, Math.min(height, box.y + box.height) - y),
  };
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

/**
 * Alfa da pessoa: primeiro pelo servidor (BiRefNet no Hugging Face, remove.bg
 * ou MODNet, nessa ordem); se a rede falhar, no aparelho (MediaPipe, que só é baixado nesse
 * caso e enche vãos entre orelha e gola). `null` = nenhum dos dois.
 */
async function findPersonAlpha(photo: HTMLCanvasElement, remoteMask: RemoteMask | undefined): Promise<Float32Array | null> {
  if (remoteMask) {
    try {
      const mask = await withTimeout(remoteMask(await toBlob(photo, "image/jpeg", 0.9)), REMOTE_TIMEOUT_MS);
      return await maskToAlpha(mask, photo.width, photo.height);
    } catch (error) {
      console.warn("Recorte no servidor indisponível; tentando no aparelho.", error);
    }
  }
  try {
    return personAlpha(await withTimeout(getSegmenter(), SEGMENTER_TIMEOUT_MS), photo);
  } catch (error) {
    console.warn("Segmentação no aparelho indisponível; usando só a foto original.", error);
    return null;
  }
}

/**
 * Faz o recorte e a original enquadrados para a carta. Lança `NoPersonFoundError` sem pessoa.
 * A máscara vem de `remoteMask` (servidor) ou, se ele falhar, do MediaPipe no
 * aparelho; o enquadramento e a curva são os mesmos nos dois casos. Sem máscara nenhuma,
 * devolve só a original (`hasCutout: false`).
 */
export async function prepareCardPhoto(file: File, remoteMask?: RemoteMask): Promise<CardPhotoDraft> {
  const photo = await loadScaled(file);

  const alpha = await findPersonAlpha(photo, remoteMask);
  const box = alpha ? bustBox(alpha, photo.width, photo.height) : fallbackBox(photo.width, photo.height);
  const erodeRadius = Math.round(Math.max(photo.width, photo.height) * EDGE_ERODE);
  const mask = alpha ? maskCanvas(erode(alpha, photo.width, photo.height, erodeRadius), photo.width, photo.height) : null;

  const originalBox = clampBox(box, photo.width, photo.height);

  let draft: CardPhotoDraft | null = null;
  for (const targetWidth of OUTPUT_WIDTHS) {
    const outputWidth = Math.min(targetWidth, box.width);
    const outputHeight = Math.round((outputWidth * box.height) / box.width);

    const originalWidth = Math.max(1, Math.round((outputWidth * originalBox.width) / box.width));
    const originalHeight = Math.max(1, Math.round((originalWidth * originalBox.height) / originalBox.width));
    const original = createCanvas(originalWidth, originalHeight);
    drawBox(get2d(original), photo, originalBox, originalWidth, originalHeight);
    const originalBlob = await toBlob(original, "image/jpeg", 0.9);

    let cutoutBlob = originalBlob;
    if (mask) {
      const cutout = createCanvas(outputWidth, outputHeight);
      const context = get2d(cutout);
      drawBox(context, photo, box, outputWidth, outputHeight);
      // Mantém só onde a máscara é opaca (a suavização do drawImage amacia a borda).
      context.globalCompositeOperation = "destination-in";
      drawBox(context, mask, box, outputWidth, outputHeight);
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
