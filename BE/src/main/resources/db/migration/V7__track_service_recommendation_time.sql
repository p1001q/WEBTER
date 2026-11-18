ALTER TABLE reviews ADD COLUMN recommended_at TIMESTAMPTZ;

COMMENT ON COLUMN reviews.recommended_at IS '현재 추천 평가를 선택한 시각';
