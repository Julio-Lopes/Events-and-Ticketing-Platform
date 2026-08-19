# Plataforma de Eventos e Ingressos: API

Backend do Desafio Elite Dev. NestJS, Postgres, Prisma 7.

Organizador publica eventos a partir de um catálogo externo, cliente reserva
e paga, recebe um ingresso com QR, e a portaria valida na entrada.

---

## Como rodar

**O caminho curto é o Docker Compose da raiz**, que sobe banco, API e front de
uma vez: veja [`../README.md`](../README.md). O que segue é o setup manual, para
quem quiser rodar só a API.

Requisitos: Node 22+, Docker (para o Postgres).

```bash
docker compose -f ../docker-compose.yml up -d db

cp .env.example .env
npm install

npx prisma migrate deploy   # as migrations já existem no repositório
npx prisma generate
npx prisma db seed

npm run start:dev           # http://localhost:3001/api
```

### Notas de configuração

Cada uma destas existe porque custou tempo descobrir:

**A porta do banco é 5433, não 5432.** A 5432 costuma estar ocupada por um
Postgres instalado direto na máquina, e nesse caso a aplicação conecta no banco
errado sem dar erro nenhum. Dentro da rede do Compose o endereço segue sendo
`db:5432`.

**Use `migrate deploy`, não `migrate dev`.** As migrations já estão no
repositório, incluindo o índice único parcial escrito à mão. `migrate dev`
tentaria comparar com o schema e gerar migration nova.

Se você precisar **criar** uma migration nova que envolva índice parcial, o
fluxo é `migrate dev --name x --create-only`, editar o SQL gerado, e só então
`migrate dev`. O Prisma não gera esse tipo de índice, e migration já aplicada
não pode ser editada porque o checksum acusa. O SQL do índice atual está em
`prisma/INDICE-PARCIAL.sql`, para referência.

**`migrate dev` não roda `generate` nem `db seed` sozinho.** Isso mudou no
Prisma 7. Os três comandos são separados de propósito.

**O generator usa `moduleFormat = "cjs"`.** Já está no schema. O Prisma 7 gera o
client como ESM por padrão e emite um `package.json` próprio dentro da pasta
gerada declarando isso; o Nest compila para CommonJS, e o runtime quebra com
`exports is not defined in ES module scope`.

**A URL do banco aparece em dois lugares.** Na v7 o campo `url` foi removido do
bloco `datasource` do schema. O `prisma.config.ts` alimenta a CLI (migrate, seed,
studio) e o adapter no `PrismaService` alimenta o runtime. São processos
diferentes lendo a mesma variável de ambiente.

O `prisma.config.ts` também declara o `datasource` **condicionalmente**: em
container, `prisma generate` roda durante o build, quando não há (nem deve
haver) credencial de banco. Ele só lê o schema e gera o client, sem conectar em
nada, então exigir a URL ali fazia o build falhar.

### Validando o fluxo

`scripts/smoke.ps1` percorre a aplicação de ponta a ponta contra a API rodando:

```powershell
.\scripts\smoke.ps1
```

Ele verifica 18 pontos. Os quatro que importam:

```
== Reserva ==
  OK   reservar 2 lugares
  OK   o mesmo lugar nao pode ser reservado de novo      → 409
== Pagamento ==
  OK   cartao de recusa e recusado
  OK   a reserva sobrevive a recusa                      → segue PENDING
== Portaria ==
  OK   QR valido entra                                   → VALID
  OK   o mesmo QR nao entra duas vezes                   → ALREADY_USED
  OK   assinatura adulterada e rejeitada                 → INVALID
  OK   ingresso do evento errado e recusado              → WRONG_EVENT

18 passaram, 0 falharam.
```

Não substitui testes automatizados, e o projeto não os tem. Mas o fluxo foi
validado de ponta a ponta, e os pontos difíceis do desafio estão cobertos.

O script vende dois lugares e os queima na portaria, então rode
`npx prisma db seed` antes de repetir.

## Contas semeadas

Senha de todas: `elite123`

| E-mail | Papel | O que faz |
|---|---|---|
| organizador@elite.dev | ORGANIZER | cria e gerencia eventos |
| cliente1@elite.dev | CUSTOMER | reserva, paga, recebe ingresso |
| cliente2@elite.dev | CUSTOMER | idem, para testar disputa de assento |
| portaria@elite.dev | GATE | valida ingressos na entrada |

## Dados semeados

- **Duna: parte dois**, publicado, setor numerado com 96 lugares a R$ 32
- **Los Hermanos**, publicado, pista (500 lugares, 382 vendidos) e camarote numerado (30 lugares)
- **Hamlet**, rascunho, para o painel do organizador não nascer vazio

