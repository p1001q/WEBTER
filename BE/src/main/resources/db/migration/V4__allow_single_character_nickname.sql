-- 닉네임은 최소 1글자부터 허용한다(정책서 2.1: 가중 길이 16칸 이내, 최소 1글자).
-- 형식·가중 길이는 애플리케이션에서 검증하고, DB는 길이 1~20자와 앞뒤 공백 없음만 지킨다.
-- V1의 CHECK는 이름이 없어 정의로 찾아 교체한다.

DO $$
DECLARE
  check_name text;
BEGIN
  SELECT conname INTO check_name
  FROM pg_constraint
  WHERE conrelid = 'users'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%char_length%'
    AND pg_get_constraintdef(oid) LIKE '%nickname%';
  EXECUTE format('ALTER TABLE users DROP CONSTRAINT %I', check_name);
END $$;

ALTER TABLE users
  ADD CONSTRAINT ck_users_nickname
  CHECK (nickname IS NULL OR (char_length(nickname) BETWEEN 1 AND 20 AND nickname = btrim(nickname)));
