-- URL 원문·API 키는 검사 캐시에 저장하지 않는다. 정확한 URL의 SHA-256으로 결과를 재사용한다.
CREATE TABLE url_security_checks (
    url_hash varchar(64) PRIMARY KEY,
    verdict varchar(16) NOT NULL CHECK (verdict IN ('CLEAR', 'UNSAFE')),
    checked_at timestamptz NOT NULL,
    expires_at timestamptz NOT NULL,
    reachable_until timestamptz NOT NULL
);

CREATE TABLE image_upload_usage (
    object_key varchar(200) PRIMARY KEY,
    user_id uuid REFERENCES users(user_id) ON DELETE SET NULL,
    image_url text NOT NULL,
    size_bytes bigint NOT NULL CHECK (size_bytes > 0),
    issued_at timestamptz NOT NULL DEFAULT now(),
    promoted_at timestamptz,
    pending_pruned boolean NOT NULL DEFAULT false,
    retain_until timestamptz NOT NULL,
    unused_since timestamptz DEFAULT now(),
    deleting boolean NOT NULL DEFAULT false
);
CREATE INDEX ix_image_upload_cleanup ON image_upload_usage(retain_until);
CREATE UNIQUE INDEX ux_image_upload_url ON image_upload_usage(image_url);
CREATE INDEX ix_image_upload_daily ON image_upload_usage(user_id, issued_at);

ALTER TABLE services ADD COLUMN url_rechecked_at timestamptz;
