# Desafio Elite Dev: Plataforma de Eventos e Ingressos

Organizador publica eventos a partir de um catálogo externo (TMDb ou
Ticketmaster), cliente reserva um lugar, paga de forma simulada e recebe um
ingresso com QR, e a portaria valida na entrada.

**Aplicação no ar:** https://events-and-ticketing-platform.vercel.app
**API:** https://hopeful-patience-production-33d4.up.railway.app/api

Entre com `cliente1@elite.dev` e senha `elite123` para percorrer o fluxo de
compra, ou `portaria@elite.dev` para validar um ingresso na entrada.

Monorepo simples, duas pastas, sem workspace compartilhado: `api` (NestJS) e
`web` (Next.js) são projetos independentes que conversam por HTTP.

```
elite-dev-tickets/
  api/    backend NestJS + Prisma 7 + Postgres     → api/README.md
  web/    frontend Next.js                          → web/README.md
```

Este README dá a visão geral e o caminho mais curto para rodar tudo. As
decisões de cada lado, com a justificativa, estão nos READMEs de cada pasta.

---

## Rodando o projeto inteiro

Requisitos: Docker.

```bash
cp .env.docker.example .env    # opcional: sem isto, valores padrão são usados
docker compose up --build
```

Front em http://localhost:3000, API em http://localhost:3001/api.

É só isso. O Compose sobe o Postgres, espera ele aceitar conexão, aplica as
migrations, semeia os dados de demonstração e então sobe API e front. O primeiro
build leva alguns minutos; as subidas seguintes são rápidas.

Para preencher `TMDB_API_KEY` no `.env` e habilitar a busca no catálogo externo,
uma chave gratuita sai em minutos em themoviedb.org. Sem ela a aplicação funciona
normalmente: o provedor se declara indisponível e a tela avisa qual faltou.

Para rodar cada parte separadamente, sem Docker, veja
[`api/README.md`](./api/README.md) e [`web/README.md`](./web/README.md).

### Duas coisas que valem saber sobre esse Compose

**O front conhece a API por dois endereços diferentes.** `NEXT_PUBLIC_API_URL`
é embutida no bundle e usada pelo navegador, que está fora da rede do Docker e
só enxerga `localhost:3001`. `INTERNAL_API_URL` é lida em tempo de execução pelo
servidor Next, que renderiza o catálogo como Server Component e alcança a API
pelo nome do serviço, `api:3001`. Uma variável só não atenderia os dois: de
dentro do container, `localhost` aponta para o próprio front.

**O seed roda a cada subida, e aqui isso é proposital.** Ele é destrutivo, limpa
tudo antes de recriar, e por isso está desligado no ambiente publicado. Local, o
efeito desejado é o oposto: `docker compose up` devolve o banco a um estado
conhecido, com os mesmos dados descritos abaixo.

## Contas semeadas

Senha de todas: `elite123`

| E-mail | Papel |
|---|---|
| organizador@elite.dev | ORGANIZER |
| cliente1@elite.dev | CUSTOMER |
| cliente2@elite.dev | CUSTOMER |
| portaria@elite.dev | GATE |

Cartões de teste e dados semeados detalhados em `api/README.md`.

---

## Stack

| Camada | Escolha |
|---|---|
| Front-end | Next.js (App Router), React, TypeScript |
| Back-end | NestJS, TypeScript |
| Banco | PostgreSQL, Prisma 7 |
| Catálogo externo | TMDb e Ticketmaster, os dois |
| Reserva | lugar marcado e pista, os dois fluxos |
| Auth | JWT, três papéis (organizador, cliente, portaria) |

## O que foi priorizado

O enunciado é explícito: o volume entregue importa menos do que as decisões
por trás dele. Duas ficaram acima do resto, porque são onde a maioria das
implementações rápidas erra:

- **Não vender o mesmo lugar duas vezes**, com mecanismo diferente para
  assento numerado e para pista, e um índice único no banco como rede de
  segurança caso a lógica de aplicação falhe.
- **Ingresso que não pode ser forjado**, com QR assinado por HMAC e
  validação na portaria por um único `UPDATE` condicional, à prova de duplo
  clique.

O detalhamento de ambos, com o SQL e o raciocínio, está em
[`api/README.md`](./api/README.md#decisões).

## Identidade visual

Direção "canhoto noturno": estrutura de bilhete impresso (picote, serial em
mono, canhoto destacável, selos de status) sobre papel escuro quente, com
âmbar como única cor de ação. A justificativa da escolha e as alternativas
descartadas estão em [`web/README.md`](./web/README.md#identidade-visual).

## Deploy

| Peça | Onde | URL |
|---|---|---|
| Front | Vercel | https://events-and-ticketing-platform.vercel.app |
| API | Railway, via Dockerfile | https://hopeful-patience-production-33d4.up.railway.app/api |
| Banco | Neon (Postgres gerenciado) | — |

O banco de produção já está semeado com as mesmas contas e eventos do seed
local, então dá para percorrer o fluxo inteiro sem configurar nada.

Uma observação sobre o ambiente publicado: a Vercel gera uma URL nova a cada
deploy de preview, então o CORS da API aceita qualquer subdomínio
`*.vercel.app` além da URL de produção. É uma abertura consciente para um
projeto de avaliação; em produção real, previews mereceriam um domínio próprio.

## Status

- [x] Backend completo e validado (`api/README.md`)
- [x] Frontend completo (`web/README.md`)
- [x] Deploy (Vercel + Railway + Neon)

### Requisitos do enunciado

| Requisito | Status |
|---|---|
| Navegação e busca pelos eventos publicados | feito |
| Criação e gerenciamento de eventos pelo organizador | feito |
| Reserva com mapa de assentos | feito |
| Reserva por quantidade (pista) | feito |
| Pagamento simulado, com confirmação e recusa | feito |
| Área de "Meus ingressos" com QR | feito |
| Tela de portaria com os quatro desfechos | feito |
| Leitura do QR pela câmera | feito |
| Digitação manual do código como alternativa | feito |
| Integração com API externa | TMDb ativo; Ticketmaster implementado, sem chave |
| Autenticação com três papéis | feito |
| Garantia de não vender o mesmo lugar duas vezes | feito, em duas camadas |
| QR que não pode ser forjado | feito, HMAC com segredo próprio |
| Compartilhamento de ingresso por link | feito, com rotação de token |
| Validação sem repetição na portaria | feito, `UPDATE` condicional |
| Dados de teste semeados | feito |
| Docker Compose | feito, projeto inteiro em um comando |
| Busca e filtro de eventos | feito |
| Painel do organizador | feito |
| Cancelamento com devolução ao estoque | feito, para reservas pendentes |
| Testes automatizados | não feito |
| Mapa de assentos em tempo real | não feito |
| Deploy | feito |

---

Feito para o Desafio Elite Dev, prazo de 7 dias corridos a partir do
recebimento.