package com.example.training.common;

/**
 * 入力値は形式上正しいが、現在時刻やリクエストの組み合わせにより受け付けられない場合にServiceレイヤーから送出する例外。
 * (例: 過去の日時への予約、照会条件の指定なし)
 */
public class BadRequestException extends RuntimeException {

    public BadRequestException(String message) {
        super(message);
    }
}
