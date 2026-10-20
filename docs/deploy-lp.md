# デプロイ手順① — サーバー構築とLP公開(Phase 2)

**サンプルLP(静的サイト)を、コードを1行も変えずにHTTPSで世界に公開します(Phase 2)。**
ここで作るサーバー(Lightsail)は使い捨てではなく、Phase 3 でAIと作る自分のLP、Phase 5 でタスク管理アプリを同じサーバーに載せていきます。つまりこの手順は「本番サーバーの土台作り+最初のリリース」です。

前提: ローカル環境構築([setup.md](./setup.md))が完了していること / 自分のドメインが割り当てられていること(講師から通知されます)。

## 0. ローカルでLPを確認する(Phase 1 で実施済みならスキップ可)

デプロイする前に、何を公開するのか自分の目で見ておきます(WSLで実行)。

```bash
$ cd ~/projects/<リポジトリ名>
$ python3 -m http.server 3000 --directory lp/site
# ブラウザで http://localhost:3000 を開く。確認したら Ctrl+C で終了
```

LPの実体は `lp/site/` のHTMLとCSSだけです。サーバーで実行されるプログラムは何もない=**静的サイト**であることを確認してください。

## 1. Lightsail インスタンスの作成

1. AWSコンソール → Lightsail → **インスタンスの作成**
2. リージョン: **東京 (ap-northeast-1)**
3. プラットフォーム: **Linux/Unix**、設計図: **OS のみ → Ubuntu 22.04 LTS**
4. プラン: **2GBメモリのプラン(月額 $12・固定)**。512MB/1GBプランはメモリ不足で研修に不向き
5. インスタンス名: 講師の指定に従う(例: `training-yamada`)
6. 作成後、**ネットワーキング**タブ → **静的IPの作成** → インスタンスにアタッチ
7. 同タブのファイアウォールで **HTTPS (443)** を追加(HTTP 80 と SSH 22 は最初から開いています)

## 2. DNS の設定(運営に払い出しを依頼。研修を通して1回だけ)

DNSゾーンは**研修運営が管理**しています。手順1で取得した**静的IP**を運営に連絡し、以下の**Aレコード3本**の登録を依頼してください(自分でDNS管理画面を操作する必要はありません)。

| 種別 | 名前 | 値 | 用途 |
|---|---|---|---|
| A | (自分のドメイン) | 静的IP | 入口(LPへリダイレクト) |
| A | app.(自分のドメイン) | 静的IP | アプリ用(そのとき公開中のシステムが表示される) |
| A | lp.(自分のドメイン) | 静的IP | LP用 |

例: 割り当てが `yamada.training.example.com` なら、`app.yamada.training.example.com` と `lp.yamada.training.example.com` を含む3本です。
この3本は**全システム共通で研修の最後まで変わりません**。以降どのシステムを公開するときもDNSの追加依頼は不要です(静的IPを使い回すため、サーバーを作り直しても変わりません)。

登録されたら反映を確認します(WSLから。数分かかることがあります)。

```bash
$ dig +short <自分のドメイン>
$ dig +short app.<自分のドメイン>
$ dig +short lp.<自分のドメイン>   # すべて静的IPが返ればOK
```

## 3. サーバーの初期設定

LightsailコンソールのブラウザSSH、またはWSLからSSH接続します(以降サーバー上で実行)。

```bash
$ ssh -i ~/.ssh/LightsailDefaultKey-ap-northeast-1.pem ubuntu@<静的IP>
```

### 3-1. スワップの作成(必須)

Phase 5のDockerビルドは瞬間的にメモリを大きく使います。2GBプランなら通常は足りますが、保険として作っておきます(メモリ不足でビルドが落ちる事故を確実に防げます)。

```bash
$ sudo fallocate -l 2G /swapfile
$ sudo chmod 600 /swapfile
$ sudo mkswap /swapfile
$ sudo swapon /swapfile
$ echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
$ free -h   # Swap に 2.0Gi が表示されればOK
```

