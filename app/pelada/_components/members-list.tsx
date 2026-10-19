import { OvrBadge } from "@/components/ovr-badge";
import { SectionTitle } from "@/components/section-title";
import { POSITION_LABELS } from "@/types/player";
import type { GroupMemberSummary } from "../_data-access/get-group-overview";
import { MemberRoleButton } from "./member-role-button";
import { ResetPasswordButton } from "./reset-password-button";

type MembersListProps = {
  members: GroupMemberSummary[];
  currentMemberId: string;
  /** Quem está vendo é organizador: mostra usuário, papel e redefinir senha. */
  canManage: boolean;
  loginUrl: string;
};

export function MembersList({ members, currentMemberId, canManage, loginUrl }: MembersListProps) {
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
            // flex-wrap: a confirmação e o acesso novo descem para uma linha própria.
            <li key={member.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t py-2.5 first:border-t-0">
              <OvrBadge ovr={member.ovr} />
              <span className="flex min-w-32 flex-1 flex-col">
                <span className="truncate font-medium">
                  {member.nickname}
                  {isSelf && <span className="text-muted-foreground"> (você)</span>}
                </span>
                <span className="text-xs text-muted-foreground">
                  {POSITION_LABELS[member.position]}
                  {isOrganizer && " · Organizador"}
                  {canManage && member.username && (
                    <span className="font-mono"> · @{member.username}</span>
                  )}
                </span>
              </span>
              {canManage && (
                <div className="flex items-center gap-1">
                  <MemberRoleButton memberId={member.id} nickname={member.nickname} isOrganizer={isOrganizer} />
                </div>
              )}
              {/* A própria senha se troca no card "Sua senha". */}
              {canManage && !isSelf && (
                <ResetPasswordButton memberId={member.id} nickname={member.nickname} loginUrl={loginUrl} />
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