O evento do Los Hermanos tem pista e camarote no mesmo evento de propósito: é o
caso que prova que os dois fluxos de reserva convivem no mesmo modelo.

## Cartões de teste

O pagamento é simulado. A recusa é determinística para que dê para percorrer o
caminho de erro sem adivinhar:

| Final do número | Resultado |
|---|---|
| `0000` | recusado, saldo insuficiente |
| `0002` | recusado, cartão bloqueado |
| `0004` | recusado, suspeita de fraude |
| qualquer outro | aprovado |

---

## Percorrendo o fluxo

```
POST /api/auth/login                    { email, password }        → accessToken
GET  /api/events                        vitrine pública, com busca e filtros
GET  /api/events/:id/availability       mapa de assentos e saldo de pista
POST /api/orders                        { eventId, items[] }       → reserva de 10 min
POST /api/orders/:id/payment            { cardNumber, ... }        → ingressos emitidos
GET  /api/tickets/mine                  ingressos com payload do QR e link
POST /api/gate/validate                 { eventId, payload | code }
```

---

## Decisões

### Um setor, dois jeitos de vender

Um evento tem N setores, e o setor decide como o lugar é vendido: `SEATED` tem
linhas na tabela `Seat`, `GENERAL` tem `capacity` e `sold`. Não existem duas
entidades nem dois fluxos paralelos, existe um discriminador.

O ganho não é economia de código, é o caso misto: um show com pista e camarote
funciona sem nada de especial, porque nunca foi tratado como exceção.

### Antioverbooking: dois mecanismos, porque são dois problemas

**Lugar marcado** é uma linha específica sendo disputada. A reserva abre
transação, faz `SELECT ... FOR UPDATE` nos assentos e só então decide. A segunda
requisição espera a primeira terminar e enxerga o lock já gravado. Os ids vão
ordenados antes do lock: sem isso, duas transações travando os mesmos assentos em
ordens diferentes geram deadlock, e o Postgres mata uma delas.

**Pista** é um contador. Um único `UPDATE ... SET sold = sold + n WHERE sold + n
<= capacity` resolve, porque a condição é avaliada dentro do comando e não existe
janela entre ler e escrever. Se não afetou linha, não cabia.

Usar a mesma solução nos dois casos seria pior nos dois: `FOR UPDATE` numa linha
só de contador serializa a venda inteira da pista, e contador não sabe qual
poltrona é qual.

Por cima disso tudo, um índice único parcial no banco:

```sql
CREATE UNIQUE INDEX order_items_seat_confirmed_uniq
  ON "OrderItem" ("seatId")
  WHERE "status" = 'CONFIRMED' AND "seatId" IS NOT NULL;
```

Se a lógica de aplicação falhar por qualquer motivo, o banco recusa. Correção não
depende de eu ter acertado.

### A reserva expira sozinha

A `Order` nasce `PENDING` com `expiresAt` em 10 minutos e o assento fica com
`lockedUntil`. A devolução ao estoque roda sob demanda, no início de toda reserva
e de toda consulta de disponibilidade, não num cron.

O raciocínio: quem veria estoque preso é exatamente quem dispara a limpeza, então
na prática ninguém vê. Evita `@nestjs/schedule` e evita depender de um processo
vivo, o que importa se isso for para um ambiente serverless.

Detalhe fácil de errar pela metade: expirar pista precisa devolver o contador,
expirar assento só precisa soltar o lock. São caminhos distintos.

### Recusa de pagamento não devolve o lugar

O pagamento negado grava um `Payment` com `approved: false` e o pedido continua
`PENDING` até o fim da janela. O cliente troca de cartão sem perder a poltrona.
Cancelar na primeira recusa seria punir o cliente por um problema do banco.

Do cartão sobrevivem apenas os quatro últimos dígitos. Mesmo simulado, persistir
número de cartão seria erro grave.

### O ingresso, e por que ele não pode ser forjado

O QR carrega `<ticketId>.<assinatura HMAC-SHA256>`. O id já é um uuid, então não
é adivinhável; a assinatura resolve outras duas coisas: a portaria rejeita lixo
antes de consultar o banco, e ninguém fabrica um código válido mesmo que os ids
vazem no futuro. A comparação da assinatura é de tempo constante, para não vazar
pelo tempo de resposta quantos caracteres o atacante acertou.

O segredo é o `TICKET_SIGNING_SECRET`, **separado** do `JWT_SECRET`. Se fossem o
mesmo, comprometer a sessão daria o poder de forjar ingresso, e vice-versa. É uma
linha a mais no `.env`.

O código digitável na portaria é outra coisa: dez caracteres num alfabeto sem
`0/O` e sem `1/I/L`, porque alguém vai digitá-lo com pressa numa fila. E o token
do link de compartilhamento é um terceiro valor, com endpoint para girá-lo:
compartilhar dá acesso à entrada, então quem mandou para a pessoa errada precisa
poder invalidar.

