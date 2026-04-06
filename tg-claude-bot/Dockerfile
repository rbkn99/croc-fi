FROM node:20-alpine
WORKDIR /app

RUN apk add --no-cache curl && \
    mkdir -p /app/fonts && \
    curl -sL "https://github.com/google/fonts/raw/main/apache/roboto/static/Roboto-Regular.ttf" -o /app/fonts/Roboto-Regular.ttf && \
    curl -sL "https://github.com/google/fonts/raw/main/apache/roboto/static/Roboto-Bold.ttf" -o /app/fonts/Roboto-Bold.ttf

COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build
RUN npm prune --production

VOLUME ["/app/data"]
CMD ["node", "dist/index.js"]
