package com.example.training.reservation.dto;

import com.example.training.reservation.Reservation;
import com.fasterxml.jackson.annotation.JsonFormat;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;

/**
 * 予約のレスポンス。エンティティからの変換はfromメソッドに集約する。
 * roomName は画面側で会議室一覧と突き合わせずに表示できるようにするために含める。
 */
public record ReservationResponse(
        Long id,
        Long roomId,
        String roomName,
        LocalDate date,
        @JsonFormat(pattern = "HH:mm")
        LocalTime startTime,
        @JsonFormat(pattern = "HH:mm")
        LocalTime endTime,
        String title,
        String reserverName,
        OffsetDateTime createdAt
) {

    public static ReservationResponse from(Reservation reservation) {
        return new ReservationResponse(
                reservation.getId(),
                reservation.getRoom().getId(),
                reservation.getRoom().getName(),
                reservation.getDate(),
                reservation.getStartTime(),
                reservation.getEndTime(),
                reservation.getTitle(),
                reservation.getReserverName(),
                reservation.getCreatedAt()
        );
    }
}
