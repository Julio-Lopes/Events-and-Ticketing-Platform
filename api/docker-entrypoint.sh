#!/bin/sh
set -e

# Migrations rodam a cada inicializacao, nao no build.
# No build o banco pode nem estar acessivel; aqui ele esta.
# `migrate deploy` e idempotente: aplica so o que falta, e nao tenta
# gerar migration nova nem comparar com o schema, ao contrario do
# `migrate dev`, que nunca deve tocar um banco de producao.
echo "Aplicando migrations..."
npx prisma migrate deploy

# O seed roda so quando pedido explicitamente, via RUN_SEED=true.
# Ele e destrutivo (apaga tudo antes de recriar), entao rodar em toda
# inicializacao apagaria compras reais a cada restart do container.
if [ "$RUN_SEED" = "true" ]; then
  echo "Semeando dados de demonstracao..."
  npx prisma db seed
fi

echo "Subindo API..."
exec node dist/main
