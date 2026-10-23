-- 会議室テーブル(H2 PostgreSQL互換モードでも動く構文で書くこと)
CREATE TABLE rooms (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name       VARCHAR(50)              NOT NULL,
    capacity   INTEGER                  NOT NULL,
    note       VARCHAR(200),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_rooms_name UNIQUE (name),
    -- アプリの入力チェックに加えたDB側の防衛線
    CONSTRAINT chk_rooms_capacity CHECK (capacity >= 1)
);
