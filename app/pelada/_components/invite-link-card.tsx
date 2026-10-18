"use client";

import { useState, useSyncExternalStore } from "react";
import { CheckIcon, CopyIcon, Share2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";

const COPIED_FEEDBACK_MS = 2000;

const subscribeToNothing = () => () => {};
const getCanShare = () => "share" in navigator;
/** No servidor não existe `navigator`: o botão só aparece após hidratar. */
const getCanShareOnServer = () => false;

type InviteLinkCardProps = {
  inviteUrl: string;
  groupName: string;
};

/** Link de convite para mandar no grupo do WhatsApp. */
export function InviteLinkCard({ inviteUrl, groupName }: InviteLinkCardProps) {
  const [isCopied, setIsCopied] = useState(false);
  const canShare = useSyncExternalStore(subscribeToNothing, getCanShare, getCanShareOnServer);

  async function handleCopy() {
    await navigator.clipboard.writeText(inviteUrl);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), COPIED_FEEDBACK_MS);
  }

  async function handleShare() {
    try {
      await navigator.share({ title: groupName, text: `Cadastro da ${groupName} no PeladApp:`, url: inviteUrl });
    } catch {
      // Usuário cancelou o compartilhamento.
    }
  }

  return (
    <section aria-labelledby="invite-link-title" className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <div>
        <h2 id="invite-link-title" className="font-display text-lg font-bold tracking-wide uppercase">
          Link de cadastro
        </h2>
        <p className="text-sm text-muted-foreground">
          Mande no grupo do WhatsApp. Cada jogador se cadastra uma vez e já entra na pelada.
        </p>
      </div>
      <p className="truncate rounded-lg bg-muted/50 px-3 py-2 font-mono text-sm">{inviteUrl}</p>
      <div className="flex gap-2">
        <Button size="lg" variant="secondary" onClick={handleCopy} className="flex-1">
          {isCopied ? <CheckIcon aria-hidden /> : <CopyIcon aria-hidden />}
          {isCopied ? "Copiado" : "Copiar link"}
        </Button>
        {canShare && (
          <Button size="lg" onClick={handleShare} className="flex-1">
            <Share2Icon aria-hidden />
            Compartilhar
          </Button>
        )}
      </div>
    </section>
  );
}
