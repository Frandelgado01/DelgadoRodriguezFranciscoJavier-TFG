# Servicio web (R11): construye la PWA con Vite y la sirve con Caddy, que además hace de proxy de /api.
FROM node:24.12.0-alpine AS construccion
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM caddy:2.11.7-alpine
COPY --from=construccion /app/dist /srv
