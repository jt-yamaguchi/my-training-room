package com.example.training.room;

import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.training.FixedClockConfig;
import com.jayway.jsonpath.JsonPath;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

/**
 * 会議室APIの結合テスト。H2(PostgreSQL互換モード)+ Flyway で実行される。
 * 初期データはないため、各テストで必要な会議室を登録してから検証する。
 * 現在時刻は FixedClockConfig で 2026-11-02 10:00(日本時間)に固定している。
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(FixedClockConfig.class)
@Transactional
class RoomApiTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private EntityManager entityManager;

    @Test
    void 会議室を登録できる() throws Exception {
        mockMvc.perform(post("/api/rooms")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(roomJson("A会議室", 6, "モニタあり")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.name").value("A会議室"))
                .andExpect(jsonPath("$.capacity").value(6))
                .andExpect(jsonPath("$.note").value("モニタあり"))
                .andExpect(jsonPath("$.createdAt").value(notNullValue()));
    }

    @Test
    void 会議室一覧をID昇順で取得できる() throws Exception {
        createRoom("A会議室", 6);
        createRoom("B会議室", 10);

        mockMvc.perform(get("/api/rooms"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].name").value("A会議室"))
                .andExpect(jsonPath("$[1].name").value("B会議室"));
    }

    @Test
    void 会議室を1件取得できる() throws Exception {
        Integer id = createRoom("A会議室", 6);

        mockMvc.perform(get("/api/rooms/" + id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id))
                .andExpect(jsonPath("$.name").value("A会議室"));
    }

    @Test
    void 存在しない会議室の取得は404になる() throws Exception {
        mockMvc.perform(get("/api/rooms/99999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").exists());
    }

    @Test
    void IDが数値でないと400になる() throws Exception {
        mockMvc.perform(get("/api/rooms/abc"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").exists());
    }

    @Test
    void 会議室名と備考の前後の空白は除いて登録され_空白だけの備考は未入力になる() throws Exception {
        mockMvc.perform(post("/api/rooms")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(roomJson("  A会議室  ", 6, "   ")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("A会議室"))
                .andExpect(jsonPath("$.note").value(nullValue()));
    }

    @Test
    void 備考は省略できる() throws Exception {
        mockMvc.perform(post("/api/rooms")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\": \"A会議室\", \"capacity\": 6}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.note").value(nullValue()));
    }

    @Test
    void 会議室名が空だと400になる() throws Exception {
        mockMvc.perform(post("/api/rooms")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(roomJson("", 6, null)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").exists());
    }

    @Test
    void 会議室名は50文字まで登録できる() throws Exception {
        mockMvc.perform(post("/api/rooms")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(roomJson("あ".repeat(50), 6, null)))
                .andExpect(status().isCreated());
    }

    @Test
    void 会議室名が51文字だと400になる() throws Exception {
        mockMvc.perform(post("/api/rooms")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(roomJson("あ".repeat(51), 6, null)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").exists());
    }

    @Test
    void 定員が未指定だと400になる() throws Exception {
        mockMvc.perform(post("/api/rooms")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\": \"A会議室\", \"note\": null}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").exists());
    }

    @Test
    void 定員は1から登録できる() throws Exception {
        mockMvc.perform(post("/api/rooms")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(roomJson("A会議室", 1, null)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.capacity").value(1));
    }

    @Test
    void 定員が0だと400になる() throws Exception {
        mockMvc.perform(post("/api/rooms")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(roomJson("A会議室", 0, null)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").exists());
    }

    @Test
    void 定員が整数でないと400になる() throws Exception {
        mockMvc.perform(post("/api/rooms")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\": \"A会議室\", \"capacity\": \"六\", \"note\": null}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").exists());
    }

    @Test
    void 備考は200文字まで登録できる() throws Exception {
        mockMvc.perform(post("/api/rooms")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(roomJson("A会議室", 6, "あ".repeat(200))))
                .andExpect(status().isCreated());
    }

    @Test
    void 備考が201文字だと400になる() throws Exception {
        mockMvc.perform(post("/api/rooms")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(roomJson("A会議室", 6, "あ".repeat(201))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").exists());
    }

    @Test
    void 同じ名前の会議室は登録できず409になる() throws Exception {
        createRoom("A会議室", 6);

        mockMvc.perform(post("/api/rooms")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(roomJson(" A会議室 ", 10, null)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("同じ名前の会議室が既にあります: A会議室"));

        mockMvc.perform(get("/api/rooms"))
                .andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    void 会議室を更新できる() throws Exception {
        Integer id = createRoom("A会議室", 6);

        mockMvc.perform(put("/api/rooms/" + id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(roomJson("A会議室(大)", 12, "プロジェクターあり")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id))
                .andExpect(jsonPath("$.name").value("A会議室(大)"))
                .andExpect(jsonPath("$.capacity").value(12))
                .andExpect(jsonPath("$.note").value("プロジェクターあり"));

        mockMvc.perform(get("/api/rooms/" + id))
                .andExpect(jsonPath("$.name").value("A会議室(大)"));
    }

    @Test
    void 名前を変えずに更新できる() throws Exception {
        Integer id = createRoom("A会議室", 6);

        mockMvc.perform(put("/api/rooms/" + id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(roomJson("A会議室", 8, null)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.capacity").value(8));
    }

    @Test
    void 他の会議室と同じ名前への更新は409になる() throws Exception {
        createRoom("A会議室", 6);
        Integer id = createRoom("B会議室", 10);

        mockMvc.perform(put("/api/rooms/" + id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(roomJson("A会議室", 10, null)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").exists());
    }

    @Test
    void 更新時も入力チェックされ400になる() throws Exception {
        Integer id = createRoom("A会議室", 6);

        mockMvc.perform(put("/api/rooms/" + id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(roomJson("A会議室", 0, null)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").exists());
    }

    @Test
    void 存在しない会議室の更新は404になる() throws Exception {
        mockMvc.perform(put("/api/rooms/99999")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(roomJson("A会議室", 6, null)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").exists());
    }

    @Test
    void 会議室を削除できる() throws Exception {
        Integer id = createRoom("A会議室", 6);

        mockMvc.perform(delete("/api/rooms/" + id))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/rooms/" + id))
                .andExpect(status().isNotFound());
    }

    @Test
    void 存在しない会議室の削除は404になる() throws Exception {
        mockMvc.perform(delete("/api/rooms/99999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").exists());
    }

    @Test
    void 未来の予約がある会議室の削除は409になり_会議室は残る() throws Exception {
        Integer id = createRoom("A会議室", 6);
        insertReservation(id, "2026-11-03", "10:00", "11:00");

        mockMvc.perform(delete("/api/rooms/" + id))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("A会議室には未来の予約があるため削除できません"));

        mockMvc.perform(get("/api/rooms/" + id))
                .andExpect(status().isOk());
    }

    @Test
    void 進行中の予約がある会議室の削除は409になる() throws Exception {
        Integer id = createRoom("A会議室", 6);
        insertReservation(id, "2026-11-02", "09:30", "10:30");

        mockMvc.perform(delete("/api/rooms/" + id))
                .andExpect(status().isConflict());
    }

    @Test
    void 過去の予約しかない会議室は削除でき_過去の予約も削除される() throws Exception {
        Integer id = createRoom("A会議室", 6);
        insertReservation(id, "2026-11-01", "10:00", "11:00");
        // 終了時刻ちょうど(現在 10:00)の予約は終了済みとして扱う
        insertReservation(id, "2026-11-02", "09:00", "10:00");

        mockMvc.perform(delete("/api/rooms/" + id))
                .andExpect(status().isNoContent());

        // テストは1トランザクション内で動くため、削除をDBへ反映してから件数を確認する
        entityManager.flush();
        Integer remaining = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM reservations WHERE room_id = ?", Integer.class, id);
        assertEquals(0, remaining);
    }

    /**
     * 予約をDBへ直接登録する。過去・進行中の予約はAPIからは登録できない(過去日時は400)ため。
     */
    private void insertReservation(Integer roomId, String date, String startTime, String endTime) {
        jdbcTemplate.update("""
                INSERT INTO reservations (room_id, reservation_date, start_time, end_time, title, reserver_name)
                VALUES (?, CAST(? AS DATE), CAST(? AS TIME), CAST(? AS TIME), '定例会議', '山田')
                """, roomId, date, startTime, endTime);
    }

    /** 会議室を登録し、そのIDを返す。 */
    private Integer createRoom(String name, int capacity) throws Exception {
        String body = mockMvc.perform(post("/api/rooms")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(roomJson(name, capacity, null)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.id");
    }

    private static String roomJson(String name, int capacity, String note) {
        String noteJson = note == null ? "null" : "\"" + note + "\"";
        return "{\"name\": \"" + name + "\", \"capacity\": " + capacity + ", \"note\": " + noteJson + "}";
    }
}
