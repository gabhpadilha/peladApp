"use client";

import { useState } from "react";
import { PencilIcon, Settings2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GroupMemberSummary } from "../_data-access/get-roster";
import { EditPlayerForm } from "./edit-player-form";
import { MemberActiveButton } from "./member-active-button";
import { MemberRoleButton } from "./member-role-button";
import { ResetPasswordButton } from "./reset-password-button";

type MemberManagePanelProps = {
  member: GroupMemberSummary;
  isSelf: boolean;
  /** Só o dono da pelada promove/rebaixa (e não a si mesmo). */
  canChangeRole: boolean;
  loginUrl: string;
};

/**
 * Para o organizador: um botão "Gerenciar" por jogador que abre, numa linha
 * própria, editar dados, papel, redefinir senha e desativar.
 */
export function MemberManagePanel({ member, isSelf, canChangeRole, loginUrl }: MemberManagePanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const panelId = `manage-${member.id}`;

  function handleClose() {
    setIsOpen(false);
    setIsEditing(false);
  }

  return (
    <>
      <Button
        size="xs"
        variant={isOpen ? "secondary" : "ghost"}
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => (isOpen ? handleClose() : setIsOpen(true))}
        aria-label={`Gerenciar ${member.nickname}`}
      >
        <Settings2Icon aria-hidden />
        Gerenciar
      </Button>

      {isOpen && (
        <div id={panelId} className="flex basis-full flex-col gap-3 rounded-lg border bg-muted/30 p-3">
          {isEditing ? (
            <EditPlayerForm member={member} onDone={() => setIsEditing(false)} />
          ) : (
            <div className="flex flex-wrap items-start justify-end gap-1">
              <Button size="xs" variant="ghost" onClick={() => setIsEditing(true)}>
                <PencilIcon aria-hidden />
                Editar dados
              </Button>
              {canChangeRole && (
                <MemberRoleButton
                  memberId={member.id}
                  nickname={member.nickname}
                  isOrganizer={member.role === "organizer"}
                />
              )}
              {/* A própria senha se troca no card "Sua senha"; ninguém se desativa. */}
              {!isSelf && (
                <>
                  <ResetPasswordButton memberId={member.id} nickname={member.nickname} loginUrl={loginUrl} />
                  <MemberActiveButton memberId={member.id} nickname={member.nickname} activate={false} />
                </>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
