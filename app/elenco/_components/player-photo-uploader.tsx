"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { CameraIcon, CheckIcon, LoaderCircleIcon, Trash2Icon } from "lucide-react";
import { PlayerCard } from "@/components/player-card";
import { Button } from "@/components/ui/button";
import { NoPersonFoundError, prepareCardPhoto } from "@/lib/photo-cutout";
import { cn } from "@/lib/utils";
import type { Player, PlayerPhoto } from "@/types/player";
import { removePlayerPhoto } from "../_actions/remove-player-photo";
import { segmentPhoto } from "../_actions/segment-photo";
import { uploadPlayerPhoto } from "../_actions/upload-player-photo";
import type { GroupMemberSummary } from "../_data-access/get-roster";

type PlayerPhotoUploaderProps = {
  member: Pick<GroupMemberSummary, "id" | "nickname" | "position" | "ovr" | "photo">;
  /** É a foto de quem está logado (muda só o texto de acessibilidade). */
  isSelf: boolean;
};

type Draft = {
  cutout: Blob;
  original: Blob;
  hasCutout: boolean;
  cutoutUrl: string;
  originalUrl: string;
};

type Choice = PlayerPhoto["kind"];

/** Carta só para a prévia: números de verdade não importam aqui. */
function previewPlayer(member: PlayerPhotoUploaderProps["member"], photo: PlayerPhoto | null): Player {
  const base = { id: member.id, nickname: member.nickname, fullName: member.nickname, photo, ovr: member.ovr };
  return member.position === "GOL"
    ? { ...base, role: "goalkeeper", position: "GOL", attributes: { ref: null, ela: null, pos: null, sai: null, rep: null, pes: null } }
    : { ...base, role: "outfield", position: member.position, attributes: { vel: null, chu: null, pas: null, dri: null, def: null, fis: null } };
}

/** Reserva do recorte: o servidor devolve a máscara quando o aparelho não roda o MediaPipe. */
async function maskFromServer(photo: Blob): Promise<Blob> {
  const formData = new FormData();
  formData.set("photo", new File([photo], "photo.jpg", { type: photo.type || "image/jpeg" }));
  const result = await segmentPhoto(formData);
  if (!result.success) throw new Error(result.message);
  const bytes = Uint8Array.from(atob(result.maskBase64), (char) => char.charCodeAt(0));
  return new Blob([bytes], { type: "image/png" });
}

/**
 * Foto da carta: escolhe a foto, recorta o fundo no próprio aparelho (MediaPipe)
 * e mostra a prévia já na carta, com "Recorte" ou "Original".
 */
