"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type AlphaVideoProps = {
  /** Vídeo "empilhado": a cor na metade de cima e a transparência (em cinza) na metade de baixo. */
  src: string;
  isPlaying: boolean;
  /** Chamado se o navegador não conseguir desenhar (sem WebGL ou o vídeo falhou): o pai usa a reserva. */
  onFail: () => void;
  className?: string;
};

const VERTEX = `attribute vec2 p; varying vec2 uv;
void main() { uv = vec2((p.x + 1.0) * 0.5, (1.0 - p.y) * 0.5); gl_Position = vec4(p, 0.0, 1.0); }`;
// A cor sai da metade de cima e o alfa da de baixo; o canvas é pré-multiplicado.
const FRAGMENT = `precision mediump float; varying vec2 uv; uniform sampler2D t;
void main() {
  vec3 color = texture2D(t, vec2(uv.x, uv.y * 0.5)).rgb;
  float alpha = texture2D(t, vec2(uv.x, 0.5 + uv.y * 0.5)).r;
  gl_FragColor = vec4(color * alpha, alpha);
}`;

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
}

/**
 * Vídeo com fundo transparente que toca em todo navegador, inclusive no iPhone (que não toca WebM com alfa): o
 * vídeo comum com as duas metades é desenhado num canvas por WebGL, quadro a quadro. Usado na cortina do Blender,
 * para o palco aparecer de verdade pelo vão do tecido (2026-11-11).
 */
export function AlphaVideo({ src, isPlaying, onFail, className }: AlphaVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const gl = canvas.getContext("webgl", { premultipliedAlpha: true, alpha: true });
    const vertex = gl && compile(gl, gl.VERTEX_SHADER, VERTEX);
    const fragment = gl && compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
    const program = gl?.createProgram();
    if (!gl || !vertex || !fragment || !program) {
      onFail();
      return;
    }
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "p");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    function draw() {
      if (!gl || !video || !canvas || video.readyState < 2) return;
      const width = video.videoWidth;
      const height = video.videoHeight / 2;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
      }
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, video);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    drawRef.current = draw;
    video.addEventListener("loadeddata", draw);
    video.addEventListener("seeked", draw);
    if (video.readyState >= 2) draw();
    return () => {
      video.removeEventListener("loadeddata", draw);
      video.removeEventListener("seeked", draw);
      drawRef.current = null;
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [onFail]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isPlaying) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    function tick() {
      drawRef.current?.();
      if (!video?.ended) frame = requestAnimationFrame(tick);
    }
    video.play().then(tick, onFail);
    return () => cancelAnimationFrame(frame);
  }, [isPlaying, onFail]);

  return (
    <>
      <video ref={videoRef} aria-hidden muted playsInline preload="auto" src={src} onError={onFail} className="hidden" />
      <canvas ref={canvasRef} aria-hidden className={cn("pointer-events-none", className)} />
    </>
  );
}
