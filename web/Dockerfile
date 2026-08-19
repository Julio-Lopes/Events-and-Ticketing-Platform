# ---------- build ----------
FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# NEXT_PUBLIC_* e embutido no bundle em tempo de BUILD, nao lido em
# runtime: por isso entra como ARG aqui, e nao so como variavel de
# ambiente do container. Mudar essa URL exige rebuild da imagem.
ARG NEXT_PUBLIC_API_URL=http://localhost:3001/api
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build

# ---------- runtime ----------
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Saida standalone do Next: traz so o necessario para rodar, sem o
# node_modules inteiro. Exige output: "standalone" no next.config.
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["node", "server.js"]