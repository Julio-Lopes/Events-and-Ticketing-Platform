# ---------- build ----------
FROM node:20-alpine AS builder
WORKDIR /app

# Camada de dependencias separada: enquanto package.json nao mudar,
# o docker reaproveita esta camada e o build fica muito mais rapido.
COPY package*.json ./
RUN npm ci

COPY . .

# O client do Prisma NAO esta no repositorio (src/generated esta no
# .gitignore), entao precisa ser gerado aqui. Antes do build, porque
# o TypeScript compila os arquivos gerados junto.
RUN npx prisma generate
RUN npm run build

# ---------- runtime ----------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Só dependencias de producao no runtime, mas o prisma CLI vem junto
# porque o entrypoint roda `migrate deploy` a cada inicializacao.
COPY package*.json ./
RUN npm ci --omit=dev && npm i prisma@7 tsx --no-save

COPY --from=builder /app/dist ./dist
COPY prisma ./prisma
COPY prisma.config.ts ./
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

EXPOSE 3001
ENTRYPOINT ["./docker-entrypoint.sh"]
