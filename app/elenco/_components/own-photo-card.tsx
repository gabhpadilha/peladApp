import type { GroupMemberSummary } from "../_data-access/get-roster";
import { PlayerPhotoUploader } from "./player-photo-uploader";

type OwnPhotoCardProps = {
  member: GroupMemberSummary;
};

/** Cada jogador troca a própria foto da carta (recortada no aparelho). */
export function OwnPhotoCard({ member }: OwnPhotoCardProps) {
  return (
    <section
      id="sua-foto"
      aria-labelledby="own-photo-title"
      className="flex scroll-mt-20 flex-col gap-4 rounded-xl border bg-card p-4"
    >
      <div>
        <h2 id="own-photo-title" className="font-display text-lg font-bold tracking-wide uppercase">
          Sua foto
        </h2>
        <p className="text-sm text-muted-foreground">
          O fundo sai sozinho e a foto entra na sua carta.
        </p>
      </div>
      <PlayerPhotoUploader member={member} isSelf />
    </section>
  );
}
