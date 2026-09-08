FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Lint + type-check target, used by CI (docker build --target ci).
FROM deps AS ci
COPY . .
RUN npm run lint && npx tsc -b

FROM deps AS build
COPY . .

# Vite inlines these at build time, so they must be present *before* the build.
ARG VITE_GOOGLE_CLIENT_ID
ARG VITE_GOOGLE_API_KEY
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
ENV VITE_GOOGLE_API_KEY=$VITE_GOOGLE_API_KEY

# Fail here rather than shipping a bundle that cannot talk to Google
RUN test -n "$VITE_GOOGLE_CLIENT_ID" -a -n "$VITE_GOOGLE_API_KEY" || { \
      echo "ERROR: VITE_GOOGLE_CLIENT_ID and VITE_GOOGLE_API_KEY must be set (see .env.example)"; \
      exit 1; \
    }
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
# Liveness probe against the dedicated /healthz endpoint. Use 127.0.0.1 (not
# localhost): nginx listens IPv4-only, but busybox wget would resolve localhost
# to ::1 (IPv6) and get connection refused.
HEALTHCHECK --interval=5s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:80/healthz || exit 1
