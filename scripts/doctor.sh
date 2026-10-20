#!/usr/bin/env bash
# 開発環境の診断スクリプト。環境構築後に実行して全項目 OK になることを確認する。
#   bash scripts/doctor.sh
set -u

PASS=0
FAIL=0

ok()   { printf "  \033[32m[OK]\033[0m %s\n" "$1"; PASS=$((PASS + 1)); }
ng()   { printf "  \033[31m[NG]\033[0m %s\n     → %s\n" "$1" "$2"; FAIL=$((FAIL + 1)); }

echo "=== 生成AI研修 環境診断 ==="

# --- WSL 上で動いているか ---
if grep -qi microsoft /proc/version 2>/dev/null; then
  ok "WSL 上で実行されている"
else
  ng "WSL ではない環境で実行されている" "WSL のターミナル(Ubuntu)から実行してください"
fi

# --- リポジトリの置き場所(/mnt/c は禁止) ---
case "$(pwd)" in
  /mnt/*) ng "リポジトリが Windows 側 (/mnt/...) にある" "性能とホットリロードが壊れます。~/projects 配下に clone し直してください" ;;
  *)      ok "リポジトリが WSL 側のファイルシステムにある" ;;
esac

# --- Docker ---
if command -v docker >/dev/null 2>&1; then
  if docker info >/dev/null 2>&1; then
    ok "Docker Engine が起動している"
  else
    ng "docker コマンドはあるがデーモンに接続できない" "sudo service docker start / ユーザーが docker グループに入っているか確認"
  fi
  if docker compose version >/dev/null 2>&1; then
    ok "Docker Compose plugin が使える"
  else
    ng "docker compose が使えない" "docs/setup.md の Docker インストール手順を再確認"
  fi
else
  ng "docker コマンドが見つからない" "docs/setup.md の Docker インストール手順を実施"
fi

# --- Java ---
if command -v java >/dev/null 2>&1; then
  JV=$(java -version 2>&1 | head -1)
  case "$JV" in
    *'"17'*) ok "Java 17 ($JV)" ;;
    *)       ng "Java のバージョンが 17 ではない: $JV" "sdk env install を実行(.sdkmanrc 参照)" ;;
  esac
else
  ng "java コマンドが見つからない" "SDKMAN で Java 17 をインストール(docs/setup.md 参照)"
fi

# --- Maven ---
if command -v mvn >/dev/null 2>&1 || [ -x backend/mvnw ]; then
  ok "Maven (または mvnw) が使える"
else
  ng "Maven が見つからない" "sdk env install を実行(.sdkmanrc 参照)"
fi

# --- Node.js ---
if command -v node >/dev/null 2>&1; then
  NV=$(node -v)
  case "$NV" in
    v20.*) ok "Node.js 20 ($NV)" ;;
    *)     ng "Node.js のバージョンが 20 ではない: $NV" "nvm install 20 && nvm use 20" ;;
  esac
else
  ng "node コマンドが見つからない" "nvm で Node.js 20 をインストール(docs/setup.md 参照)"
fi

# --- Git 設定 ---
AUTOCRLF=$(git config --get core.autocrlf || true)
if [ "$AUTOCRLF" = "input" ] || [ "$AUTOCRLF" = "false" ] || [ -z "$AUTOCRLF" ]; then
  ok "git core.autocrlf が安全な設定 (input / false / 未設定)"
else
  ng "git core.autocrlf=$AUTOCRLF になっている" "git config --global core.autocrlf input を実行(CRLF事故防止)"
fi
if [ -n "$(git config --get user.name || true)" ] && [ -n "$(git config --get user.email || true)" ]; then
  ok "git user.name / user.email が設定済み"
else
  ng "git のユーザー設定が未完了" "git config --global user.name / user.email を設定"
fi

# --- メモリ ---
MEM_GB=$(awk '/MemTotal/ {printf "%d", $2 / 1024 / 1024}' /proc/meminfo)
if [ "$MEM_GB" -ge 7 ]; then
  ok "WSL に割り当てられたメモリ: ${MEM_GB}GB"
else
  ng "WSL のメモリが ${MEM_GB}GB しかない" "%UserProfile%\\.wslconfig で memory=8GB 以上を設定(docs/setup.md 参照)"
fi

# --- ネットワーク到達性 ---
check_net() {
  if curl -fsS --max-time 8 -o /dev/null "$1" 2>/dev/null; then
    ok "到達可能: $2"
  else
    ng "到達できない: $2" "社内プロキシ/ネットワーク設定を確認"
  fi
}
check_net https://github.com "GitHub"
check_net https://registry.npmjs.org "npm registry"
check_net https://repo.maven.apache.org "Maven Central"

# --- ポート空き確認 ---
for P in 5173 8080 5432; do
  if ss -ltn 2>/dev/null | grep -q ":$P "; then
    ng "ポート $P が使用中" "他のプロセスを停止するか、既に起動済みなら問題なし"
  else
    ok "ポート $P は空いている"
  fi
done

echo "==========================="
echo "結果: OK ${PASS} 件 / NG ${FAIL} 件"
if [ "$FAIL" -gt 0 ]; then
  echo "NG の項目を docs/setup.md と docs/troubleshooting.md を見て解消してください。"
  exit 1
fi
echo "環境構築は完了しています。開発を始めてください。"
