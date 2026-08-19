# Plataforma de Eventos e Ingressos: Front-end

Next.js (App Router), React, TypeScript, Tailwind v4. Consome a API em `../api`.

**No ar:** https://events-and-ticketing-platform.vercel.app

---

## Como rodar

**O caminho curto é o Docker Compose da raiz**, que sobe banco, API e front de
uma vez: veja [`../README.md`](../README.md). O que segue é o setup manual.

Requisitos: Node 22+, e a API rodando (ver [`../api/README.md`](../api/README.md)).

```bash
cp .env.example .env.local
npm install
npm run dev            # http://localhost:3000
```

### Variáveis de ambiente

```
NEXT_PUBLIC_API_URL="http://localhost:3001/api"
```

Em produção, aponte para a URL pública da API. Lembre de ajustar também o
`APP_URL` no `.env` da API, que é a origem liberada no CORS e a base dos links
de compartilhamento de ingresso.

### Uma API, dois endereços

Rodando por Docker existe uma segunda variável, `INTERNAL_API_URL`, e a razão
dela é a decisão de Server vs Client Component descrita abaixo.

`NEXT_PUBLIC_API_URL` é substituída no código em tempo de **build** e vai
embutida no bundle: quem a executa é o navegador, que está fora da rede do
Docker e só enxerga `localhost:3001`.

`INTERNAL_API_URL` é lida em tempo de **execução** pelo servidor Next, que
renderiza o catálogo como Server Component. De dentro do container, `localhost`
apontaria para o próprio front; a API está em `api:3001`, pelo DNS do Compose.

O mesmo código roda em dois contextos de rede diferentes e precisa saber disso.
Fora do Docker (dev local, Vercel) `INTERNAL_API_URL` não existe e as duas
resolvem para o mesmo valor.

## Telas

| Rota | Quem acessa | O que faz |
|---|---|---|
| `/` | público | catálogo com busca por título, local ou cidade |
| `/eventos/[id]` | público | detalhe, mapa de assentos e escolha de pista |
| `/login` | público | entrar, com atalhos para as contas semeadas |
| `/pedidos/[id]` | cliente | pagamento simulado, com cronômetro da reserva |
| `/meus-ingressos` | cliente | ingressos com QR e link de compartilhamento |
| `/portaria` | portaria | leitura por câmera e código digitado |
| `/organizador` | organizador | painel: publicar, despublicar, excluir |
| `/organizador/novo` | organizador | criar evento a partir do catálogo externo |

---

## Identidade visual

A direção se chama **canhoto noturno**: estrutura de bilhete impresso (picote
com furos, serial em mono, canhoto destacável com o preço, selos retangulares de
status, carimbo torto no esgotado) sobre papel escuro quente, com âmbar como
única cor de ação.

### Por que essa e não outra

Foram desenhadas três direções antes de escrever qualquer componente.

A primeira, **bilheteria**, era papel creme com tinta preta e vermelha,
tipografia condensada, tudo remetendo a canhoto impresso. Coerente com o
domínio, mas soava nostálgica demais para um produto de venda, e não comportava
bem os pôsteres que as APIs devolvem.

A segunda, **marquise**, era fundo quase preto com âmbar de letreiro de cinema.
Confortável para quem compra e ótima para exibir arte de filme, mas dark mode é
território onde o genérico mora: sem disciplina, vira a mesma tela que qualquer
ferramenta gera.

A terceira, **editorial**, era grade suíça em branco e preto com um vermelho de
sinalização. A mais autoral das três, e a mais arriscada. Foi descartada por um
motivo prático: quase não comporta imagem, o que desperdiça metade do que TMDb e
Ticketmaster entregam.

A escolhida é um híbrido da primeira com a segunda. Fica com a **estrutura** da
bilheteria e o **material** da marquise. O ganho concreto não é estético, é de
economia: como o card do catálogo já é um canhoto, as telas de "meus ingressos"
e da portaria herdam a mesma linguagem sem inventar layout novo. Uma decisão de
identidade que também é decisão de arquitetura de componente.

### Tokens

Todo o tema vive no bloco `@theme` do `src/app/globals.css`. **Não existe
`tailwind.config.ts` neste projeto**: o Tailwind v4 usa configuração via CSS, e
qualquer `--color-*` declarado ali vira automaticamente `bg-*`, `text-*` e
`border-*`.

