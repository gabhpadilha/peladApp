import { OvrBadge } from "@/components/ovr-badge";
import { SectionTitle } from "@/components/section-title";
import { POSITION_LABELS } from "@/types/player";
import type { GroupMemberSummary } from "../_data-access/get-group-overview";
import { MemberRoleButton } from "./member-role-button";

type MembersListProps = {
  members: GroupMemberSummary[];
  currentMemberId: string;
  /** Quem está vendo é organizador: mostra os botões de papel. */
  canManageRoles: boolean;
};

export function MembersList({ members, currentMemberId, canManageRoles }: MembersListProps) {
  return (
    <section aria-labelledby="members-title" className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <SectionTitle id="members-title" aside={`${members.length} jogadores`}>
        Elenco
      </SectionTitle>
      <ul className="flex flex-col">
        {members.map((member) => {
          const isOrganizer = member.role === "organizer";
          return (
            <li key={member.id} className="flex items-center gap-3 border-t py-2.5 first:border-t-0">
              <OvrBadge ovr={member.ovr} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-medium">
                  {member.nickname}
                  {member.id === currentMemberId && <span className="text-muted-foreground"> (você)</span>}
                </span>
                <span className="text-xs text-muted-foreground">
                  {POSITION_LABELS[member.position]}
                  {isOrganizer && " · Organizador"}
                </span>
              </span>
              {canManageRoles && (
                <MemberRoleButton memberId={member.id} nickname={member.nickname} isOrganizer={isOrganizer} />
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
