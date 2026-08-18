import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * O guard de JWT e global. Rotas abertas (login, catalogo publico,
 * pagina de ingresso compartilhado) se marcam com @Public().
 * Proteger por padrao e abrir por excecao evita o erro classico
 * de esquecer o guard numa rota nova.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