export function PlayerPhotoUploader({ member, isSelf }: PlayerPhotoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [choice, setChoice] = useState<Choice>("cutout");
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<{ kind: "error" | "saved"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  // Libera as URLs temporárias da prévia.
  useEffect(() => {
    return () => {
      if (draft) {
        URL.revokeObjectURL(draft.cutoutUrl);
        URL.revokeObjectURL(draft.originalUrl);
      }
    };
  }, [draft]);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setMessage(null);
    setIsProcessing(true);
    try {
      const prepared = await prepareCardPhoto(file, maskFromServer);
      setDraft({
        ...prepared,
        cutoutUrl: URL.createObjectURL(prepared.cutout),
        originalUrl: URL.createObjectURL(prepared.original),
      });
      setChoice(prepared.hasCutout ? "cutout" : "original");
      if (!prepared.hasCutout) {
        setMessage({ kind: "error", text: "Não deu para tirar o fundo agora (sem conexão com o servidor?). Você pode usar a foto original ou tentar de novo." });
      }
    } catch (error) {
      console.error("Falha ao preparar a foto", error);
      setMessage({
        kind: "error",
        text:
          error instanceof NoPersonFoundError
            ? "Não achamos ninguém na foto. Use uma foto do rosto e do peito, de frente."
            : "Não foi possível preparar a foto neste aparelho. Tente outra foto ou outro navegador.",
      });
    } finally {
      setIsProcessing(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function handleSave() {
    if (!draft) return;
    const formData = new FormData();
    formData.set("memberId", member.id);
    formData.set("kind", choice);
    formData.set("cutout", new File([draft.cutout], "cutout.png", { type: draft.cutout.type }));
    formData.set("original", new File([draft.original], "original.jpg", { type: draft.original.type }));
    startTransition(async () => {
      try {
        const result = await uploadPlayerPhoto(formData);
        if (!result.success) {
          setMessage({ kind: "error", text: result.message });
          return;
        }
        setDraft(null);
        setMessage({ kind: "saved", text: "Foto salva! Ela já aparece na carta." });
      } catch (error) {
        // Rede caiu, envio grande demais ou erro do servidor: sem isso nada aparecia na tela.
        console.error("Falha ao enviar a foto", error);
        setMessage({ kind: "error", text: "Não foi possível enviar a foto. Confira a conexão e tente de novo." });
      }
    });
  }

  function handleRemove() {
    setMessage(null);
    startTransition(async () => {
      const result = await removePlayerPhoto(member.id);
      setMessage(result.success ? { kind: "saved", text: "Foto removida." } : { kind: "error", text: result.message });
    });
  }

  const options: { kind: Choice; label: string; url: string }[] = draft
    ? [
        ...(draft.hasCutout ? [{ kind: "cutout" as const, label: "Recorte", url: draft.cutoutUrl }] : []),
        { kind: "original", label: "Original", url: draft.originalUrl },
      ]
    : [];

  return (
    <div className="flex flex-col gap-4">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        aria-label={isSelf ? "Escolher sua foto" : `Escolher foto de ${member.nickname}`}
        onChange={(event) => void handleFile(event.target.files?.[0])}
      />

      {draft ? (
        <>
          <p className="text-sm text-muted-foreground">Escolha como a foto entra na carta:</p>
          <div role="radiogroup" aria-label="Versão da foto" className="grid grid-cols-2 gap-3">
            {options.map((option) => {
              const isChosen = option.kind === choice;
              return (
                <button
                  key={option.kind}
                  type="button"
                  role="radio"
                  aria-checked={isChosen}
                  onClick={() => setChoice(option.kind)}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-xl border-2 p-2 transition-colors",
                    isChosen ? "border-primary bg-primary/10" : "border-transparent bg-muted/40 hover:bg-muted",
                  )}
                >
                  <div className="w-full max-w-36">
                    <PlayerCard
                      player={previewPlayer(member, { url: option.url, kind: option.kind })}
                      size="fill"
                    />
                  </div>
                  <span className="flex items-center gap-1 text-sm font-medium">
                    {isChosen && <CheckIcon aria-hidden className="size-4 text-primary" />}
                    {option.label}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="lg"
              className="h-11 flex-1 text-base"
              onClick={() => setDraft(null)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="button" size="lg" className="h-11 flex-1 text-base" onClick={handleSave} disabled={isPending}>
              {isPending ? "Salvando…" : choice === "cutout" ? "Usar recorte" : "Usar original"}
            </Button>
          </div>
        </>
      ) : (
        <div className="flex items-center gap-4">
          <div className="w-24 shrink-0">
            <PlayerCard player={previewPlayer(member, member.photo)} size="fill" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="h-11 text-base"
              onClick={() => inputRef.current?.click()}
              disabled={isProcessing || isPending}
            >
              {isProcessing ? (
                <LoaderCircleIcon aria-hidden className="animate-spin" />
              ) : (
                <CameraIcon aria-hidden />
              )}
              {isProcessing ? "Recortando…" : member.photo ? "Trocar foto" : "Escolher foto"}
            </Button>
            {member.photo && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={handleRemove}
                disabled={isProcessing || isPending}
              >
                <Trash2Icon aria-hidden />
                Tirar foto
              </Button>
            )}
            <p className="text-xs text-muted-foreground">
              {isProcessing
                ? "O fundo é tirado aqui no aparelho. Na primeira vez demora um pouco mais."
                : "Foto de frente, do rosto ao peito, com boa luz."}
            </p>
          </div>
        </div>
      )}

      {message && (
        <p role="status" className={message.kind === "saved" ? "text-sm text-success" : "text-sm text-destructive"}>
          {message.text}
        </p>
      )}
    </div>
  );
}
