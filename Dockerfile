FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json prisma.config.ts ./
COPY prisma ./prisma
RUN npx prisma generate

COPY src ./src
RUN npm run build

FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Copy prisma files BEFORE npm install
COPY prisma.config.ts ./
COPY prisma ./prisma

# Install dependencies (including prisma)
RUN npm ci --omit=dev && npm install prisma --save-dev

# Generate Prisma Client AFTER installing dependencies
RUN npx prisma generate

# Now copy the built app
COPY --from=builder /app/dist ./dist

EXPOSE 3001

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]