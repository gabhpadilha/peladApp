"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildAccessMessage } from "@/lib/access-message";

const COPIED_FEEDBACK_MS = 2000;

type AccessCardProps = {
  title: string;
  nickname: string;
  /** Usuário, ou e-mail nas contas antigas. */
  login: string;
  tempPassword: string;
  loginUrl: string;
  /** Ações extras (ex.: "Cadastrar outro", "Fechar"). */
  children?: ReactNode;
};

/** Acesso do jogador (usuário + senha gerada) com cópia da mensagem para o WhatsApp. */
export function AccessCard({ title, nickname, login, tempPassword, loginUrl, children }: AccessCardProps) {
  const [isCopied, setIsCopied] = useState(false);
  const copiedTimers = useRef(new Set<ReturnType<typeof setTimeout>>());

  // Performance (vazamento): o timer do "Copiado" é cancelado ao desmontar (fechar o
  // cartão ou trocar de jogador). Antes, ele continuava vivo e tentava mudar o estado
  // de um componente que já tinha saído da tela.
  useEffect(() => {
    const timers = copiedTimers.current;
    return () => {
      for (const timer of timers) clearTimeout(timer);
      timers.clear();
    };
  }, []);

  async function handleCopy() {
    await navigator.clipboard.writeText(buildAccessMessage({ nickname, login, tempPassword, loginUrl }));
    setIsCopied(true);
    const timer = setTimeout(() => {
      copiedTimers.current.delete(timer);
      setIsCopied(false);
    }, COPIED_FEEDBACK_MS);
    copiedTimers.current.add(timer);
  }

  return (
    <div role="status" className="flex flex-col gap-3 rounded-lg border border-primary/30 bg-primary/10 p-4">
      <p className="font-medium">{title}</p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        <dt className="text-muted-foreground">{login.includes("@") ? "E-mail" : "Usuário"}</dt>
        <dd className="truncate font-mono font-medium select-all">{login}</dd>
        <dt className="text-muted-foreground">Senha</dt>
        <dd className="font-mono font-medium select-all">{tempPassword}</dd>
      </dl>
      <p className="text-xs text-muted-foreground">Anote ou mande agora: a senha não aparece de novo. Se ele quiser, troca depois em “Sua senha”.</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button size="lg" onClick={handleCopy} className="flex-1">
          {isCopied ? <CheckIcon aria-hidden /> : <CopyIcon aria-hidden />}
          {isCopied ? "Mensagem copiada" : "Copiar mensagem para o WhatsApp"}
        </Button>
        {children}
      </div>
    </div>
  );
}
