import { OvrBadge } from "@/components/ovr-badge";
import { SectionTitle } from "@/components/section-title";
import { POSITION_LABELS } from "@/types/player";
import type { GroupMemberSummary, InactiveMemberSummary } from "../_data-access/get-roster";
import { MemberActiveButton } from "./member-active-button";
import { MemberManagePanel } from "./member-manage-panel";

type MembersListProps = {
  members: GroupMemberSummary[];
  /** Desativados (só chegam preenchidos para o organizador). */
  inactiveMembers: InactiveMemberSummary[];
  currentMemberId: string;
  /** Quem está vendo é o dono da pelada: mostra usuário e o painel "Gerenciar". */
  canManage: boolean;
  loginUrl: string;
};

export function MembersList({ members, inactiveMembers, currentMemberId, canManage, loginUrl }: MembersListProps) {
  return (
    <section aria-labelledby="members-title" className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <SectionTitle id="members-title" aside={`${members.length} jogadores`}>
        Elenco
      </SectionTitle>
      <ul className="flex flex-col">
        {members.map((member) => {
          const isOrganizer = member.role === "organizer";
          const isSelf = member.id === currentMemberId;
          return (
            // flex-wrap: o painel "Gerenciar" desce para uma linha própria.
            <li key={member.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t py-2.5 first:border-t-0">
              <OvrBadge ovr={member.ovr} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-medium">
                  {member.nickname}
                  {isSelf && <span className="text-muted-foreground"> (você)</span>}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {POSITION_LABELS[member.position]}
                  {member.isOwner ? " · Dono da pelada" : isOrganizer && " · Organizador"}
                  {canManage && member.username && (
                    <span className="font-mono"> · @{member.username}</span>
                  )}
                </span>
              </span>
              {canManage && (
                <MemberManagePanel member={member} isSelf={isSelf} canChangeRole={!isSelf} loginUrl={loginUrl} />
              )}
            </li>
          );
        })}
      </ul>

      {canManage && inactiveMembers.length > 0 && (
        <div className="flex flex-col gap-1 border-t pt-3">
          <h3 className="text-xs font-medium text-muted-foreground uppercase">
            Desativados ({inactiveMembers.length})
          </h3>
          <p className="text-xs text-muted-foreground">
            Não entram no ranking nem no sorteio, e o login está bloqueado. O histórico continua.
          </p>
          <ul className="flex flex-col">
            {inactiveMembers.map((member) => (
              <li key={member.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2">
                <span className="flex min-w-0 flex-1 flex-col text-muted-foreground">
                  <span className="truncate font-medium">{member.nickname}</span>
                  <span className="text-xs">{POSITION_LABELS[member.position]}</span>
                </span>
                <MemberActiveButton memberId={member.id} nickname={member.nickname} activate />
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
