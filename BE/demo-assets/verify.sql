-- 시연 데이터 정합성 확인. 시드 실행 뒤 psql로 실행한다(읽기 전용).
-- 예: psql -v owner="'본계정 이메일'" -f verify.sql
-- "문제" 열이 0이 아니면 시드 또는 데이터에 어긋난 곳이 있다.

\echo '== 테이블별 건수'
SELECT 'users' AS t, count(*) FROM users UNION ALL
SELECT 'services', count(*) FROM services UNION ALL
SELECT 'services(공개)', count(*) FROM services WHERE visibility_status = 'PUBLIC' UNION ALL
SELECT 'reviews(본문)', count(*) FROM reviews WHERE btrim(content) <> '' UNION ALL
SELECT 'reviews(평가만)', count(*) FROM reviews WHERE btrim(content) = '' UNION ALL
SELECT 'service_comments', count(*) FROM service_comments UNION ALL
SELECT 'service_reactions', count(*) FROM service_reactions UNION ALL
SELECT 'service_events', count(*) FROM service_events UNION ALL
SELECT 'notifications', count(*) FROM notifications UNION ALL
SELECT 'reports', count(*) FROM reports UNION ALL
SELECT 'moderation_actions', count(*) FROM moderation_actions;

\echo '== 정합성 검사(문제 0이어야 함)'
SELECT '제작자 리뷰에 평가가 있음' AS 검사, count(*) AS 문제 FROM reviews WHERE is_creator_review AND rating <> 'NONE'
UNION ALL
SELECT '비회원 리뷰에 평가가 있음', count(*) FROM reviews WHERE author_kind = 'GUEST' AND rating <> 'NONE'
UNION ALL
SELECT '익명 리뷰를 허용하지 않는 서비스의 익명 리뷰', count(*) FROM reviews r JOIN services s USING (service_id)
  WHERE r.is_anonymous AND NOT s.allow_anonymous_reviews
UNION ALL
SELECT '비회원 리뷰를 허용하지 않는 서비스의 비회원 리뷰', count(*) FROM reviews r JOIN services s USING (service_id)
  WHERE r.author_kind = 'GUEST' AND NOT s.allow_guest_reviews
UNION ALL
SELECT '익명 댓글을 허용하지 않는 서비스의 익명 댓글', count(*) FROM service_comments c JOIN services s USING (service_id)
  WHERE c.is_anonymous AND NOT s.allow_anonymous_comments
UNION ALL
SELECT '답글의 답글', count(*) FROM service_comments c JOIN service_comments p ON p.comment_id = c.parent_comment_id
  WHERE p.parent_comment_id IS NOT NULL
UNION ALL
SELECT '답글 없는 삭제 댓글', count(*) FROM service_comments c WHERE c.deleted_at IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM service_comments r WHERE r.parent_comment_id = c.comment_id AND r.deleted_at IS NULL)
UNION ALL
SELECT '팀원 5명 초과 서비스', count(*) FROM (SELECT service_id FROM service_members GROUP BY 1 HAVING count(*) > 5) x
UNION ALL
SELECT '처리 대기인데 처리자가 있는 신고', count(*) FROM reports WHERE status = 'OPEN' AND reviewed_at IS NOT NULL
UNION ALL
SELECT '처리 완료인데 처리 시각이 없는 신고', count(*) FROM reports WHERE status <> 'OPEN' AND reviewed_at IS NULL
UNION ALL
SELECT '처리 대기 4건 이상인데 공개 중인 서비스', count(*) FROM services s WHERE visibility_status = 'PUBLIC'
  AND (SELECT count(*) FROM reports r WHERE r.target_type = 'SERVICE' AND r.target_key = s.service_id::text AND r.status = 'OPEN') >= 4
UNION ALL
SELECT '임시 비공개인데 자동 조치 이력이 없는 대상', count(*) FROM (
  SELECT 'SERVICE' t, service_id::text k FROM services WHERE visibility_status = 'TEMP_HIDDEN'
  UNION ALL SELECT 'REVIEW', review_id::text FROM reviews WHERE visibility_status = 'TEMP_HIDDEN'
  UNION ALL SELECT 'COMMENT', comment_id::text FROM service_comments WHERE visibility_status = 'TEMP_HIDDEN'
  UNION ALL SELECT 'PROFILE', user_id::text FROM users WHERE visibility_status = 'TEMP_HIDDEN') h
  WHERE NOT EXISTS (SELECT 1 FROM moderation_actions a WHERE a.target_type = h.t AND a.target_key = h.k AND a.action_type = 'TEMP_HIDE')
