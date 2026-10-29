-- 팀원(service_members)은 수락된 초대(ACCEPTED)만 가리킬 수 있게 한다.
-- 기존 복합 FK는 초대 상태를 확인하지 않아 PENDING 초대를 가리키는 팀원 행도 허용했다.

ALTER TABLE service_invitations
  ADD CONSTRAINT uq_invitations_with_status UNIQUE (invitation_id, service_id, invitee_id, status);

DO $$
DECLARE
  fk_name text;
BEGIN
  SELECT conname INTO fk_name
  FROM pg_constraint
  WHERE conrelid = 'service_members'::regclass
    AND confrelid = 'service_invitations'::regclass
    AND contype = 'f';
  EXECUTE format('ALTER TABLE service_members DROP CONSTRAINT %I', fk_name);
END $$;

-- 항상 'ACCEPTED'인 컬럼을 FK에 포함해서, 초대가 수락된 상태일 때만 팀원 행이 들어가게 한다
ALTER TABLE service_members
  ADD COLUMN invitation_status VARCHAR(20) DEFAULT 'ACCEPTED' NOT NULL,
  ADD CONSTRAINT ck_members_invitation_accepted CHECK (invitation_status = 'ACCEPTED'),
  ADD CONSTRAINT fk_members_accepted_invitation
    FOREIGN KEY (invitation_id, service_id, user_id, invitation_status)
    REFERENCES service_invitations (invitation_id, service_id, invitee_id, status) ON DELETE CASCADE;
COMMENT ON COLUMN service_members.invitation_status IS '수락된 초대만 허용하기 위한 값(항상 ACCEPTED)';
