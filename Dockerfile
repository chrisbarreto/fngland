FROM node:20-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# Variables necesarias en build time para páginas prerenderizadas
ARG TURNSTILE_SITE_KEY
ENV TURNSTILE_SITE_KEY=$TURNSTILE_SITE_KEY
ARG API_URL
ENV API_URL=$API_URL
ARG API_KEY_LANDING
ENV API_KEY_LANDING=$API_KEY_LANDING

ARG PUBLIC_PAGOPAR_PROVIDER_SELECTOR_ENABLED=true
ENV PUBLIC_PAGOPAR_PROVIDER_SELECTOR_ENABLED=$PUBLIC_PAGOPAR_PROVIDER_SELECTOR_ENABLED

RUN npm run build

FROM node:20-bookworm-slim AS runtime
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules

ENV HOST=0.0.0.0
ENV PORT=80
EXPOSE 80
CMD ["node", "dist/server/entry.mjs"]
