package com.example.training.common;

/**
 * リソースが存在しない場合にServiceレイヤーから送出する例外。
 */
public class NotFoundException extends RuntimeException {

    public NotFoundException(String message) {
        super(message);
    }
}
