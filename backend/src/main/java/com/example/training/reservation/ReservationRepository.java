package com.example.training.reservation;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ReservationRepository extends JpaRepository<Reservation, Long> {

    // 予約の照会(A-06 / A-07)。表示に会議室名を使うため会議室も同時に取得する(N+1回避)
    @EntityGraph(attributePaths = "room")
    List<Reservation> findByDateOrderByRoomIdAscStartTimeAsc(LocalDate date);

    @EntityGraph(attributePaths = "room")
    List<Reservation> findByRoomIdOrderByDateAscStartTimeAsc(Long roomId);

    @EntityGraph(attributePaths = "room")
    List<Reservation> findByDateAndRoomIdOrderByStartTimeAsc(LocalDate date, Long roomId);

    /**
     * 時間帯が重なる予約(半開区間: 既存.開始 < 新規.終了 AND 新規.開始 < 既存.終了。基本設計 2.1)。
     * 終了時刻=次の開始時刻は重ならない。
     */
    @Query("""
            SELECT r FROM Reservation r
            WHERE r.room.id = :roomId
              AND r.date = :date
              AND r.startTime < :endTime
              AND :startTime < r.endTime
            ORDER BY r.startTime
            """)
    List<Reservation> findOverlapping(@Param("roomId") Long roomId, @Param("date") LocalDate date,
            @Param("startTime") LocalTime startTime, @Param("endTime") LocalTime endTime);

    /**
     * 終了日時が現在より後(進行中を含む)の予約があるか。会議室の削除可否の判定に使う(基本設計 2.5)。
     */
    @Query("""
            SELECT CASE WHEN COUNT(r) > 0 THEN true ELSE false END FROM Reservation r
            WHERE r.room.id = :roomId
              AND (r.date > :today OR (r.date = :today AND r.endTime > :now))
            """)
    boolean existsNotFinished(@Param("roomId") Long roomId, @Param("today") LocalDate today,
            @Param("now") LocalTime now);
}
