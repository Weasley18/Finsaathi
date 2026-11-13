FROM node:20-alpine

# Prisma's engines need OpenSSL, which the alpine image does not ship by default
RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma
RUN npm ci
RUN npm run db:generate

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

EXPOSE 3001

CMD ["/bin/sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
