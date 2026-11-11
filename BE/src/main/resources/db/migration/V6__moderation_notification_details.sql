-- 신고·관리자 처리 알림이 무엇을 가리키는지(서비스·리뷰·제작자 답글·댓글·프로필)와 사유를 담는다.
ALTER TABLE notifications
  ADD COLUMN target_kind VARCHAR(20),
  ADD COLUMN reason TEXT,
  ADD CONSTRAINT ck_notifications_target_kind CHECK (
    target_kind IS NULL OR target_kind IN ('SERVICE', 'REVIEW', 'REVIEW_REPLY', 'COMMENT', 'PROFILE')),
  ADD CONSTRAINT ck_notifications_reason_length CHECK (reason IS NULL OR char_length(reason) <= 500);
COMMENT ON COLUMN notifications.target_kind IS '운영 처리 알림이 가리키는 대상 종류';
COMMENT ON COLUMN notifications.reason IS '운영 처리 사유(최종 비공개·등록 제한 안내)';
