"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Trash2Icon } from "lucide-react";
import { PlayerCard } from "@/components/player-card";
import { Button } from "@/components/ui/button";
import { formatShortDate } from "@/lib/format-date";
import { REACTIONS, type ReactionKey } from "@/lib/community";
import { cn } from "@/lib/utils";
import { AWARD_LABELS, formatAwardResult } from "@/types/award";
import { setReaction, unpublishPost } from "../_actions/community-actions";
import type { FeedPost } from "../_data-access/community-data";

/** Uma conquista no feed: a carta, quem ganhou, a pelada, as reações e (no dono) "Remover". */
export function FeedPostCard({ post }: { post: FeedPost }) {
  const [mine, setMine] = useState<string | null>(post.myReaction);
  const [counts, setCounts] = useState<Record<string, number>>(post.reactions);
  const [error, setError] = useState<string | null>(null);
  const [isRemoved, setIsRemoved] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { award } = post;
  const where = [post.city, post.state].filter(Boolean).join("/");

  function handleReact(key: ReactionKey) {
    const next = mine === key ? null : key;
    const previous = { mine, counts };
    // Mostra na hora; se o servidor recusar, volta.
    setMine(next);
    setCounts((current) => {
      const updated = { ...current };
      if (mine) updated[mine] = Math.max((updated[mine] ?? 1) - 1, 0);
      if (next) updated[next] = (updated[next] ?? 0) + 1;
      return updated;
    });
    setError(null);
    startTransition(async () => {
      const result = await setReaction(post.id, next);
      if (!result.success) {
        setMine(previous.mine);
        setCounts(previous.counts);
        setError(result.message);
      }
    });
  }

  function handleRemove() {
    startTransition(async () => {
      const result = await unpublishPost(post.id);
      if (result.success) setIsRemoved(true);
      else setError(result.message);
    });
  }

  if (isRemoved) return null;

  return (
    <article className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-bold">
            <Link href={`/comunidade/${post.groupId}/${award.memberId}`} className="hover:underline">{award.card.nickname}</Link>
            <span className="font-normal text-muted-foreground"> · </span>
            <Link href={`/comunidade/${post.groupId}`} className="font-normal text-muted-foreground hover:underline">{post.groupName}</Link>
          </p>
          <p className="text-sm text-muted-foreground">
            {AWARD_LABELS[award.kind].title} · Rodada {award.round} · {formatShortDate(award.date)}
            {where && ` · ${where}`}
          </p>
        </div>
        {post.isMine && (
          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={handleRemove} disabled={isPending} aria-label="Remover do feed">
            <Trash2Icon aria-hidden />
            Remover
          </Button>
        )}
      </header>
      <div className="mx-auto w-full max-w-52">
        <PlayerCard player={award.card} award={award} size="fill" />
      </div>
      <p className="text-center text-sm text-muted-foreground">{formatAwardResult(award)}</p>
      <div role="group" aria-label="Reações" className="flex flex-wrap justify-center gap-2">
        {REACTIONS.map((reaction) => (
          <button
            key={reaction.key}
            type="button"
            aria-pressed={mine === reaction.key}
            aria-label={`${reaction.label}: ${counts[reaction.key] ?? 0}`}
            onClick={() => handleReact(reaction.key)}
            className={cn(
              "inline-flex h-11 items-center gap-1.5 rounded-full border px-4 text-base transition-colors",
              mine === reaction.key ? "border-primary bg-primary/15" : "hover:bg-muted",
            )}
          >
            <span aria-hidden>{reaction.emoji}</span>
            <span className="text-sm font-bold tabular-nums">{counts[reaction.key] ?? 0}</span>
          </button>
        ))}
      </div>
      {error && <p role="alert" className="text-center text-sm text-destructive">{error}</p>}
    </article>
  );
}
