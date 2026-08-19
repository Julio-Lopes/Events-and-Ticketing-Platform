#!/bin/sh
set -e

echo "Aplicando migrations..."
npx prisma migrate deploy

if [ "$RUN_SEED" = "true" ]; then
  echo "Semeando dados de demonstracao..."
  npx prisma db seed || echo "AVISO: o seed falhou. A API sobe mesmo assim."
fi

echo "Subindo API..."
exec node dist/main