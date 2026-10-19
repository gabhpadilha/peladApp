"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { setMemberRole } from "../_actions/set-member-role";

type MemberRoleButtonProps = {
  memberId: string;
  nickname: string;
  isOrganizer: boolean;
};

/** Para organizadores: promove o jogador ou devolve a jogador. */
export function MemberRoleButton({ memberId, nickname, isOrganizer }: MemberRoleButtonProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await setMemberRole(memberId, isOrganizer ? "player" : "organizer");
      if (!result.success) setError(result.message);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        size="xs"
        variant="ghost"
        disabled={isPending}
        onClick={handleClick}
        aria-label={isOrganizer ? `Tirar ${nickname} de organizador` : `Tornar ${nickname} organizador`}
      >
        {isOrganizer ? "Tirar organizador" : "Tornar organizador"}
      </Button>
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
