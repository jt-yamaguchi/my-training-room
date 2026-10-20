# ローカル環境構築手順書

WSL上に開発環境を構築します。所要時間は約2〜3時間です(通信環境に依存)。
つまずいたら [troubleshooting.md](./troubleshooting.md) を参照してください。

## 前提条件

- Windows 11(管理者権限があること)
- メモリ 16GB 以上
- GitHub の個人アカウント(なければ https://github.com で作成)
- 会社から貸与された Claude アカウント

> **この手順書の鉄則**
> コマンドの実行場所を必ず確認すること。`PS>` は Windows の PowerShell、`$` は WSL(Ubuntu)のターミナルを表します。

---

## 1. WSL2 と Ubuntu 22.04 の導入

PowerShell を**管理者として実行**し、以下を実行します。

```powershell
PS> wsl --install -d Ubuntu-22.04
```

PCを再起動すると Ubuntu の初期設定が始まります。**ユーザー名とパスワード**を設定してください(パスワードは以後 `sudo` で使うので忘れないこと)。

インストール済みの場合はバージョンを確認します。

```powershell
PS> wsl -l -v    # VERSION が 2 であること
```

Ubuntu を開いて(スタートメニューから「Ubuntu 22.04」)、パッケージを最新化します。

```bash
$ sudo apt update && sudo apt upgrade -y
$ sudo apt install -y curl git unzip zip ca-certificates
```

## 2. WSL のメモリ上限を設定する

WSLがWindows側のメモリを食い尽くすのを防ぎます。PowerShellで以下を実行します。

```powershell
PS> notepad $env:UserProfile\.wslconfig
```

以下を貼り付けて保存します(16GB機の推奨値)。

```ini
[wsl2]
memory=8GB
processors=4
```

反映のため一度WSLを停止します(次にUbuntuを開いたとき有効になります)。

```powershell
PS> wsl --shutdown
```

## 3. Git の初期設定

**以降の手順はすべて WSL(Ubuntu)のターミナルで実行します。**

```bash
$ git config --global user.name "自分の名前"
$ git config --global user.email "GitHubに登録したメールアドレス"
$ git config --global core.autocrlf input   # CRLF事故の防止(重要)
$ git config --global init.defaultBranch main
```

## 4. GitHub の認証設定(HTTPS + PAT)

1. ブラウザで GitHub にログイン → 右上アイコン → **Settings** → **Developer settings** → **Personal access tokens** → **Fine-grained tokens** → **Generate new token**
2. 設定値:
   - Token name: `training-wsl`(任意)
   - Expiration: 研修期間をカバーする日数
   - Repository access: **All repositories**(または研修リポジトリのみ)
   - Permissions → Repository permissions → **Contents: Read and write**
3. 生成されたトークン(`github_pat_...`)をコピーする。**この画面を閉じると二度と表示されません**

トークンは初回のpush/clone時にパスワードとして入力します。毎回の入力を避けるため保存設定をしておきます。

```bash
$ git config --global credential.helper store
```

> 注意: トークンは `~/.git-credentials` に平文保存されます。研修用PCの用途なら許容範囲ですが、トークンをチャットやメモアプリに貼らないこと。

## 5. Docker Engine の導入(Docker Desktop は使いません)

まず systemd を有効化します(Dockerを自動起動させるため)。

```bash
$ sudo tee /etc/wsl.conf > /dev/null << 'EOF'
[boot]
systemd=true
EOF
```

PowerShellで `wsl --shutdown` を実行し、Ubuntuを開き直してから、Docker公式リポジトリを設定してインストールします。

```bash
$ sudo install -m 0755 -d /etc/apt/keyrings
$ sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
$ echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
$ sudo apt update
$ sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

sudoなしで docker を使えるようにします。

```bash
$ sudo usermod -aG docker $USER
```

**反映にはWSLの再起動が必要です。** PowerShellで `wsl --shutdown` → Ubuntuを開き直して確認します。

```bash
$ docker run --rm hello-world   # "Hello from Docker!" が出ればOK
```

## 6. Java 17 と Maven(SDKMAN)

```bash
$ curl -s "https://get.sdkman.io" | bash
$ source "$HOME/.sdkman/bin/sdkman-init.sh"
$ sdk install java 17.0.13-tem
$ sdk install maven 3.9.9
$ java -version   # openjdk version "17.x" が出ればOK
```

## 7. Node.js 20(nvm)

```bash
$ curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
$ source ~/.bashrc
$ nvm install 20
$ nvm alias default 20
$ node -v   # v20.x が出ればOK
```

## 8. VSCode と拡張機能

1. **Windows側**に VSCode をインストールする(https://code.visualstudio.com)
2. VSCode を開き、拡張機能で **WSL**(Microsoft製)をインストールする
3. WSLターミナルで作業ディレクトリを作り、そこからVSCodeを起動する

```bash
$ mkdir -p ~/projects && cd ~/projects
$ code .
```

初回はVSCode Serverのセットアップが走ります。左下に「WSL: Ubuntu-22.04」と表示されればWSLに接続できています。

4. リポジトリを開くと右下に「推奨拡張機能をインストールしますか?」と表示されるので**すべてインストール**する(Claude Code、Java Extension Pack、ESLint、Prettier等)
5. Claude Code 拡張を開き、**会社から貸与されたアカウント**でログインする

## 9. リポジトリの取得と起動

1. ブラウザでテンプレートリポジトリを開き、**Use this template → Create a new repository** で自分のリポジトリを作成する(名前は講師の指定に従う)
2. WSLに clone する。**必ず `~/projects` 配下にすること。`/mnt/c` 配下は禁止**(性能とホットリロードが壊れます)

```bash
$ cd ~/projects
$ git clone https://github.com/<自分のアカウント>/<リポジトリ名>.git
$ cd <リポジトリ名>
```

3. 環境診断を実行し、**全項目 OK** になることを確認する

```bash
$ bash scripts/doctor.sh
```

4. NGがあれば [troubleshooting.md](./troubleshooting.md) を見て解消する
5. アプリを起動する(手順は [README.md](../README.md) の「起動手順」)。ブラウザで http://localhost:5173 を開き、初期タスクが3件表示されれば環境構築は完了です

## 10. 動作確認チェックリスト

- [ ] doctor.sh が全項目 OK
- [ ] http://localhost:5173 でタスク一覧が表示される
- [ ] タスクを追加・完了・削除できる
- [ ] http://localhost:8080/api/docs で Swagger UI が開く
- [ ] VSCode の左下に「WSL: Ubuntu-22.04」と表示されている
- [ ] Claude Code にログインできている
