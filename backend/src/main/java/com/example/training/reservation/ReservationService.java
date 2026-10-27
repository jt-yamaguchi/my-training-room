package com.example.training.reservation;

import com.example.training.common.BadRequestException;
import com.example.training.common.ConflictException;
import com.example.training.common.NotFoundException;
import com.example.training.reservation.dto.ReservationRequest;
import com.example.training.reservation.dto.ReservationResponse;
import com.example.training.room.Room;
import com.example.training.room.RoomRepository;
import java.time.Clock;
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

    private Reservation getReservation(Long id) {
        return reservationRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("予約が見つかりません: id=" + id));
    }
}
