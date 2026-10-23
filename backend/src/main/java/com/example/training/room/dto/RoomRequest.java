package com.example.training.room.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * 会議室の登録・更新リクエスト。
 * name は前後の空白を除いた値で登録・重複判定する。note は前後の空白を除き、空なら null とする(Serviceで変換)。
 */
public record RoomRequest(
        @NotBlank(message = "会議室名は必須です")
        @Size(max = 50, message = "会議室名は50文字以内で入力してください")
        String name,

        @NotNull(message = "定員は必須です")
        @Min(value = 1, message = "定員は1以上で入力してください")
        Integer capacity,

        @Size(max = 200, message = "備考は200文字以内で入力してください")
        String note
) {
}
