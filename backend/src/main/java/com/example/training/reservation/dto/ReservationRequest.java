package com.example.training.reservation.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.time.LocalTime;

/**
 * 予約の登録リクエスト。date は yyyy-MM-dd、startTime / endTime は HH:mm で受け取る。
 * 時刻は15分単位(基本設計 2.2)、終了は開始より後であること(F-2-2)を相関チェックする。
 * title / reserverName は前後の空白を除いた値で登録する(Serviceで変換)。
 * 過去日時・重複・会議室の存在はDBや現在時刻に依存するため Service で判定する。
 */
public record ReservationRequest(
        @NotNull(message = "会議室は必須です")
        Long roomId,

        @NotNull(message = "日付は必須です")
        LocalDate date,

        @NotNull(message = "開始時刻は必須です")
        LocalTime startTime,

        @NotNull(message = "終了時刻は必須です")
        LocalTime endTime,

        @NotBlank(message = "件名は必須です")
        @Size(max = 100, message = "件名は100文字以内で入力してください")
        String title,

        @NotBlank(message = "予約者名は必須です")
        @Size(max = 50, message = "予約者名は50文字以内で入力してください")
        String reserverName
) {

    private static final int TIME_UNIT_MINUTES = 15;

    @JsonIgnore
    @AssertTrue(message = "開始時刻は15分単位で指定してください")
    public boolean isStartTimeInUnit() {
        return startTime == null || isInUnit(startTime);
    }

    @JsonIgnore
    @AssertTrue(message = "終了時刻は15分単位で指定してください")
    public boolean isEndTimeInUnit() {
        return endTime == null || isInUnit(endTime);
    }

    @JsonIgnore
    @AssertTrue(message = "終了時刻は開始時刻より後にしてください")
    public boolean isEndTimeAfterStartTime() {
        return startTime == null || endTime == null || endTime.isAfter(startTime);
    }

    private static boolean isInUnit(LocalTime time) {
        return time.getMinute() % TIME_UNIT_MINUTES == 0 && time.getSecond() == 0 && time.getNano() == 0;
    }
}