### 3-2. Docker Engine のインストール

ローカル構築(setup.md 手順5)と同じです。

```bash
$ sudo install -m 0755 -d /etc/apt/keyrings
$ sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
$ echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
$ sudo apt update
$ sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
$ sudo usermod -aG docker ubuntu
$ exit   # 反映のため一度切断して再接続する
```

### 3-3. リポジトリの取得と本番用 .env の作成

```bash
$ git clone https://github.com/<自分のアカウント>/<リポジトリ名>.git
$ cd <リポジトリ名>
$ cp .env.example .env
$ nano .env
```

`DOMAIN` に割り当てられた**自分のドメイン**(app. や lp. の付かないベース)を設定します。アプリ用は `app.${DOMAIN}`、LP用は `lp.${DOMAIN}` として自動で組み立てられるので設定不要です。`DB_PASSWORD` もこの機会に本番用の強い値へ変えておきます(Phase 5 で使用)。

## 4. HTTPS証明書の取得(3ドメインを1枚で)

DNSの反映(手順2)を確認してから実行します。**入口・アプリ用・LP用のドメインをまとめて1枚の証明書にします**(`-d` を3回指定)。

```bash
$ sudo apt install -y certbot
$ sudo certbot certonly --standalone \
    -d <自分のドメイン> -d app.<自分のドメイン> -d lp.<自分のドメイン> \
    --agree-tos -m <メールアドレス> --non-interactive
```

`Successfully received certificate` と表示されればOK。証明書は `/etc/letsencrypt/live/<自分のドメイン>/` に作られ、3ドメインすべてで有効です。ドメイン構成は最後まで変わらないため、`--expand` などの証明書変更は以降不要です(サーバーを作り直したときに同じコマンドで再取得するだけ。[server-rebuild.md](./server-rebuild.md) 参照)。

> 有効期間は90日。研修期間内なら初回取得のみで足ります。更新が必要な場合は、稼働中のcomposeを一度 `stop` → `sudo certbot renew` → `start` の順で実行します。

## 5. LPの公開

```bash
$ docker compose -f docker-compose.lp.yml up -d
$ docker compose -f docker-compose.lp.yml ps    # Up であること
```

ブラウザで **`https://lp.<自分のドメイン>`** を開き、サンプルLPが表示され鍵マークが付いていれば**初リリース完了**です🎉(コードを1行も変えずに本番まで通せたことに意味があります)

> 何が起きたか: nginxコンテナが `lp/site/` のHTMLをそのまま配信しているだけです。DBもアプリケーションサーバーもありません。「静的サイトの公開に必要なのはWebサーバーと証明書だけ」——これがPhase 5で公開する動的アプリとの違いです。

## 6. LPの更新方法(Phase 3 で使います)

Phase 3 でAIとLPを作り替えたら、mainへのマージ後にサーバーで:

```bash
$ cd <リポジトリ名>
$ git pull    # lp/site はマウントしているので、これだけで反映される(再起動も不要)
```

ブラウザをリロードすると自分のLPに切り替わります。ビルドが不要なのも静的サイトの特徴です。

## 発展知識: S3という選択肢(読み物)

静的サイトの公開は、実務ではサーバーを立てず **Amazon S3(ファイル置き場サービス)** に置くだけで済ませるのが定石です。ただし S3 単体は HTTP のみで、HTTPS化には前段に **CloudFront(CDN)+ ACM証明書** を置く必要があります(S3にはcertbotを動かすサーバーが存在しないため)。

- 本研修では「同じサーバーを育てていく」学習効果を優先してLightsailに集約しています
- 発展課題: このLPを S3 + CloudFront でもう一系統公開してみる(費用はほぼ無料枠内)。「マネージドな証明書(ACM)vs 自前の証明書(certbot)」の違いが体験できます

次は Phase 3(AIでLPを作る。training-flow.md 参照)、その後 [deploy.md](./deploy.md)(Phase 5: 同じサーバーにアプリを公開)へ進みます。
