# デプロイ手順② — アプリの本番公開(Phase 5)

Phase 2 で作ったサーバーに、**タスク管理アプリ(動的アプリ)を追加で公開します**。
サーバー・DNS・証明書は構築済みなので、この手順の中心は「LP専用構成 → アプリ+LPの本番構成」への切り替えです。

前提: [deploy-lp.md](./deploy-lp.md) が完了し、`https://lp.<自分のドメイン>` でLPが公開されていること。

## 0. デプロイ前の確認(ローカルで本番構成を一周する)

本番と同じ構成をローカルで起動し、イメージのビルドが通ることを確認してからデプロイします(WSLで実行)。

```bash
$ cd ~/projects/<リポジトリ名>
$ docker compose -f docker-compose.prod.yml up --build
```

> ローカルには証明書がないため web(nginx)は起動に失敗しますが、**backend と db が正常起動し、ビルドが最後まで通ること**を確認できれば十分です。確認後は `Ctrl+C` → `docker compose -f docker-compose.prod.yml down` で片付けます。

## 1. LP専用構成から本番構成へ切り替える

サーバーにSSHして実行します。本番構成(`docker-compose.prod.yml`)は**アプリとLPの両方**を1つのnginxで配信するため、LP専用構成は停止します(LPが消えるわけではありません)。

```bash
$ cd <リポジトリ名>
$ git pull                                        # 最新化
$ docker compose -f docker-compose.lp.yml down    # LP専用構成を停止
$ docker compose -f docker-compose.prod.yml up -d --build
```

初回ビルドはスワップを使うため **10〜20分程度** かかります。焦らず待ってください。

```bash
$ docker compose -f docker-compose.prod.yml ps     # web / backend / db が Up であること
$ docker compose -f docker-compose.prod.yml logs -f backend   # 起動ログの確認(Ctrl+Cで抜ける)
```

## 2. 動作確認(2つのサイトが同居していること)

| URL | 表示されるもの |
|---|---|
| `https://app.<自分のドメイン>` | **タスク管理アプリ**(初期タスク3件が表示され、追加・完了・削除ができる) |
| `https://lp.<自分のドメイン>` | **LP**(Phase 2 と同じ内容がそのまま表示される) |
| `https://<自分のドメイン>` | LPへ**リダイレクト**される(入口はLP) |

いずれも鍵マーク付きで表示されれば完了です。`app.<自分のドメイン>` に表示されるのは**いま公開している課題リポのアプリだけ**です。次の課題(在庫管理など)に移るときは、サーバーを作り直してから新しい課題リポで同じ流れを繰り返します([server-rebuild.md](./server-rebuild.md) / [repos-guide.md](./repos-guide.md))。

> 何が起きているか: 1つのnginxが、アクセスされたドメイン名(server_name)で配信先を振り分けています(バーチャルホスト)。LPは静的ファイルをそのまま、アプリはReactのビルド成果物+ `/api` のbackend転送。設定は `web/nginx/default.conf.template` にあり、この「1台で複数サイト」は現場で頻出の構成です。

## 3. 更新デプロイ(2回目以降)

コードを変更してmainにマージしたら、サーバー上で:

```bash
$ cd <リポジトリ名>
$ git pull
$ docker compose -f docker-compose.prod.yml up -d --build
```

- **LP(lp/site)だけの変更**なら、マウント配信のため `git pull` だけで反映されます(ビルド不要)
- アプリ(frontend/backend)の変更は `--build` 付きの上記コマンドが必要です

> 発展課題: この手作業を GitHub Actions から SSH 経由で自動実行する CD に置き換えてみましょう。

## 4. 運用でよく使うコマンド

| やりたいこと | コマンド |
|---|---|
| 全ログを見る | `docker compose -f docker-compose.prod.yml logs -f` |
| 再起動 | `docker compose -f docker-compose.prod.yml restart` |
| 停止(データは残る) | `docker compose -f docker-compose.prod.yml down` |
| DBごと初期化 | `docker compose -f docker-compose.prod.yml down -v` の後、up |
| ディスク使用量の掃除 | `docker system prune -f`(古いイメージの削除) |

証明書の更新が必要になった場合(90日超え): `docker compose -f docker-compose.prod.yml stop web` → `sudo certbot renew` → `start web`

## 5. 研修終了後の片付け(重要: 課金が続きます)

- [ ] Lightsail インスタンスを**削除**する(LP・アプリとも消えます)
- [ ] **静的IPを解放**する(インスタンスにアタッチされていない静的IPは課金対象です)
- [ ] 不要になったGitHub PATを失効させる
