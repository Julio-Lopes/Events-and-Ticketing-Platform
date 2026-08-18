/**
 * Ponto unico de import do Prisma Client.
 *
 * Na v7 o client e gerado dentro de src/generated/prisma em vez de
 * node_modules, entao todo import vira caminho relativo. Reexportar aqui
 * evita espalhar '../../generated/prisma/client' por dezenas de arquivos:
 * se o output mudar, so este arquivo muda.
 */
export * from '../generated/prisma/client';
