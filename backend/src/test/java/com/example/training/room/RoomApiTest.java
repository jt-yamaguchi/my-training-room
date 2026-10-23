package com.example.training.room;

import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

/**
 * 会議室APIの結合テスト。H2(PostgreSQL互換モード)+ Flyway で実行される。
 * 初期データはないため、各テストで必要な会議室を登録してから検証する。
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class RoomApiTest {

    @Autowired
    private MockMvc mockMvc;

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
