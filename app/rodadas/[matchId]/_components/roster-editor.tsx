"use client";

import { useState, useTransition } from "react";
import { UsersIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { teamRoleLabel } from "@/lib/teams";
import { cn } from "@/lib/utils";
import { updateMatchRoster } from "../_actions/update-match-roster";
import type { MatchBoard } from "../_data-access/get-match-board";

type RosterEditorProps = {
  matchId: string;
  editor: NonNullable<MatchBoard["rosterEditor"]>;
};

const OUT = "out";
const SLOT_OPTIONS = [
  { value: OUT, label: "Fora da rodada" },
  { value: "1:s", label: teamRoleLabel(1, false) },
  { value: "1:r", label: teamRoleLabel(1, true) },
  { value: "2:s", label: teamRoleLabel(2, false) },
  { value: "2:r", label: teamRoleLabel(2, true) },
] as const;

/**
 * "Corrigir a lista" (organizador, rodada aberta e notas ainda fechadas; decisão do dono do app em 2026-11-06):
 * quem esqueceu de entrar entra, quem entrou errado sai e dá para trocar o time ou o banco de cada um, sem excluir a
 * rodada. Quem sai leva os gols que informou; a conferência dos gols recomeça.
 */
export function RosterEditor({ matchId, editor }: RosterEditorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [slots, setSlots] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const presentCount = Object.keys(editor.slots).length;
  const draftPlayers = editor.members.flatMap((member) => {
    const slot = slots[member.id] ?? editor.slots[member.id] ?? OUT;
    if (slot === OUT) return [];
    const [team, kind] = slot.split(":");
    return [{ memberId: member.id, team: Number(team), reserve: kind === "r" }];
  });
  const starters = draftPlayers.filter((player) => !player.reserve).length;
  const hasChanges = editor.members.some((member) => (slots[member.id] ?? editor.slots[member.id] ?? OUT) !== (editor.slots[member.id] ?? OUT));
  const problem = draftPlayers.length < 2 ? "Escolha pelo menos 2 jogadores." : starters < 2 ? "Precisa de pelo menos 2 titulares." : null;

  function handleOpenChange(open: boolean) {
    if (open) {
      setSlots({});
      setError(null);
    }
    setIsOpen(open);
  }

  function handleSave() {
    if (problem) return setError(problem);
    startTransition(async () => {
      const result = await updateMatchRoster({ matchId, players: draftPlayers });
      if (result.success) setIsOpen(false);
      else setError(result.message);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => handleOpenChange(true)}
        className="flex items-center gap-3 rounded-xl border bg-card p-3 text-left transition-colors hover:bg-muted/50"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
          <UsersIcon aria-hidden className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">Faltou alguém ou entrou alguém errado?</span>
          <span className="block truncate text-xs text-muted-foreground">
            {presentCount} na rodada · dá para corrigir até as notas abrirem · só o organizador vê
          </span>
        </span>
        <span className="text-sm font-medium text-primary">Corrigir</span>
      </button>

      <Sheet open={isOpen} onOpenChange={handleOpenChange}>
        <SheetContent side="bottom" className="mx-auto max-h-[92dvh] w-full max-w-md gap-0 overflow-hidden rounded-t-2xl">
          <SheetHeader className="border-b pb-4 text-left">
            <SheetTitle className="font-display text-2xl font-bold">Quem jogou</SheetTitle>
            <SheetDescription>
              Coloque quem faltou, tire quem entrou sem jogar e troque o time ou o banco. Vale só até as notas abrirem.
            </SheetDescription>
          </SheetHeader>

          <ul className="flex flex-1 flex-col overflow-y-auto px-4">
            {editor.members.map((member) => {
              const slot = slots[member.id] ?? editor.slots[member.id] ?? OUT;
              const changed = slot !== (editor.slots[member.id] ?? OUT);
              return (
                <li key={member.id} className="flex items-center gap-3 border-t py-2.5 first:border-t-0">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{member.nickname}</span>
                    <span className="block text-xs text-muted-foreground">
                      {member.position}
                      {member.ovr !== null && ` · OVR ${member.ovr}`}
                      {changed && <span className="text-primary"> · mudou</span>}
                    </span>
                  </span>
                  <select
                    value={slot}
                    onChange={(event) => setSlots((current) => ({ ...current, [member.id]: event.target.value }))}
                    aria-label={`Vaga de ${member.nickname} na rodada`}
                    className={cn(
                      "h-11 rounded-lg border bg-transparent px-2 text-base",
                      slot === OUT && "text-muted-foreground",
                    )}
                  >
                    {SLOT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value} className="bg-background">
                        {option.label}
                      </option>
                    ))}
                  </select>
                </li>
              );
            })}
          </ul>

          <div className="flex flex-col gap-2 border-t bg-background px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <p className="text-xs text-muted-foreground">
              {draftPlayers.length} jogadores ({starters} titulares). Quem sair leva os gols que informou, e todo mundo
              confere os gols de novo.
            </p>
            {(error ?? (hasChanges ? problem : null)) && (
              <p role="alert" className="text-sm text-destructive">
                {error ?? problem}
              </p>
            )}
            <Button size="lg" className="h-12 w-full text-base" disabled={isPending || !hasChanges || problem !== null} onClick={handleSave}>
              {isPending ? "Salvando…" : "Salvar a lista"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
