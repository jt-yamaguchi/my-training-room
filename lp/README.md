# LP(ランディングページ)

`site/` 配下が公開される実体です。**同梱のLPはサンプル(お手本)です。Phase 2 でまず無変更のまま公開し、Phase 3 で Claude Code に指示して自分のLPに作り替えます**(進め方は docs/training-flow.md 参照)。

## ルール(CLAUDE.md にも記載)

- 静的HTML/CSSのみ。JavaScript・ビルドツール・フレームワークの導入は禁止
- アプリへの導線ボタンは `href="#"` のプレースホルダにしておき、Phase 6 で本番URLに差し替える

## ローカルプレビュー

```bash
python3 -m http.server 3000 --directory lp/site
```

## 公開の仕組み

- Phase 2: `docker-compose.lp.yml` が `lp/site/` をnginxでそのままHTTPS配信
- Phase 5以降: `docker-compose.prod.yml` の同一nginxが `lp.<ドメイン>` で配信(アプリと同居)
- サーバー側の更新は `git pull` のみ(マウント配信のためビルド・再起動不要)
