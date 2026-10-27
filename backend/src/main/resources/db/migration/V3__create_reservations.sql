-- 予約テーブル(H2 PostgreSQL互換モードでも動く構文で書くこと)
-- 日付+開始/終了時刻で持ち、日をまたぐ予約は扱わない(基本設計 2.3)
CREATE TABLE reservations (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    room_id          BIGINT                   NOT NULL,
    reservation_date DATE                     NOT NULL,
    start_time       TIME                     NOT NULL,
    end_time         TIME                     NOT NULL,
    title            VARCHAR(100)             NOT NULL,
    reserver_name    VARCHAR(50)              NOT NULL,
    created_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- 会議室の削除時は過去の予約も一緒に削除する(未来の予約がある会議室の削除はアプリで拒否する。基本設計 2.5)
    CONSTRAINT fk_reservations_room FOREIGN KEY (room_id) REFERENCES rooms (id) ON DELETE CASCADE,
    -- アプリの入力チェックに加えたDB側の防衛線
    CONSTRAINT chk_reservations_time CHECK (start_time < end_time)
);

-- 重複判定・会議室別照会用
CREATE INDEX idx_reservations_room_date ON reservations (room_id, reservation_date);
-- 日別照会用
CREATE INDEX idx_reservations_date ON reservations (reservation_date);