Tipografia: Archivo nos títulos e no corpo, IBM Plex Mono em códigos, preços,
datas e rótulos. O mono não é decoração: ele marca tudo que é **dado de
bilhete**, em oposição ao que é conteúdo editorial.

### O picote é pintado, não recortado

O divisor tracejado com furos nas pontas (`.stub-divider`) usa círculos pintados
com a cor exata do fundo da página, não uma máscara que recorta o cartão de
verdade.

A solução tecnicamente superior seria `mask-composite`, que abriria um buraco
real e funcionaria sobre qualquer fundo. Foi descartada por ser CSS com
comportamento inconsistente entre navegadores, e sem poder testar em todos eles
não valia o risco.

A escolha tem uma consequência documentada: **`.stub-divider` só pode viver
diretamente sobre `--color-bg`**. Aninhado num painel de outra cor, os furos
apareceriam como bolinhas erradas. Se isso um dia for necessário, é a hora de
migrar para a versão com máscara.

---

## Decisões

### Sessão no cliente, não em cookie httpOnly

O token fica em `localStorage` e vai como `Authorization: Bearer`.

Cookie `httpOnly` seria mais seguro contra XSS, mas a API roda em origem
diferente do front (portas distintas em dev, provavelmente domínios distintos em
produção), o que exigiria `SameSite=None` mais `Secure`, que quebra em
`localhost` sem HTTPS, mais configuração de proxy. Custo alto para um projeto de
7 dias.

O preço pago: páginas autenticadas não podem ser renderizadas no servidor. Não
pesa aqui, porque as duas rotas que mais se beneficiariam disso, o catálogo e o
ingresso compartilhado, são públicas e continuam sendo Server Component.

### O que é Server e o que é Client Component

Regra simples: **rota pública é Server Component, rota autenticada é Client**.

Catálogo e detalhe do evento renderizam no servidor, sem esperar hidratação.
Pagamento, meus ingressos, portaria e painel são inteiramente client-side,
porque o token que autoriza a busca só existe no navegador.

### `ready` evita um flash de redirecionamento

`localStorage` não existe na primeira renderização. Sem um sinalizador
explícito de "já tentei ler a sessão salva", toda tela protegida chutaria o
usuário para o login por uma fração de segundo antes de recuperar a sessão.

### 401 desloga na hora

O wrapper `useAuthedFetch` intercepta 401 e limpa a sessão. Um token expirado
não deve deixar a interface num estado autenticado mentiroso, esperando o
próximo clique falhar.

### O "voltar" nunca usa `router.back()`

Cada tela aponta para um destino explícito. `router.back()` depende do histórico
do navegador, e alguém que abra `/pedidos/[id]` direto por um link salvo (ao
retomar um pagamento pendente, por exemplo) não tem histórico nenhum: o botão
falharia em silêncio ou levaria para fora do site.

### O mapa de assentos não guarda estado

`SeatGrid` só desenha o que recebe e avisa cliques. Quem decide se um clique é
permitido é o `PurchaseBuilder`. Uma única fonte de verdade sobre o que está
selecionado.

O limite de 8 itens por pedido no front é de **UX, não de validação**: a API
permite até 10 por setor e 5 setores. O front só evita que alguém monte um
carrinho gigante numa interface pensada para compra rápida; a API continua sendo
a fonte de verdade sobre o que é permitido.

### Recusa de pagamento não limpa o formulário

O pedido continua `PENDING` no servidor até o prazo acabar, então trocar o
cartão e tentar de novo, no mesmo pedido, é o caminho esperado. O front respeita
isso: mostra o motivo da recusa e mantém tudo no lugar.

O cronômetro é **apenas visual**. Quem decide se o prazo acabou é a API, no
momento do pagamento. Relógio errado no navegador do usuário, no pior caso,
mostra um tempo levemente impreciso, nunca autoriza um pagamento que deveria ter
expirado.

### O QR é gerado no navegador

`qrcode.react` desenha um SVG localmente. Nenhum serviço externo é chamado, e
isso é deliberado: o payload do QR é assinado e é o que a portaria confia.
Mandá-lo para uma API de terceiros só para virar imagem seria expor exatamente o
dado que não pode vazar.

