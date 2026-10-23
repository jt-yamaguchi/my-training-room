package com.example.training.room;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RoomRepository extends JpaRepository<Room, Long> {

    List<Room> findAllByOrderByIdAsc();

    boolean existsByName(String name);

    /** 更新時の名前重複チェック用(自分自身は除く)。 */
    boolean existsByNameAndIdNot(String name, Long id);
}
