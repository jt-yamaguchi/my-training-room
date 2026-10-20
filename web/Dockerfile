# 本番用イメージ: frontend をビルドして nginx で配信する
# ビルドコンテキストはリポジトリルート(docker-compose.prod.yml 参照)
# ローカル開発ではこのファイルは使わない(frontend/ で npm run dev)

FROM node:20 AS build
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

FROM nginx:1.27
COPY --from=build /app/dist /usr/share/nginx/app
# templates/*.template は nginx 公式イメージが起動時に envsubst して conf.d に配置する
COPY web/nginx/default.conf.template /etc/nginx/templates/default.conf.template
EXPOSE 80 443
