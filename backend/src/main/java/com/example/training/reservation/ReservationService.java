package com.example.training.reservation;

import com.example.training.common.BadRequestException;
import com.example.training.common.ConflictException;
import com.example.training.common.NotFoundException;
import com.example.training.reservation.dto.ReservationRequest;
import com.example.training.reservation.dto.ReservationResponse;
import com.example.training.room.Room;
import com.example.training.room.RoomRepository;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 予約のビジネスロジック。トランザクション境界はこのレイヤーに置く。
 */
@Service
@Transactional(readOnly = true)
public class ReservationService {

    private static final DateTimeFormatter TIME_FORMAT = DateTimeFormatter.ofPattern("HH:mm");

    private final ReservationRepository reservationRepository;
    private final RoomRepository roomRepository;
    private final Clock clock;

    public ReservationService(ReservationRepository reservationRepository, RoomRepository roomRepository,
            Clock clock) {
        this.reservationRepository = reservationRepository;
        this.roomRepository = roomRepository;
        this.clock = clock;
    }

    /**
     * 予約を照会する。日付指定(A-06)は会議室ID・開始時刻順、会議室指定(A-07)は日付・開始時刻順。
     * 両方指定時は AND 条件。両方省略は全件取得の用途がないため400とする。
     */
    public List<ReservationResponse> search(LocalDate date, Long roomId) {
        List<Reservation> reservations;
        if (date != null && roomId != null) {
            reservations = reservationRepository.findByDateAndRoomIdOrderByStartTimeAsc(date, roomId);
        } else if (date != null) {
            reservations = reservationRepository.findByDateOrderByRoomIdAscStartTimeAsc(date);
        } else if (roomId != null) {
            reservations = reservationRepository.findByRoomIdOrderByDateAscStartTimeAsc(roomId);
        } else {
            throw new BadRequestException("date または roomId を指定してください");
        }
        return reservations.stream()
                .map(ReservationResponse::from)
                .toList();
    }

    public ReservationResponse findById(Long id) {
        return ReservationResponse.from(getReservation(id));
    }

    /**
     * 予約を登録する(基本設計 6. 処理方式)。
     * 1. 会議室を悲観ロック付きで取得し、同じ会議室への登録を直列化する(なければ404)
     * 2. 開始日時が現在より前なら400
     * 3. 同じ会議室・同じ日付で時間帯が重なる予約があれば409(終了=開始は重ならない)
     * 4. 登録
     */
    @Transactional
    public ReservationResponse create(ReservationRequest request) {
        Room room = roomRepository.findByIdForUpdate(request.roomId())
                .orElseThrow(() -> new NotFoundException("会議室が見つかりません: id=" + request.roomId()));

        LocalDateTime start = LocalDateTime.of(request.date(), request.startTime());
        if (start.isBefore(LocalDateTime.now(clock))) {
            throw new BadRequestException("過去の日時には予約できません");
        }

        List<Reservation> overlapping = reservationRepository.findOverlapping(
                room.getId(), request.date(), request.startTime(), request.endTime());
        if (!overlapping.isEmpty()) {
            Reservation existing = overlapping.get(0);
            throw new ConflictException(room.getName() + "の "
                    + existing.getStartTime().format(TIME_FORMAT) + "〜" + existing.getEndTime().format(TIME_FORMAT)
                    + "(" + existing.getTitle() + ")と時間が重なっています");
        }

        Reservation reservation = new Reservation(room, request.date(), request.startTime(), request.endTime(),
                request.title().strip(), request.reserverName().strip(), OffsetDateTime.now(clock));
        return ReservationResponse.from(reservationRepository.save(reservation));
    }

    /**
     * 予約を取り消す。過去の予約の取り消しも制限しない(基本設計 2.5)。
     */
    @Transactional
    public void delete(Long id) {
        Reservation reservation = getReservation(id);
        reservationRepository.delete(reservation);
    }

    private Reservation getReservation(Long id) {
        return reservationRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("予約が見つかりません: id=" + id));
    }
}
