package com.example.training.room;

import com.example.training.common.ConflictException;
import com.example.training.common.NotFoundException;
import com.example.training.room.dto.RoomRequest;
import com.example.training.room.dto.RoomResponse;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 会議室のビジネスロジック。トランザクション境界はこのレイヤーに置く。
 */
@Service
@Transactional(readOnly = true)
public class RoomService {

    private final RoomRepository roomRepository;

    public RoomService(RoomRepository roomRepository) {
        this.roomRepository = roomRepository;
    }

    public List<RoomResponse> findAll() {
        return roomRepository.findAllByOrderByIdAsc().stream()
                .map(RoomResponse::from)
                .toList();
    }

    public RoomResponse findById(Long id) {
        return RoomResponse.from(getRoom(id));
    }

    /**
     * 会議室を登録する。名前は前後の空白を除いてから登録し、同じ名前が既にあれば409とする。
     */
    @Transactional
    public RoomResponse create(RoomRequest request) {
        String name = request.name().strip();
        if (roomRepository.existsByName(name)) {
            throw new ConflictException("同じ名前の会議室が既にあります: " + name);
        }
        Room room = new Room(name, request.capacity(), normalizeNote(request.note()));
        return RoomResponse.from(roomRepository.save(room));
    }

    /**
     * 会議室を更新する。自分以外に同じ名前の会議室があれば409とする(名前を変えない更新は可)。
     */
    @Transactional
    public RoomResponse update(Long id, RoomRequest request) {
        Room room = getRoom(id);
        String name = request.name().strip();
        if (roomRepository.existsByNameAndIdNot(name, id)) {
            throw new ConflictException("同じ名前の会議室が既にあります: " + name);
        }
        room.update(name, request.capacity(), normalizeNote(request.note()));
        return RoomResponse.from(room);
    }

    /**
     * 会議室を削除する。
     * 未来の予約がある会議室の削除拒否(409)は、予約機能(reservations テーブル)の追加時に実装する。
     */
    @Transactional
    public void delete(Long id) {
        Room room = getRoom(id);
        roomRepository.delete(room);
    }

    /** 備考は前後の空白を除き、空なら未入力(null)として扱う。 */
    private static String normalizeNote(String note) {
        if (note == null || note.isBlank()) {
            return null;
        }
        return note.strip();
    }

    private Room getRoom(Long id) {
        return roomRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("会議室が見つかりません: id=" + id));
    }
}