O backend devolve o **payload** do QR, não a imagem. Renderizar é trabalho do
front, que já desenha em tela de qualquer jeito.

### A portaria valida uma vez só

O coração é um único comando:

```sql
UPDATE "Ticket" SET status = 'USED' WHERE id = $1 AND status = 'VALID'
```

Quem afeta a linha entrou, quem afeta zero linhas chegou depois. Idempotente por
construção, inclusive contra o duplo clique do operador, que é o caso real mais
frequente. Ler o status e depois gravar deixaria uma janela em que duas leituras
simultâneas do mesmo QR passariam as duas.

**A checagem de evento errado vem antes da marcação.** Se a ordem fosse invertida,
um ingresso legítimo da sessão de amanhã, apresentado por engano hoje, seria
queimado. O cliente perderia a entrada por erro do operador.

Os quatro desfechos (`VALID`, `INVALID`, `ALREADY_USED`, `WRONG_EVENT`) voltam com
HTTP 200 e o resultado no corpo. Não são erros de requisição, são respostas que a
tela pinta de formas diferentes. Devolver 404 ou 409 obrigaria o front a
interpretar mensagem de erro para decidir a cor da tela.

### Duas APIs externas atrás de uma interface

`CatalogProvider` tem duas implementações, `TmdbProvider` e `TicketmasterProvider`.
Nada fora do módulo de catálogo sabe que elas existem.

A parte interessante é a assimetria: o TMDb devolve um **filme**, que não tem data
nem local. O Ticketmaster devolve um **evento**, que já vem com os dois. Em vez de
duas interfaces, o `CatalogItem` tem três campos `suggested*` que ficam nulos no
caso do TMDb. Na prática: escolheu um filme, o organizador preenche sessão e sala;
escolheu um show, o formulário nasce preenchido e ele só ajusta.

O dado externo é sempre **sugestão, nunca verdade**: o que o organizador digitar
vence. Ele pode querer título em português, pôster próprio, sinopse resumida.

Falha de provedor não derruba a busca. O `fanOut` usa `Promise.allSettled` e
devolve `{ items, unavailable }`. Provedor fora do ar é situação normal (chave
ausente, cota estourada, API instável), então o front mostra o que veio e avisa o
que faltou. **Dá para rodar o projeto com só uma das duas chaves configuradas, ou
com nenhuma.**

### Autenticação

Papel único por usuário, como enum. O desafio pede três papéis distintos; RBAC
genérico com tabela de permissões seria arquitetura para um problema que ninguém
tem aqui.

O `JwtAuthGuard` é global: tudo nasce protegido e rota aberta se marca com
`@Public()`. O inverso falha em silêncio, porque você cria uma rota nova, esquece
o guard e ninguém percebe.

O papel é relido do banco a cada request em vez de confiar no claim do token.
Custa uma query e impede que um token emitido antes de uma mudança de papel
continue valendo por 12 horas.

O cadastro público só cria `CUSTOMER`. Contas de organizador e portaria nascem
pelo seed: deixar qualquer um se registrar como portaria tornaria a validação de
ingresso decorativa.

### Regras de edição de evento

Depois que existe venda, mudar a **data** é recusado. Isso não é edição, é outra
história: envolveria avisar quem comprou e permitir reembolso. Está fora do
escopo, então a API recusa em vez de fingir que resolveu.

Despublicar tira da vitrine e nada mais. Ingressos já vendidos continuam válidos
na portaria: quem pagou tem direito de entrar, independente de o organizador ter
mudado de ideia sobre a divulgação.

O organizador descreve a **geometria** do setor (8 fileiras de 12), não os 96
assentos. O servidor gera. Menos tráfego e, principalmente, impossível chegar um
mapa inconsistente pela API.

---

## O que não está feito

- **Testes automatizados.** É a lacuna que mais me incomoda. O `smoke.ps1`
  valida o fluxo de ponta a ponta, mas é sequencial: o teste que mais faria
  falta é o de concorrência real, duas requisições **simultâneas** no mesmo
  assento, esperando um 201 e um 409.
- **Cancelamento com reembolso.** Reserva pendente pode ser cancelada e volta ao
  estoque. Pedido pago, não.
- **Mapa de assentos em tempo real.** A disponibilidade é consultada por
  requisição, sem WebSocket. Duas pessoas escolhendo ao mesmo tempo só descobrem
  o conflito na hora de reservar, e aí uma recebe 409 com mensagem clara.
- **Rate limiting.** Faltou `@nestjs/throttler` no login e na reserva.
- **Cache de catálogo é em memória.** Um `Map` com TTL. Some no restart e não
  serve para múltiplas instâncias. Redis seria o certo, e seria infra a mais para
  o tamanho disto.