UNION ALL
SELECT '참조하는 시연 이미지의 업로드 기록 없음', count(*) FROM (
  SELECT icon_url u FROM services UNION SELECT thumbnail_url FROM services
  UNION SELECT jsonb_array_elements_text(preview_images) FROM services UNION SELECT avatar_url FROM users) x
  WHERE u LIKE '%/uploads/demo/%' AND NOT EXISTS (SELECT 1 FROM image_upload_usage i WHERE i.image_url = x.u)
UNION ALL
SELECT '서비스 이름 30자 초과', count(*) FROM services WHERE char_length(name) > 30;

\echo '== [시연] 등급 서비스의 추천·비추천(제작자·비공개 제외)'
SELECT s.name, count(*) FILTER (WHERE r.rating = 'RECOMMEND') AS 추천, count(*) FILTER (WHERE r.rating = 'NOT_RECOMMEND') AS 비추천,
  round(100.0 * count(*) FILTER (WHERE r.rating = 'RECOMMEND') / nullif(count(*) FILTER (WHERE r.rating <> 'NONE'), 0), 1) AS 추천률
FROM services s LEFT JOIN reviews r ON r.service_id = s.service_id AND r.visibility_status = 'PUBLIC' AND NOT r.is_creator_review
WHERE s.name LIKE '[시연] 등급%' GROUP BY s.name ORDER BY 4 DESC;

\echo '== 공개 상태가 아닌 대상'
SELECT 'SERVICE' AS 종류, name AS 대상, visibility_status, hidden_reason FROM services WHERE visibility_status <> 'PUBLIC'
UNION ALL SELECT 'REVIEW', left(content, 30), visibility_status, hidden_reason FROM reviews WHERE visibility_status <> 'PUBLIC'
UNION ALL SELECT 'REVIEW_REPLY', left(reply_content, 30), reply_visibility_status, reply_hidden_reason FROM reviews WHERE reply_visibility_status <> 'PUBLIC'
UNION ALL SELECT 'COMMENT', left(content, 30), visibility_status, hidden_reason FROM service_comments WHERE visibility_status <> 'PUBLIC'
UNION ALL SELECT 'PROFILE', nickname, visibility_status, hidden_reason FROM users WHERE visibility_status <> 'PUBLIC';

\echo '== 회원 상태'
SELECT nickname, role, account_status, restriction_reason FROM users WHERE role = 'ADMIN' OR account_status <> 'ACTIVE' ORDER BY role, nickname;

\echo '== 탈퇴 흔적(작성자 없음)'
SELECT '리뷰' AS 종류, count(*) FROM reviews WHERE author_kind = 'MEMBER' AND author_id IS NULL
UNION ALL SELECT '제작자 답글', count(*) FROM reviews WHERE reply_id IS NOT NULL AND reply_author_id IS NULL
UNION ALL SELECT '댓글(삭제 자리 제외)', count(*) FROM service_comments WHERE author_id IS NULL AND deleted_at IS NULL
UNION ALL SELECT '신고자', count(*) FROM reports WHERE reporter_id IS NULL
UNION ALL SELECT '초대한 사람', count(*) FROM service_invitations WHERE inviter_id IS NULL;

\echo '== 신고 상태별'
SELECT target_type, status, count(*) FROM reports GROUP BY 1, 2 ORDER BY 1, 2;

\echo '== 조치 이력 종류별'
SELECT action_type, is_automatic, count(*) FROM moderation_actions GROUP BY 1, 2 ORDER BY 1;

\echo '== 본계정 알림 종류별(안 읽음/전체)'
SELECT notification_type, count(*) FILTER (WHERE read_at IS NULL) AS 안읽음, count(*) AS 전체
FROM notifications WHERE recipient_id = (SELECT user_id FROM users WHERE lower(email) = lower(:owner))
GROUP BY 1 ORDER BY 1;
