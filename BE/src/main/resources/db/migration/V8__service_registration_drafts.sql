-- 미완성 등록 내용은 서비스와 분리해 보관한다. 한 회원의 최신 초안만 남고 탈퇴 시 함께 삭제된다.
CREATE TABLE service_registration_drafts (
    user_id uuid PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    revision uuid NOT NULL,
    payload jsonb NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now()
);
