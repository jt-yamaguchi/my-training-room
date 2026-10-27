package com.example.training.reservation;

import static org.hamcrest.Matchers.notNullValue;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.training.FixedClockConfig;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

/**
 * 予約APIの結合テスト。H2(PostgreSQL互換モード)+ Flyway で実行される。
 * 現在時刻は FixedClockConfig で 2026-11-02 10:00(日本時間)に固定している。
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(FixedClockConfig.class)
@Transactional
class ReservationApiTest {

    private static final String TODAY = "2026-11-02";
    private static final String TOMORROW = "2026-11-03";
    private static final String DAY_AFTER_TOMORROW = "2026-11-04";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private Integer roomA;
    private Integer roomB;

    @BeforeEach
    void setUp() throws Exception {
        roomA = createRoom("A会議室");
        roomB = createRoom("B会議室");
    }

    // ---- 登録(A-09) ----

    @Test
    void 予約を登録できる() throws Exception {
        postReservation(roomA, TOMORROW, "10:00", "11:00", "定例会議", "山田")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.roomId").value(roomA))
                .andExpect(jsonPath("$.roomName").value("A会議室"))
                .andExpect(jsonPath("$.date").value(TOMORROW))
                .andExpect(jsonPath("$.startTime").value("10:00"))
                .andExpect(jsonPath("$.endTime").value("11:00"))
                .andExpect(jsonPath("$.title").value("定例会議"))
                .andExpect(jsonPath("$.reserverName").value("山田"))
                .andExpect(jsonPath("$.createdAt").value(notNullValue()));
    }

    @Test
    void 件名と予約者名の前後の空白は除いて登録される() throws Exception {
        postReservation(roomA, TOMORROW, "10:00", "11:00", "  定例会議  ", " 山田 ")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value("定例会議"))
                .andExpect(jsonPath("$.reserverName").value("山田"));
    }

    @Test
    void 同じ会議室で時間帯が重なる予約は409になり_予約は増えない() throws Exception {
        postReservation(roomA, TOMORROW, "10:00", "11:00", "定例会議", "山田").andExpect(status().isCreated());

        postReservation(roomA, TOMORROW, "10:30", "11:30", "打合せ", "佐藤")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("A会議室の 10:00〜11:00(定例会議)と時間が重なっています"));

        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM reservations WHERE room_id = ?", Integer.class, roomA);
        assertEquals(1, count);
    }

    @Test
    void 既存の予約を内側に含む時間帯も重複として409になる() throws Exception {
        postReservation(roomA, TOMORROW, "10:00", "11:00", "定例会議", "山田").andExpect(status().isCreated());

        postReservation(roomA, TOMORROW, "09:00", "12:00", "研修", "佐藤")
                .andExpect(status().isConflict());
        postReservation(roomA, TOMORROW, "10:15", "10:45", "打合せ", "佐藤")
                .andExpect(status().isConflict());
    }

    @Test
    void 終了時刻と開始時刻が同じ予約は重複しないので登録できる() throws Exception {
        postReservation(roomA, TOMORROW, "10:00", "11:00", "定例会議", "山田").andExpect(status().isCreated());

        postReservation(roomA, TOMORROW, "11:00", "12:00", "打合せ", "佐藤").andExpect(status().isCreated());
        postReservation(roomA, TOMORROW, "09:00", "10:00", "朝会", "鈴木").andExpect(status().isCreated());
    }

    @Test
    void 別の会議室なら同じ時間帯でも登録できる() throws Exception {
        postReservation(roomA, TOMORROW, "10:00", "11:00", "定例会議", "山田").andExpect(status().isCreated());

        postReservation(roomB, TOMORROW, "10:30", "11:30", "打合せ", "佐藤").andExpect(status().isCreated());
    }

    @Test
    void 別の日付なら同じ時間帯でも登録できる() throws Exception {
        postReservation(roomA, TOMORROW, "10:00", "11:00", "定例会議", "山田").andExpect(status().isCreated());

        postReservation(roomA, DAY_AFTER_TOMORROW, "10:00", "11:00", "定例会議", "山田")
                .andExpect(status().isCreated());
    }

    @Test
    void 終了時刻が開始時刻より前だと400になる() throws Exception {
        postReservation(roomA, TOMORROW, "11:00", "10:00", "定例会議", "山田")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").exists());
    }

    @Test
    void 終了時刻が開始時刻と同じだと400になる() throws Exception {
        postReservation(roomA, TOMORROW, "10:00", "10:00", "定例会議", "山田")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").exists());
    }

    @Test
    void 時刻が15分単位でないと400になる() throws Exception {
        postReservation(roomA, TOMORROW, "10:10", "11:00", "定例会議", "山田")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").exists());
        postReservation(roomA, TOMORROW, "10:00", "11:05", "定例会議", "山田")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").exists());
    }

    @Test
    void 時刻に秒が含まれると400になる() throws Exception {
        postReservation(roomA, TOMORROW, "10:00:30", "11:00", "定例会議", "山田")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").exists());
    }

    @Test
    void 日付や時刻の形式が不正だと400になる() throws Exception {
        postReservation(roomA, "2026/11/03", "10:00", "11:00", "定例会議", "山田")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").exists());
        postReservation(roomA, TOMORROW, "25:00", "26:00", "定例会議", "山田")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").exists());
    }

    @Test
    void 開始日時が現在より前だと400になる() throws Exception {
        postReservation(roomA, TODAY, "09:45", "10:30", "定例会議", "山田")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("過去の日時には予約できません"));
        postReservation(roomA, "2026-11-01", "15:00", "16:00", "定例会議", "山田")
                .andExpect(status().isBadRequest());
    }

    @Test
    void 開始日時が現在ちょうどなら登録できる() throws Exception {
        postReservation(roomA, TODAY, "10:00", "10:30", "定例会議", "山田")
                .andExpect(status().isCreated());
    }

    @Test
    void 存在しない会議室への予約は404になる() throws Exception {
        postReservation(99999, TOMORROW, "10:00", "11:00", "定例会議", "山田")
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").exists());
    }

    @Test
    void 必須項目が未指定だと400になる() throws Exception {
        mockMvc.perform(post("/api/reservations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").exists());
    }

    @Test
    void 件名や予約者名が空だと400になる() throws Exception {
        postReservation(roomA, TOMORROW, "10:00", "11:00", " ", "山田")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").exists());
        postReservation(roomA, TOMORROW, "10:00", "11:00", "定例会議", "")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").exists());
    }

    @Test
    void 件名は100文字_予約者名は50文字まで登録できる() throws Exception {
        postReservation(roomA, TOMORROW, "10:00", "11:00", "あ".repeat(100), "い".repeat(50))
                .andExpect(status().isCreated());
    }

    @Test
    void 件名が101文字だと400になる() throws Exception {
        postReservation(roomA, TOMORROW, "10:00", "11:00", "あ".repeat(101), "山田")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").exists());
    }

    @Test
    void 予約者名が51文字だと400になる() throws Exception {
        postReservation(roomA, TOMORROW, "10:00", "11:00", "定例会議", "い".repeat(51))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").exists());
    }

    // ---- 1件取得(A-08) ----

    @Test
    void 予約を1件取得できる() throws Exception {
        Integer id = createReservation(roomA, TOMORROW, "10:00", "11:00");

        mockMvc.perform(get("/api/reservations/" + id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id))
                .andExpect(jsonPath("$.roomName").value("A会議室"));
    }

    @Test
    void 存在しない予約の取得は404になる() throws Exception {
        mockMvc.perform(get("/api/reservations/99999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").exists());
    }

    /** 会議室を登録し、そのIDを返す。 */
    private Integer createRoom(String name) throws Exception {
        String body = mockMvc.perform(post("/api/rooms")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\": \"" + name + "\", \"capacity\": 6, \"note\": null}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.id");
    }

    /** 予約を登録し、そのIDを返す。 */
    private Integer createReservation(Integer roomId, String date, String startTime, String endTime)
            throws Exception {
        String body = postReservation(roomId, date, startTime, endTime, "定例会議", "山田")
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.id");
    }

    private ResultActions postReservation(Integer roomId, String date, String startTime, String endTime,
            String title, String reserverName) throws Exception {
        return mockMvc.perform(post("/api/reservations")
                .contentType(MediaType.APPLICATION_JSON)
                .content(reservationJson(roomId, date, startTime, endTime, title, reserverName)));
    }

    private static String reservationJson(Integer roomId, String date, String startTime, String endTime,
            String title, String reserverName) {
        return "{\"roomId\": " + roomId
                + ", \"date\": \"" + date + "\""
                + ", \"startTime\": \"" + startTime + "\""
                + ", \"endTime\": \"" + endTime + "\""
                + ", \"title\": \"" + title + "\""
                + ", \"reserverName\": \"" + reserverName + "\"}";
    }
}
