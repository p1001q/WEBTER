-- 알림 종류를 정책서 6.5의 9종과 팀 초대 결과까지 넓히고, 초대에 거절 상태를 더하며,
-- 초대한 회원이 탈퇴해도 수락한 팀원 관계가 남도록 초대자 외래키를 바꾼다.

-- 알림: 종류마다 대상 ID 짝을 검사하던 제약을 없애고 종류 목록만 검사한다.
DO $$
DECLARE
  c record;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'notifications'::regclass AND contype = 'c'
  LOOP
    EXECUTE format('ALTER TABLE notifications DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE notifications
  ADD CONSTRAINT ck_notifications_type CHECK (notification_type IN (
    'REVIEW_CREATED',
    'COMMENT_CREATED',
    'COMMENT_REPLY',
    'REVIEW_REPLY',
    'TEAM_INVITATION',
    'TEAM_INVITATION_ACCEPTED',
    'TEAM_INVITATION_DECLINED',
    'SERVICE_HIDDEN',
    'SERVICE_UNHIDDEN',
    'SERVICE_BLOCKED',
    'CONTENT_HIDDEN',
    'REGISTRATION_RESTRICTED'
  ));

CREATE INDEX ix_notifications_unread ON notifications (recipient_id) WHERE read_at IS NULL;

-- 초대: 받은 사람이 거절하면 초대를 지우지 않고 DECLINED로 남긴다.
DO $$
DECLARE
  c record;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'service_invitations'::regclass AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE service_invitations DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE service_invitations
  ADD CONSTRAINT ck_invitations_status CHECK (status IN ('PENDING', 'ACCEPTED', 'DECLINED')),
  ADD CONSTRAINT ck_invitations_accepted_at CHECK (
    (status = 'ACCEPTED' AND accepted_at IS NOT NULL) OR (status <> 'ACCEPTED' AND accepted_at IS NULL));

-- 초대한 회원이 탈퇴하면 초대 행은 남기고 초대자만 비운다. 지우면 그 초대로 수락한 팀원 행이 함께 지워진다.
DO $$
DECLARE
  fk_name text;
BEGIN
  SELECT conname INTO fk_name
  FROM pg_constraint
  WHERE conrelid = 'service_invitations'::regclass AND contype = 'f'
    AND pg_get_constraintdef(oid) LIKE 'FOREIGN KEY (inviter_id)%';
  EXECUTE format('ALTER TABLE service_invitations DROP CONSTRAINT %I', fk_name);
END $$;

ALTER TABLE service_invitations ALTER COLUMN inviter_id DROP NOT NULL;
ALTER TABLE service_invitations
  ADD CONSTRAINT fk_invitations_inviter FOREIGN KEY (inviter_id) REFERENCES users (user_id) ON DELETE SET NULL;
COMMENT ON COLUMN service_invitations.inviter_id IS '초대한 회원(탈퇴하면 비어 있다)';
