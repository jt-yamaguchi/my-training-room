# アーキテクチャガイド — 機能追加の「型」

このリポジトリの構成は**タスク管理専用ではありません**。`task/` は一例で、どんなドメイン(予約、在庫、日報、顧客管理…)でも**同じ型を複製**して機能を増やせるように作られています。
このガイドはその型を、特定のドメインに依存しない形で説明します。Claude Code に機能追加を指示するときも「このガイドの型に従って」と伝えれば構成が揃います。

## 1. 全体の型(レイヤードアーキテクチャ)

依存の方向は常に一方通行です。逆流は `ArchitectureTest`(ArchUnit)がCIで検出します。

```
HTTP ⇄ Controller → Service → Repository → Entity ⇄ DB
              ↕
             DTO(APIの入出力はDTOのみ。Entityを外に出さない)
```

| レイヤー | 責務 | 責務ではないこと |
|---|---|---|
| Controller | HTTPの入出力・バリデーション起動 | ビジネスロジック・DB操作 |
| Service | ビジネスロジック・トランザクション境界 | HTTPの知識(ステータスコード等) |
| Repository | DBアクセス(Spring Data JPA) | ロジック |
| Entity | テーブルと1対1のデータ構造 | APIへの直接露出 |
| DTO | APIの入出力の形・バリデーション定義 | DBの知識 |

この分担は現場の大半のSpring Boot案件と同じ形です。ここで身につけた型はそのまま配属先で通用します。

## 2. パッケージの型(機能単位で切る)

レイヤーごとではなく**機能(ドメイン)ごと**にパッケージを切ります。新しい機能は `task/` をまるごとお手本にして複製します。

```
com.example.training/
├── task/                    ← お手本。汎用名に読み替えると…
│   ├── TaskController.java      {Domain}Controller
│   ├── TaskService.java         {Domain}Service
│   ├── TaskRepository.java      {Domain}Repository
│   ├── Task.java                {Domain}(Entity)
│   └── dto/
│       ├── TaskRequest.java     {Domain}Request
│       └── TaskResponse.java    {Domain}Response
└── common/                  ← 横断的関心事(例外・ハンドラ)。機能を跨ぐものだけ置く
```

例えば「カテゴリ機能」なら `category/` を作り、`CategoryController / CategoryService / …` と同じ形を並べます。

> **なぜ共通基底クラス(BaseController等)を作らないのか**: 抽象化はコード量を減らしますが、読み手(初学者とAI)双方の理解コストを上げ、AIの生成品質も下げます。この研修では「同じ型を素直に繰り返す」ことを優先します。重複が本当に問題になる規模になってから抽象化するのが現場でも健全な順序です。

## 3. 新機能追加のレシピ(どのドメインでも同じ手順)

`{domain}` を自分の機能名に読み替えてください。**この順番どおり**に進めるのがポイントです(DBとAPIの設計を先に固定してから実装する)。

| # | 作業 | 場所 / 例 |
|---|---|---|
| 1 | API設計を決める(実装前に!) | パス `/api/{domains}`・メソッド・DTOの項目。AIには「設計だけ先に提示して」と指示 |
| 2 | マイグレーション追加 | `db/migration/V{次の連番}__create_{domains}.sql`(既存Vファイルは触らない) |
| 3 | Entity | `{domain}/{Domain}.java`。テーブルと1対1 |
| 4 | Repository | `{domain}/{Domain}Repository.java`(JpaRepositoryを継承) |
| 5 | DTO | `dto/{Domain}Request.java`(バリデーション付きrecord)/ `{Domain}Response.java`(fromメソッド) |
| 6 | Service | ロジックと`@Transactional`。見つからなければ `NotFoundException` |
| 7 | Controller | HTTPの入出力のみ。`@Valid` を忘れない |
| 8 | backendテスト | `{Domain}ApiTest` を `TaskApiTest` の書き方で(H2 + MockMvc) |
| 9 | フロントの型とAPIクライアント | `src/api/types.ts` / `src/api/{domains}.ts`(相対パス `/api/...` のみ) |
| 10 | コンポーネント | `src/components/` に1ファイル1コンポーネント |
| 11 | フロントテスト | `App.test.tsx` の書き方で(fetchモック) |
| 12 | 品質チェック | `./mvnw verify` + `npm run lint && npm test && npm run build` |

既存機能への項目追加(例: タスクに期限を足す)の場合は、#2(ALTER文のVファイル)→ #3以降の該当箇所を修正、という同じ流れの縮小版になります。

## 4. 判断に迷ったときの原則

- **Entityを外に出さない**: Controllerの引数・戻り値・フロントの型は常にDTO由来。テーブル構造とAPIの形を独立に進化させるため
- **環境依存値はコードに書かない**: 接続先・ドメイン等は環境変数(`application.yml` の `${VAR:default}` 形式)。ローカルと本番の差はここだけで吸収する
- **スキーマは前進のみ**: 適用済みマイグレーションは編集せず、新しいVファイルで変更する(現場のDB運用と同じ)
- **フロントは相対パス**: `/api/...` のみ。転送は開発時=Vite proxy、本番=nginxが担う(役割は同じ)
- **横断的なものだけ common へ**: 2機能以上で本当に共有するものができて初めて置く。先回りで共通化しない
- **テストは機能とセット**: テストのない変更はレビューで差し戻し(CLAUDE.mdのルール)

## 5. この型の現場での位置づけ

- 機能単位パッケージ+レイヤードは、中小規模のSpring Boot案件で最も標準的な構成です
- 案件によってはレイヤー単位(controller/ service/ …でパッケージを切る)の現場もありますが、責務の分け方は同じなので読み替えられます
- さらに大規模になるとオニオン/ヘキサゴナル等が登場しますが、それらも「依存を一方向に保つ」という同じ原則の発展形です。この型を理解していれば入口に立てます
