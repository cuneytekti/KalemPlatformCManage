FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json nest-cli.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

FROM node:22-alpine
WORKDIR /app
RUN addgroup -S cmanage && adduser -S cmanage -G cmanage
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
USER cmanage
EXPOSE 3000
CMD ["node", "dist/main.js"]
