import type { Service } from "@/api/types";

/** 이 회원이 서비스의 제작자(등록자 또는 수락한 팀원)인지. 팀원은 등록자와 같은 권한을 가진다 */
export const isMaker = (s: Service, userId: string | null | undefined) =>
  !!userId && (s.owner === userId || !!s.members?.includes(userId));
