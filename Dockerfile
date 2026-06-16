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
ARG VITE_GOOGLE_CLIENT_ID
ARG VITE_GOOGLE_API_KEY
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
