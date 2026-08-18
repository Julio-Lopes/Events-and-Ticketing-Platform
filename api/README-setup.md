# Setup da API

## 1. Banco

```bash
docker compose up -d db
```

## 2. Variaveis

```bash
cp .env.example .env
```

`JWT_SECRET` e `TICKET_SIGNING_SECRET` sao deliberadamente separados. Ver decisoes no README principal.

## 3. Dependencias

```bash
npm install
```

## 4. Schema e seed

```bash
npx prisma migrate dev --name init
npx prisma migrate deploy   # aplica tambem o indice unico parcial escrito a mao
npx prisma db seed
```

Adicione ao `package.json`:

```json
"prisma": { "seed": "ts-node prisma/seed.ts" }
```

## 5. Rodar

```bash
npm run start:dev
```

## Contas semeadas

Senha de todas: `elite123`

| E-mail | Papel |
|---|---|
| organizador@elite.dev | ORGANIZER |
| cliente1@elite.dev | CUSTOMER |
| cliente2@elite.dev | CUSTOMER |
| portaria@elite.dev | GATE |

## Dados semeados

- **Duna: parte dois**, publicado, 96 lugares marcados a R$ 32
- **Los Hermanos**, publicado, pista com 118 de 500 restantes e camarote com 30 lugares marcados
- **Hamlet**, rascunho, para o painel do organizador