O QR fica sobre `--color-paper`, um fundo claro dedicado, porque leitura de
câmera exige contraste de módulo escuro sobre claro, que a paleta escura do app
não entrega. É um token próprio, não `--color-ink` reaproveitado: hoje têm o
mesmo valor, mas significam coisas diferentes e podem divergir.

Ingresso usado ou cancelado **perde o QR** e ganha o carimbo torto. Não faz
sentido exibir código escaneável para algo que não vale mais.

### Portaria: falha de rede nunca vira "INVÁLIDO"

O estado de erro de conexão é separado do resultado da validação. Se a chamada
falhar, a tela mostra um aviso neutro de "não foi possível verificar", nunca o
veredito vermelho.

Confundir os dois seria grave: um cliente com ingresso legítimo barrado por um
problema de rede, sem forma de saber que o problema não era o ingresso dele.

Dois detalhes técnicos da leitura por câmera:

O loop de decodificação roda em `requestAnimationFrame`, fora do ciclo de render
do React. Ele lê a fase atual de uma `ref`, não do estado: o efeito que abre a
câmera roda uma vez só, e uma closure sobre o estado ficaria congelada no valor
inicial, deixando o leitor preso na primeira fase para sempre.

Existe uma trava contra chamadas duplicadas. O loop roda cerca de 30 vezes por
segundo e uma resposta pode demorar mais que um frame; sem a trava, o mesmo QR
dispararia uma rajada de requisições antes da primeira resposta voltar.

A última sessão escolhida fica salva: um operador recarrega a página várias
vezes durante um turno, e reescolher o evento toda vez seria atrito numa fila
com gente esperando.

### Catálogo externo preenche, nunca trava

Escolher um filme do TMDb popula o formulário e todos os campos continuam
editáveis. Mesma postura do backend: dado externo é sugestão. O organizador pode
querer título em português, pôster próprio, ou corrigir um local errado.

Quando um provedor está sem chave ou fora do ar, a tela **diz qual**. Provedor
indisponível é informação útil, não erro a esconder: sem isso, o organizador não
saberia por que um resultado esperado não apareceu.

### `<img>` em vez de `next/image`

Os pôsteres vêm de hosts de terceiros que mudam de evento para evento.
`next/image` exige declarar cada domínio de antemão no `next.config`, o que não é
possível para um provedor externo imprevisível. Trocaria por `next/image` se a
plataforma passasse a hospedar as próprias imagens.

---

## O que não está feito

- **Testes automatizados.** É a maior lacuna do projeto como um todo. Do lado do
  front, o teste que mais faria falta é o do fluxo de reserva até o pagamento.
- **Fuso horário no cadastro de evento.** O `<input type="datetime-local">` não
  carrega fuso, e a conversão interpreta a data no fuso do navegador de quem
  preenche. Para organizadores brasileiros o resultado está correto; alguém
  cadastrando de outro fuso registraria no horário local dele. A **exibição**,
  essa sim, é sempre fixada em `America/Sao_Paulo`, então a data que o cliente
  vê não muda conforme onde o servidor roda.
- **Mapa de assentos em tempo real.** Sem WebSocket. Duas pessoas escolhendo ao
  mesmo tempo só descobrem o conflito ao reservar, e aí uma recebe uma mensagem
  clara de que o lugar acabou de sair.
- **Acessibilidade além do básico.** Há foco visível em âmbar e `role="alert"`
  nas mensagens de erro, mas o mapa de assentos não foi testado com leitor de
  tela e provavelmente precisa de mais contexto por assento.
- **Edição de evento pelo painel.** A API tem `PATCH /events/:id`, o front só
  publica, despublica e exclui.
- **CORS aberto para previews.** A API aceita qualquer subdomínio
  `*.vercel.app`, porque a Vercel gera uma URL nova a cada deploy e fixar uma
  única origem quebraria o front a cada push. Num sistema real, previews teriam
  domínio próprio em vez dessa abertura.
- **Chave do Ticketmaster.** O provider está implementado e a arquitetura
  suporta os dois; na entrega, apenas o TMDb está com chave configurada. Basta
  preencher `TICKETMASTER_API_KEY` na API para o segundo entrar em operação.