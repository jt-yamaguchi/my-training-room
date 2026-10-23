package com.example.training.room;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;

/**
 * 会議室エンティティ。
 * DBのroomsテーブルと1対1で対応する。APIには直接公開せずDTOに変換すること。
 */
@Entity
@Table(name = "rooms")
public class Room {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 50, unique = true)
    private String name;

    @Column(nullable = false)
    private int capacity;

    @Column(length = 200)
    private String note;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    protected Room() {
        // JPAが使用するデフォルトコンストラクタ
    }

    public Room(String name, int capacity, String note) {
        this.name = name;
        this.capacity = capacity;
        this.note = note;
        this.createdAt = OffsetDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public int getCapacity() {
        return capacity;
    }

    public String getNote() {
        return note;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void update(String name, int capacity, String note) {
        this.name = name;
        this.capacity = capacity;
        this.note = note;
    }
}
