FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json nest-cli.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

FROM node:22-alpine
WORKDIR /app
RUN apk add --no-cache chromium font-noto ca-certificates \
    && addgroup -S cmanage \
    && adduser -S cmanage -G cmanage
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
USER cmanage
EXPOSE 3000
CMD ["node", "dist/main.js"]
