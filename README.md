# Desafio Elite Dev: Plataforma de Eventos e Ingressos

Organizador publica eventos a partir de um catálogo externo (TMDb ou
Ticketmaster), cliente reserva um lugar, paga de forma simulada e recebe um
ingresso com QR, e a portaria valida na entrada.

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

```bash
# 1. Banco
cd api
docker compose up -d db

# 2. API
cp .env.example .env
npm install
npx prisma migrate dev --name init --create-only
# cole prisma/INDICE-PARCIAL.sql no final da migration gerada
npx prisma migrate dev
npx prisma generate
npx prisma db seed
npm run start:dev          # http://localhost:3001/api

# 3. Front, em outro terminal
cd ../web
cp .env.example .env.local
npm install
npm run dev                # http://localhost:3000
```

Passo a passo detalhado, com o porquê de cada decisão de configuração, em
[`api/README.md`](./api/README.md) e [`web/README.md`](./web/README.md).

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

_A preencher quando a aplicação for publicada._

## Status

- [x] Backend completo e validado (`api/README.md`)
- [x] Frontend completo (`web/README.md`)
- [ ] Deploy

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
| Docker Compose | feito, para o banco |
| Busca e filtro de eventos | feito |
| Painel do organizador | feito |
| Cancelamento com devolução ao estoque | feito, para reservas pendentes |
| Testes automatizados | não feito |
| Mapa de assentos em tempo real | não feito |
| Deploy | pendente |

---

Feito para o Desafio Elite Dev, prazo de 7 dias corridos a partir do
recebimento.