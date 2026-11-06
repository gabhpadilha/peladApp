"use client";

import { useState, useTransition } from "react";
import { SendIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { publishAward } from "../_actions/community-actions";

/** "Publicar no feed" na carta que o jogador acabou de ganhar. */
export function PublishAwardButton({ awardId }: { awardId: string }) {
  const [state, setState] = useState<"idle" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handlePublish() {
    setError(null);
    startTransition(async () => {
      const result = await publishAward(awardId);
      if (result.success) setState("done");
      else setError(result.message);
    });
  }

  if (state === "done") return <p className="text-xs font-medium text-primary">Publicada no feed.</p>;
  return (
    <div className="flex flex-col items-center gap-1">
      <Button size="sm" variant="outline" onClick={handlePublish} disabled={isPending}>
        <SendIcon aria-hidden />
        {isPending ? "Publicando…" : "Publicar no feed"}
      </Button>
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
