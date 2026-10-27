package com.example.training.room;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RoomRepository extends JpaRepository<Room, Long> {

    List<Room> findAllByOrderByIdAsc();

    boolean existsByName(String name);

    /** 更新時の名前重複チェック用(自分自身は除く)。 */
    boolean existsByNameAndIdNot(String name, Long id);

    /**
     * 会議室を行ロック(SELECT ... FOR UPDATE)付きで取得する。
     * 同じ会議室への予約登録をトランザクション終了まで直列化するために使う(基本設計 2.1(3))。
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM Room r WHERE r.id = :id")
    Optional<Room> findByIdForUpdate(@Param("id") Long id);
}
