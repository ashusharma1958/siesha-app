# Multi-stage production image for Angular app
FROM node:20-alpine AS build
WORKDIR /app

# Install dependencies first for better layer caching
COPY package*.json ./
RUN npm ci

# Build production assets
COPY . .
RUN npm run build:prod

FROM nginx:1.27-alpine AS runtime

# Nginx config with SPA fallback
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Angular build output
COPY --from=build /app/dist/siesha-app/browser /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
