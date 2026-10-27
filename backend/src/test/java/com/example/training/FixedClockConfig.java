package com.example.training;

import com.example.training.common.ClockConfig;
import java.time.Clock;
import java.time.ZonedDateTime;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;

/**
 * テスト用に現在時刻を固定する。現在 = {@link #NOW}(日本時間)。
 * 「過去日時の予約」「未来の予約がある会議室」などの判定を日付に依存せず検証するため。
 */
@TestConfiguration
public class FixedClockConfig {

    public static final ZonedDateTime NOW = ZonedDateTime.of(2026, 11, 2, 10, 0, 0, 0, ClockConfig.ZONE);

    @Bean
    @Primary
    public Clock fixedClock() {
        return Clock.fixed(NOW.toInstant(), ClockConfig.ZONE);
    }
}
