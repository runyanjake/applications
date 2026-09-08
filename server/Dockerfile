FROM node:22-alpine
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src

# Logs are written here; docker-compose mounts the host directory over it.
RUN mkdir -p /app/logs
ENV LOG_DIR=/app/logs
ENV PORT=8080
ENV LOG_RETENTION=30d
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD node -e "fetch('http://127.0.0.1:8080/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "src/index.js"]
