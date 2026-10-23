package com.example.training.room.dto;

import com.example.training.room.Room;
import java.time.OffsetDateTime;

/**
 * 会議室のレスポンス。エンティティからの変換はfromメソッドに集約する。
 * note は未入力の場合 null。
 */
public record RoomResponse(
        Long id,
        String name,
        int capacity,
        String note,
        OffsetDateTime createdAt
) {

    public static RoomResponse from(Room room) {
        return new RoomResponse(
                room.getId(),
                room.getName(),
                room.getCapacity(),
                room.getNote(),
                room.getCreatedAt()
        );
    }
}
