# CLAUDE.md — 開発ルール(必読)

このリポジトリは**会議室予約システム**を構築するための課題リポジトリです(実装はまだ入っていません)。お手本リポジトリ **training-task** の構成・作法を**厳密に模倣**して実装してください。

## 技術スタック(バージョン厳守)

| 領域 | 技術 | バージョン |
|---|---|---|
| バックエンド | Java / Spring Boot / Maven | 17 / 3.3系 / mvnw |
| フロントエンド | React / TypeScript / Vite | 18系 / 5系 / 5系 |
| DB | PostgreSQL / Flyway | 16 / 連番SQL |
| API定義 | OpenAPI 3 (springdoc) | 自動生成 |

**禁止**: Java 21+の新構文(record patterns等は不可。record自体はDTOで使用可)、React 19の新機能(use, Server Components等)、クラスコンポーネント。

## LP(lp/site)

- 紹介LPは `lp/site/` の静的HTML/CSSのみで構成する。JavaScript・ビルドツール・フレームワークの導入は禁止(「裏の動きのない静的サイト」であることが研修上の意味を持つ)
- LPはレイヤードアーキテクチャや ArchUnit の対象外

## アーキテクチャ(backend)

レイヤードアーキテクチャ。依存方向は一方通行: `controller → service → repository → entity`
以下は**お手本(training-task)**の構成です。この形をこのリポジトリで再現します。

```
backend/src/main/java/com/example/training/
├── task/                 # 機能単位のパッケージ(新機能はこの形を複製)
│   ├── TaskController.java   # HTTP入出力のみ。ロジック禁止
│   ├── TaskService.java      # ビジネスロジック。@Transactional はここ
│   ├── TaskRepository.java   # Spring Data JPA interface
│   ├── Task.java             # JPAエンティティ。APIに直接公開しない
│   └── dto/                  # リクエスト/レスポンスDTO(record)
└── common/               # 横断的関心事(例外ハンドラ等)
```

- レイヤー違反は `ArchitectureTest` がCIで検出して失敗させる
- エンティティをControllerの引数・戻り値にしない。必ずDTOで変換する
- バリデーションはDTOに Bean Validation アノテーションで記述する
- **新機能の追加は `docs/architecture-guide.md` の「新機能追加のレシピ」の順序(API設計 → マイグレーション → Entity → … → テスト)に従うこと**

## DB変更のルール

- スキーマ変更は必ず `backend/src/main/resources/db/migration/` に `V{次の連番}__{説明}.sql` を追加する(このリポでは `V1__init.sql` が予約済みのため、最初のテーブルは `V2__` から)
- **適用済みマイグレーションファイルの編集・削除は禁止**(新しいVファイルで変更する)
- `spring.jpa.hibernate.ddl-auto` は `validate` 固定。`update` や `create` への変更は禁止
- DDLはH2(PostgreSQL互換モード)でも動く構文で書く(`BIGINT GENERATED ALWAYS AS IDENTITY` 等)

## API のルール

- REST。パスは `/api/{リソース複数形}`(例: `/api/tasks`, `/api/tasks/{id}`)
- 実装フロー: 先にエンドポイント設計(パス・メソッド・DTO)を提示 → 合意後に実装
- エラーは `GlobalExceptionHandler` の形式に従う(`{"message": "..."}`)
- **フロントからのAPI呼び出しは相対パス `/api/...` のみ**。`http://localhost:8080` や `http://backend:8080` のような絶対URLをコードに書くことは禁止(Vite proxy / nginx が転送する)

## フロントエンドのルール

- 関数コンポーネント + hooks のみ。1ファイル1コンポーネント
- API呼び出しは `src/api/` に集約し、コンポーネントから直接 fetch しない
- 型は `src/api/types.ts` に定義。`any` の使用禁止
- スタイルは `src/index.css` のCSSクラスを使用(CSSフレームワーク追加は禁止)

## テスト(実装とセットで必ず書く)

- backend: JUnit 5。Service/APIテストはお手本リポ(training-task)の `TaskApiTest` を模倣(H2使用)
- frontend: Vitest + Testing Library。お手本リポ(training-task)の `App.test.tsx` を模倣
- テストなしの機能追加はレビューで差し戻される

## 環境・設定のルール

- 環境依存値(DB接続先等)は環境変数で外出しする。`application.yml` にハードコード禁止
- `.env` の実値をコミットしない(`.env.example` を更新する)
- 新しいライブラリの追加は、追加理由を提示して人間の承認を得てから行う

## 設計ドキュメントのルール

- 設計書はシステム単位で `docs/design/{システム名}/` に置く(例: タスク管理は `docs/design/task/`)。各システムとも4文書構成(要求定義 → 要件定義 → 基本設計 → 詳細設計)を標準形式とし、`docs/design/task/` と同じ構成・粒度で作成する。要求・要件が `docs/assignment/{システム名}/` に支給される課題では 03_基本設計 から作成する
- 機能の追加・変更時は、コードと同じPRで基本設計(API一覧・ER図)と詳細設計(テーブル定義)を更新する。**設計書とコードの乖離を作らない**
- 詳細設計は「薄く」保つ:API詳細はOpenAPI(springdoc)、実装の詳細はコードとテストが正。日本語でコードを書き写すような文書は作らない
- 基本設計を作成するときは、要件定義の機能要件との対応表(トレーサビリティ)を必ず含める

## Git のルール

- `main` への直接pushは禁止。`feature/{機能名}` ブランチ → Pull Request
- コミットメッセージは日本語可。1コミット1目的

## 品質チェック(コミット前に必ず実行)

```bash
cd backend && ./mvnw verify          # テスト + Checkstyle + ArchUnit
cd frontend && npm run lint && npm test && npm run build
```
