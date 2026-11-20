CREATE TABLE user_reflections (
    reflection_id uuid PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    service_id bigint REFERENCES services(service_id) ON DELETE SET NULL,
    service_name varchar(30) NOT NULL,
    title varchar(100) NOT NULL,
    body text NOT NULL,
    revision uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT ck_reflection_title CHECK (char_length(trim(title)) BETWEEN 1 AND 100),
    CONSTRAINT ck_reflection_body CHECK (char_length(trim(body)) BETWEEN 1 AND 10000)
);
CREATE INDEX ix_user_reflections_recent ON user_reflections(user_id, updated_at DESC, reflection_id);
