package com.example.training.common;

/**
 * 既存データと競合するため処理できない場合にServiceレイヤーから送出する例外。
 * (例: 同じ名前の会議室が既に存在する)
 */
public class ConflictException extends RuntimeException {

    public ConflictException(String message) {
        super(message);
    }
}
