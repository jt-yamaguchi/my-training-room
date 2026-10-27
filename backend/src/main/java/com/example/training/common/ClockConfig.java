package com.example.training.common;

import java.time.Clock;
import java.time.ZoneId;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * 現在時刻の取得元。業務上の時刻はすべて日本時間(Asia/Tokyo)の壁時計時刻として扱う(基本設計 2.3)。
 * Bean にしておくことで、テストでは固定時刻の Clock に差し替えられる。
 */
@Configuration
public class ClockConfig {

    public static final ZoneId ZONE = ZoneId.of("Asia/Tokyo");

    @Bean
    public Clock clock() {
        return Clock.system(ZONE);
    }
}
