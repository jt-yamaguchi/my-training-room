# Git コマンド集

この研修で使うGit操作のまとめです。前半が毎日使う基本フロー、後半が「困ったとき」の逆引きです。
迷ったらまず `git status` を打つこと。今の状態を教えてくれます。

---

## 1. 毎日の基本フロー(GitHub Flow)

このリポジトリは main への直接pushが禁止です。必ずブランチを切ってPRを出します。

```bash
# 1) 最新のmainを取り込んでからブランチを切る
git switch main
git pull
git switch -c feature/タスク期限機能     # feature/機能名 で命名

# 2) 変更を確認してコミット
git status                # 何が変わったか(まずこれ)
git diff                  # 変更内容の中身を見る
git add .                 # 変更を全てステージに乗せる
git commit -m "タスクに期限(due_date)を追加"

# 3) GitHubへプッシュ
git push -u origin feature/タスク期限機能   # 初回のみ -u。2回目以降は git push だけでよい

# 4) GitHubの画面でPull Requestを作成 → レビュー → マージ

# 5) マージ後の片付け
git switch main
git pull
git branch -d feature/タスク期限機能     # マージ済みローカルブランチの削除
```

### コミットの粒度とメッセージ

- 1コミット1目的(「APIを追加」と「タイポ修正」を混ぜない)
- メッセージは日本語でOK。「何をしたか」が一行でわかるように

## 2. 状態確認系(読むだけ・安全)

| コマンド | 用途 |
|---|---|
| `git status` | 今の状態(変更・ステージ・ブランチ)。困ったらまずこれ |
| `git log --oneline -10` | 直近10件のコミット履歴を1行表示 |
| `git diff` | まだ add していない変更の中身 |
| `git diff --staged` | add 済み(コミット直前)の変更の中身 |
| `git branch` | ローカルブランチの一覧(* が今いる場所) |
| `git remote -v` | 接続先リポジトリの確認 |

---

## 3. 困ったときの逆引き

### 「直前のコミットメッセージを間違えた」

```bash
git commit --amend -m "正しいメッセージ"
# ※ push 済みのコミットには使わないこと(履歴が食い違う)
```

### 「add しすぎた / add を取り消したい」

```bash
git restore --staged ファイル名    # 特定ファイルをステージから降ろす(変更自体は残る)
git restore --staged .             # 全部降ろす
```

### 「ファイルの変更自体をなかったことにしたい」

```bash
git restore ファイル名     # 最後のコミット時点の内容に戻す(変更は消える。注意)
```

### 「間違ったブランチ(main等)で作業してしまった」

コミット前なら変更を持ったままブランチを作れます。

```bash
git switch -c feature/正しいブランチ名   # 変更ごと新ブランチへ移動
```

コミットまでしてしまった場合:

```bash
git switch -c feature/正しいブランチ名   # コミットごと新ブランチへ
git switch main
git reset --hard origin/main             # mainをリモートの状態に戻す
```

### 「直前のコミットを取り消したい(変更は残したい)」

```bash
git reset --soft HEAD~1    # コミットだけ取り消し。変更はステージに残る
```

### 「push済みのコミットを取り消したい」

```bash
git revert コミットID      # 打ち消しコミットを新しく作る(履歴を壊さない安全な方法)
# コミットIDは git log --oneline で確認
```

> **原則**: push済みの履歴に対して `reset --hard` や `--amend` を使わない。`revert` を使う。

### 「pull したらコンフリクトした」

```bash
git pull
# CONFLICT と表示されたら:
git status                          # 両者修正(both modified)のファイルを確認
# 該当ファイルを開き <<<<<<< ======= >>>>>>> の箇所を手で直す
# (VSCodeなら「競合を解決」ボタンが出ます。Claude Codeに解決を依頼してもOK)
git add 解決したファイル
git commit                          # メッセージはデフォルトのままでよい
```

途中でやめたくなったら:

```bash
git merge --abort     # コンフリクト解消を中断してpull前の状態に戻す
```

### 「作業を一時退避して他のことをしたい」

```bash
git stash             # 変更を退避して作業ツリーをきれいにする
git stash pop         # 退避した変更を戻す
git stash list        # 退避の一覧
```

### 「.gitignore に追加したのに反映されない」

一度追跡されたファイルは ignore の対象外です。追跡を外します。

```bash
git rm --cached ファイル名     # ファイル自体は消さず追跡だけ外す
git commit -m "追跡対象から除外"
```

### 「.env を誤ってコミットしてしまった」

```bash
git rm --cached .env
git commit -m ".env を追跡対象から除外"
git push
```

> **重要**: push してしまった場合、履歴には残っています。中のパスワード等は**漏えいしたものとして必ず変更**し、講師に報告してください。

### 「認証エラー(403 / Authentication failed)が出る」

- PATの有効期限切れの可能性 → GitHubで再発行し、次のpush時に新トークンを入力
- 保存済みの古い認証を消す: `rm ~/.git-credentials` してから再push

---

## 4. やってはいけないこと

- `git push --force`(共有ブランチの履歴破壊。研修では使用禁止)
- main への直接コミット・push(ルール違反。ブランチを切る)
- push済みコミットへの `--amend` / `reset --hard`(`revert` を使う)
- `.env` や PAT などの秘密情報のコミット
