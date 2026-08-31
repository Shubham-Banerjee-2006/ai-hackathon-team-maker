# --- Build stage ---
FROM node:20-slim AS builder

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build

# --- Runtime stage: static files served by nginx ---
FROM nginx:1.27-alpine

COPY --from=builder /app/dist /usr/share/nginx/html
# nginx's official image auto-renders *.template files in
# /etc/nginx/templates/ through envsubst on container start, substituting
# only variables that are actually set in the environment (so nginx's own
# $host/$remote_addr/etc. are left untouched). Default keeps docker-compose
# working out of the box; override BACKEND_URL when frontend and backend
# are deployed as separate services (e.g. Render) with different URLs.
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
ENV BACKEND_URL=http://backend:8000

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget -qO- http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
