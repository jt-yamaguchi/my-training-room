# トラブルシューティング

環境で困ったらまず `bash scripts/doctor.sh` を実行してください。以下は頻出の問題です。

> **本番サーバー側のトラブルは原因を追いすぎないこと。** この研修のサーバーは作り直せる設計です。
> レベル1(Dockerクリーン・数分)→ レベル2(サーバー作り直し・15〜30分)の順で試してください([server-rebuild.md](./server-rebuild.md))。

## 画面の変更が反映されない / 何もかも遅い

**原因のほぼ100%はリポジトリを Windows 側(/mnt/c/...)に置いていること。**
WSLのホーム(~/projects など)に clone し直してください。移動ではなく clone し直しが確実です。

それでもHMRが効かない場合の最終手段(CPUを消費します):

```ts
// vite.config.ts の server に追加
watch: { usePolling: true }
```

## シェルスクリプトが「^M」などのエラーで動かない

改行コードがCRLFになっています。`.gitattributes` があるので通常は起きませんが、
発生したら `git config --global core.autocrlf input` を設定して clone し直してください。

## docker: permission denied

ユーザーが docker グループに入っていません。

```bash
sudo usermod -aG docker $USER
# 反映にはWSLの再起動が必要(PowerShellで)
wsl --shutdown
```

## ポート5432が使われている / DBに繋がらない

- Windows側にPostgreSQLが入っていると衝突します。Windows側のサービスを停止してください
- `docker compose ps` でdbが `healthy` になっているか確認

## backend起動時に Flyway のエラーが出る

- `Migration checksum mismatch`: 適用済みの V ファイルを書き換えています。元に戻して新しい連番ファイルで変更してください
- どうしても直らない場合(開発DBに限る): `docker compose down -v && docker compose up -d` でDBを作り直す

## PCが重い / 固まる

WSLがメモリを使いすぎています。Windows側で `%UserProfile%\.wslconfig` を作成:

```ini
[wsl2]
memory=8GB
processors=4
```

保存後、PowerShellで `wsl --shutdown` して開き直す。

## npm install / mvn が社内ネットワークで失敗する

プロキシ環境の可能性があります。講師に相談してください(基本的に本研修の想定環境では不要のはずです)。
