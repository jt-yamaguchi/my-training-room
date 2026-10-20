# training-room — 会議室予約システム(課題リポジトリ)

**このリポジトリに実装はまだ入っていません。** 基盤(インフラ・規約・docs)と課題文書だけが入った状態から、
お手本リポジトリ **training-task** と同じアーキテクチャで 会議室予約システム をAIとともに構築します。

| 項目 | 内容 |
|---|---|
| 支給されるもの | 要求定義+要件定義(基本設計から受講者が作成) → [docs/assignment/room/](./docs/assignment/room/) |
| お手本 | コード: training-task を隣に clone して参照 / 設計書: [docs/design/task/](./docs/design/task/)(同梱) |
| 開発ルール | [CLAUDE.md](./CLAUDE.md)(タスク管理と同一ルール) |
| 進め方 | [docs/repos-guide.md](./docs/repos-guide.md) と [docs/training-flow.md](./docs/training-flow.md) Phase 7 の流れを反復 |

## 技術スタック

| 領域 | 技術 |
|---|---|
| frontend | React 18 / TypeScript 5 / Vite 5 |
| backend | Java 17 / Spring Boot 3.3 / Maven |
| DB | PostgreSQL 16 / Flyway |
| 本番 | Docker Compose / nginx / AWS Lightsail |

## 起動手順(プレースホルダの確認)

```bash
bash scripts/doctor.sh        # 0. 環境診断(全部 OK になること)
cp .env.example .env          # 1. 環境変数ファイルを作成
docker compose up -d          # 2. DB を起動
cd backend && ./mvnw spring-boot:run    # 3. backend(ターミナル1) ※mvnwが無い場合: mvn spring-boot:run
cd frontend && npm install && npm run dev   # 4. frontend(ターミナル2)
```

- http://localhost:5173 にプレースホルダ画面が表示されれば準備OK
- ここから先は docs/assignment/ の課題文書 → 設計 → 実装 の順で進めます

## 品質チェック(コミット前に実行)

```bash
cd backend && ./mvnw verify                      # テスト + Checkstyle + ArchUnit
cd frontend && npm run lint && npm test && npm run build
```

## お手本(タスク管理)の参照方法

```bash
cd ~/projects
git clone https://github.com/<Organization>/training-task.git   # 読むだけ。変更しない
```

Claude Code への指示例:

> `~/projects/training-task` がお手本リポジトリです。その構成・作法を模倣して、docs/assignment/ の要件を実装してください。CLAUDE.md のルールに従うこと。

## ディレクトリ構成

```
├── CLAUDE.md               # AIへの開発ルール(最重要)
├── docker-compose.yml      # 開発用(DBのみ)
├── docker-compose.lp.yml   # LPのみをHTTPS公開する構成
├── docker-compose.prod.yml # 本番用(アプリ+LPを同居配信)
├── lp/                     # 紹介LP(この課題の紹介に書き換える)
├── backend/                # Spring Boot(common/ のみ。機能パッケージはここに作る)
├── frontend/               # React + Vite(プレースホルダ。ここに画面を作る)
├── web/                    # 本番配信用(nginx設定 + Dockerfile)
├── scripts/doctor.sh       # 環境診断
└── docs/                   # 課題文書 / 設計書お手本 / 手順書一式
```
