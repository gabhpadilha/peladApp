"use client";

import { useState, useTransition } from "react";
import { Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteAdminGroup } from "../_actions/delete-admin-group";
import type { AdminGroup } from "../_data-access/get-overview";

/** "Excluir pelada": apaga tudo dela do banco. Confirma digitando o nome; não dá para desfazer. */
export function DeleteGroupButton({ group }: { group: AdminGroup }) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [typed, setTyped] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const matches = typed.trim().toLocaleLowerCase("pt-BR") === group.name.trim().toLocaleLowerCase("pt-BR");

  function handleDelete() {
    setMessage(null);
    startTransition(async () => {
      const result = await deleteAdminGroup(group.id, typed);
      if (!result.success) setMessage(result.message);
    });
  }

  if (!isConfirming) {
    return (
      <Button type="button" variant="ghost" size="lg" className="text-destructive hover:text-destructive" onClick={() => setIsConfirming(true)}>
        <Trash2Icon aria-hidden />
        Excluir pelada
      </Button>
    );
  }

  return (
    <div role="alertdialog" aria-label={`Excluir a pelada ${group.name}`} className="flex flex-col gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-3">
      <p className="text-sm">
        Excluir <strong>{group.name}</strong> de vez? Saem do banco os {group.activePlayers} jogadores, as {group.roundCount} rodadas com
        notas, cartas, gols e publicações, as fotos e as <strong>contas de quem só está nessa pelada</strong>. Contas de admin e de
        quem está em outra pelada ficam. <strong>Não dá para desfazer.</strong>
      </p>
      <label className="flex flex-col gap-1.5 text-sm">
        Para confirmar, digite o nome da pelada:
        <Input
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          placeholder={group.name}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          className="h-11 text-base"
        />
      </label>
      {message && <p role="alert" className="text-sm text-destructive">{message}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => { setIsConfirming(false); setTyped(""); setMessage(null); }} disabled={isPending}>
          Cancelar
        </Button>
        <Button type="button" variant="destructive" onClick={handleDelete} disabled={isPending || !matches}>
          {isPending ? "Excluindo…" : "Excluir pelada de vez"}
        </Button>
      </div>
    </div>
  );
}
