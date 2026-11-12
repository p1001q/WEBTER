import { deleteJson, getJson, postJson, putJson } from "../auth/http";
import type {
  InviteStatus,
  Notification,
  NotificationKind,
  User,
} from "../types";
import { makerToUser, ymd } from "./serviceApi";

/** GET /api/notifications 의 한 건 */
interface BackendNotification {
  id: string;
  type: string;
  actor: { id: string; username: string; nickname: string } | null;
  serviceId: string | null;
  serviceName: string | null;
  quote: string | null;
  targetKind: Notification["targetKind"] | null;
  /** 최종 비공개·등록 제한의 처리 사유 */
  reason: string | null;
  invitation: { id: string; status: InviteStatus } | null;
  read: boolean;
  createdAt: string;
}

interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
}

/** 서버 알림 종류를 화면 종류로 바꾼다. 운영 처리 알림은 모두 hidden 문구로 보여 준다 */
const KIND: Record<string, NotificationKind> = {
  REVIEW_CREATED: "review",
  COMMENT_CREATED: "comment",
  COMMENT_REPLY: "reply",
  REVIEW_REPLY: "maker-reply",
  TEAM_INVITATION: "invite",
  TEAM_INVITATION_ACCEPTED: "invite-accepted",
  TEAM_INVITATION_DECLINED: "invite-declined",
  SERVICE_HIDDEN: "hidden",
  SERVICE_UNHIDDEN: "unhidden",
  SERVICE_BLOCKED: "blocked",
  CONTENT_HIDDEN: "content-hidden",
  REGISTRATION_RESTRICTED: "restricted",
};

export interface MappedNotification {
  item: Notification;
  actor?: User;
}

export function mapNotification(b: BackendNotification): MappedNotification[] {
  const kind = KIND[b.type];
  // 아직 화면에 문구가 없는 종류는 건너뛴다
  if (!kind) return [];
  return [
    {
      item: {
        id: b.id,
        kind,
        actor: b.actor?.id,
        sid: b.serviceId ?? "",
        serviceName: b.serviceName ?? undefined,
        date: ymd(b.createdAt),
        read: b.read,
        // 처리 사유가 있는 알림(최종 비공개·등록 제한)은 사유를 인용문 자리에 보여 준다
        quote: b.quote ?? b.reason ?? undefined,
        targetKind: b.targetKind ?? undefined,
        invite: b.invitation ?? undefined,
      },
      actor: b.actor ? makerToUser(b.actor) : undefined,
    },
  ];
}

/** 알림 화면이 한 번에 받는 건수 */
const PAGE = 50;

export const notificationApi = {
  /** 최신 알림 한 페이지 */
  list: async () => {
    const page = await getJson<CursorPage<BackendNotification>>(
      `/api/notifications?limit=${PAGE}`,
    );
    return page.items.flatMap(mapNotification);
  },
  read: (id: string) => putJson<null>(`/api/notifications/${id}/read`),
  readAll: () => putJson<null>("/api/notifications/read-all"),
  remove: (id: string) => deleteJson<null>(`/api/notifications/${id}`),
  /** 지울 수 있는 알림을 모두 지운다(대기 중인 초대 알림은 남는다) */
  clear: () => deleteJson<null>("/api/notifications"),
  accept: (invitationId: string) =>
    postJson<{ id: string; serviceId: string; status: InviteStatus }>(
      `/api/invitations/${invitationId}/accept`,
    ),
  decline: (invitationId: string) =>
    postJson<{ id: string; serviceId: string; status: InviteStatus }>(
      `/api/invitations/${invitationId}/decline`,
    ),
};

/** 서비스 팀 구성(GET /api/services/{id}/team) */
export interface TeamState {
  owner: TeamUser;
  members: { user: TeamUser; joinedAt: string }[];
  invitations: { id: string; invitee: TeamUser; createdAt: string }[];
  canManage: boolean;
  memberLimit: number;
}
export interface TeamUser {
  id: string;
  username: string;
  nickname: string;
}

export const teamApi = {
  team: (sid: string) => getJson<TeamState>(`/api/services/${sid}/team`),
  candidates: (sid: string, q: string) =>
    getJson<TeamUser[]>(
      `/api/services/${sid}/team/candidates?q=${encodeURIComponent(q)}`,
    ),
  invite: (sid: string, username: string) =>
    postJson<{ id: string }>(`/api/services/${sid}/team/invitations`, {
      username,
    }),
  cancel: (sid: string, invitationId: string) =>
    deleteJson<null>(`/api/services/${sid}/team/invitations/${invitationId}`),
  remove: (sid: string, userId: string) =>
    deleteJson<null>(`/api/services/${sid}/team/members/${userId}`),
};
