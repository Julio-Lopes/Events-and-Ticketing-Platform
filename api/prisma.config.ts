import path from 'node:path';
import { defineConfig, env } from 'prisma/config';

/**
 * Em container as variaveis vem do ambiente e nao existe .env: o
 * .dockerignore o mantem fora da imagem. Carregar dotenv com
 * override: true nesse cenario e perigoso, porque um .env ausente
 * pode sobrescrever a DATABASE_URL que o orquestrador injetou.
 * Localmente o .env existe e continua sendo carregado.
 */
if (!process.env.DATABASE_URL) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { config } = require('dotenv');
  config({ override: true });
}

/**
 * O datasource so e declarado quando a URL existe.
 *
 * `prisma generate` roda durante o BUILD da imagem, quando nao ha (nem
 * deve haver) credencial de banco: ele so le o schema e gera o client,
 * sem conectar em nada. Declarar a url incondicionalmente fazia o
 * generate falhar com PrismaConfigEnvError no build do Railway.
 *
 * Os comandos que REALMENTE precisam de banco (migrate deploy, db seed)
 * rodam no entrypoint, com o ambiente ja populado, e ai a url esta aqui.
 */
export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  migrations: {
    path: path.join('prisma', 'migrations'),
    seed: 'npx tsx prisma/seed.ts',
  },
  ...(process.env.DATABASE_URL
    ? { datasource: { url: env('DATABASE_URL') } }
    : {}),
});