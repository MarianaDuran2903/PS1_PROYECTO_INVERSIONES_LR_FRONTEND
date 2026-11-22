# syntax=docker/dockerfile:1

ARG NODE_VERSION=22

# ---- Dependencias ----------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS deps
WORKDIR /app
ENV NG_CLI_ANALYTICS=false
COPY package.json package-lock.json ./
RUN npm ci

# ---- Pruebas unitarias (Chrome headless) -----------------------------
FROM deps AS test
RUN apk add --no-cache chromium
ENV CHROME_BIN=/usr/bin/chromium-browser
COPY . .
CMD ["npx", "ng", "test", "--no-watch", "--no-progress", "--browsers=ChromeHeadlessCI"]

# ---- Build -----------------------------------------------------------
FROM deps AS build
# production | staging | development
ARG BUILD_CONFIGURATION=production
COPY . .
RUN npx ng build --configuration ${BUILD_CONFIGURATION}

# ---- Runtime: nginx sirve la SPA y hace de proxy hacia el backend ----
FROM nginx:1.27-alpine AS runtime
ENV BACKEND_URL=http://host.docker.internal:8080
COPY docker/nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist/inversiones-lr-frontend/browser /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -q --spider http://127.0.0.1/ || exit 1
