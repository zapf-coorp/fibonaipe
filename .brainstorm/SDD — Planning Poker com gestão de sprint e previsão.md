# SDD — Planning Poker com gestão de sprint e previsão

Versão 0.1 · 23/10/2026 · Design e especificação de tarefas para desenvolvimento agêntico · Deriva dos Requisitos v0.1

## 0. Como usar este documento

Este SDD transforma os requisitos em decisões de design verificáveis e em tarefas pequenas, independentes e testáveis, pensadas para agentes de código: uma tarefa por vez, uma branch e um PR por tarefa. Em caso de conflito, vale esta ordem: (1) seções 1 a 6 deste SDD, (2) a especificação da tarefa, (3) os requisitos v0.1.

**Convenções**

- IDs: RF e RNF vêm dos requisitos. D-xx são decisões de design, INV-xx são invariantes de domínio, EVT-xx são eventos e T-xxx são tarefas.
- Prioridade M/S/C e releases R1–R4 seguem os requisitos. Este SDD acrescenta a **R0 (fundação)**, que não entrega funcionalidade, mas destrava todas as outras.
- 🟡 marca um default assumido para um ❓ dos requisitos. Pode ser revertido sem refazer a arquitetura.

**Regras para agentes (valem para toda tarefa)**

1. Antes de codar, leia: esta seção 0, as seções do SDD citadas em «Contexto» e a especificação completa da tarefa.
2. Faça só o que a tarefa pede. O que está em «Fora do escopo» pertence a outra tarefa; não antecipe.
3. Respeite a regra de dependência da seção 2. O pacote `domain` nunca importa framework, banco, rede, relógio ou aleatoriedade: recebe tudo por parâmetro.
4. Teste primeiro: escreva os testes listados na tarefa (derivados dos critérios de aceite) e só depois implemente.
5. Termine rodando `pnpm verify` (lint, tipos, fronteiras, testes e, quando houver UI, acessibilidade). Tarefa só está pronta com verify verde.
6. Todo texto de interface sai de chave de i18n (RNF-11). Nunca texto fixo em componente.
7. Ambiguidade ou conflito: não adivinhe. Registre em `docs/questions.md` (tarefa, dúvida, opções, default escolhido) e siga com o default mais conservador.
8. Não altere este SDD. Ao concluir, descreva no PR o status dos critérios de aceite e liste os arquivos criados.
9. PR pequeno, com commits semânticos (`feat(domain): ...`, `test(application): ...`).
10. Sem nova dependência de runtime sem justificativa no PR (peso de bundle RNF-02, licença, custo RNF-20). O pacote `domain` tem zero dependências de runtime.

**Definição de pronto (DoD) de toda tarefa**

- Critérios de aceite atendidos e testes passando em CI.
- Cobertura de linhas ≥ 90% em `domain` e `application`; testes de contrato passando para todo adapter tocado.
- Sem `any` e sem `ts-ignore` sem comentário justificando.
- Itens de i18n, acessibilidade e segurança da seção 7 verificados quando houver UI ou endpoint.
- API pública nova documentada (TSDoc ou README do pacote).

**Modelo de especificação de tarefa**

Release/Prio · Cobre (RF/RNF) · Depende de · Contexto · Entregáveis · Comportamento · Aceite (Dado/Quando/Então) · Testes · Fora do escopo.

## 1. Decisões de design

| ID | Decisão | Motivo |
| --- | --- | --- |
| D-01 | Monorepo pnpm, TypeScript estrito, Node LTS. | Fronteiras entre pacotes verificáveis por ferramenta; o agente trabalha em um pacote por vez. |
| D-02 | Front-end SvelteKit (SSR + PWA), mobile first. | Bundle inicial pequeno (RNF-02). A escolha fica confinada a `apps/web`. |
| D-03 | Toda escrita passa por endpoints do servidor que chamam casos de uso. O navegador nunca grava direto no banco. Row Level Security ativa e sem policies para o papel anônimo (defesa em profundidade). | Autorização no servidor (RNF-13) e ocultação de votos (D-05). |
| D-04 | Postgres gerenciado (Supabase ou Neon) atrás da porta `Persistence`; query builder tipado e migrações versionadas em SQL puro. | RNF-17 e RNF-23. |
| D-05 | **Valor de voto nunca trafega em canal de tempo real antes da revelação.** Eventos carregam só «quem votou». Os valores saem do servidor apenas no snapshot posterior à revelação. | Impede vazamento por inspeção de rede. |
| D-06 | Tempo real = evento versionado + snapshot. O evento diz «a sala está na versão N». Se `N == local + 1` o cliente aplica o delta; caso contrário, busca o snapshot. O polling usa o mesmo endpoint de snapshot. | RNF-05; troca de provedor trivial (RNF-17). |
| D-07 | Serialização por sala: todo caso de uso que muda uma sala roda em transação que trava a linha da sala (`FOR UPDATE`) e incrementa `Room.version` ao confirmar. | Evita corrida entre votos, revelação e nova rodada. |
| D-08 | `Clock` e `IdGenerator` injetados. Tudo em UTC. IDs de entidade em ULID. | Testes determinísticos; RNF-23. |
| D-09 | Código de sala: 8 caracteres do alfabeto `23456789ABCDEFGHJKMNPQRSTUVWXYZ` (31 símbolos, sem ambíguos), gerado por CSPRNG (≈ 8,5×10¹¹ combinações). | RNF-12. |
| D-10 | Sessão de convidado: token opaco de 256 bits em cookie `httpOnly`, `Secure`, `SameSite=Lax`. O banco guarda só o hash SHA-256. Expira junto com a sala. | RF-02, RNF-13. |
| D-11 | Gráficos em SVG próprio e leve, sempre acompanhados de tabela acessível equivalente. | RNF-02 e RNF-08. |
| D-12 | i18n por arquivos de mensagens (ex.: Paraglide), chaves `area.tela.elemento`, PT-BR padrão, datas e números via `Intl`. | RNF-11. |
| D-13 | Presença: usa o recurso de presença do provedor; no modo polling, heartbeat HTTP a cada 20 s e `online = lastSeenAt ≤ 45 s`. O snapshot sempre traz `online` calculado no servidor. | RF-22 e fallback de RNF-05. |
| D-14 | Host offline por mais de 60 s com outro participante online → transferência automática (facilitador delegado primeiro; depois maior prioridade de papel PM > PO > Dev > QA > Observador; desempate por entrada mais antiga). | RF-23. |

**🟡 Defaults assumidos para o backlog vivo (seção 10 dos requisitos)**

| ❓ | Default | Se mudar |
| --- | --- | --- |
| 1. Ferramenta de backlog | Indefinida. A tarefa T-405 (primeira integração real) fica **bloqueada** até a decisão; as demais seguem. | Só o adapter novo muda. |
| 2. PO/PM votam? | Não, mas configurável por sala (`votingRoles`). | Constante de default. |
| 3. Voto individual no histórico | Por pessoa por padrão; o time pode optar por agregado (`storeVotesPerPerson`). | Configuração do time. |
| 4. Pontos parciais | Não. Pontos contam na sprint em que o item é concluído. | Regra da seção 6. |
| 5. Escala | Padrão no time, ajustável na sala. | Nenhum impacto estrutural. |
| 6. Nome e domínio | Constante `PRODUCT_NAME` (valor provisório). | Config e textos de i18n. |
| 7. Licença | Sem arquivo de licença até decidir (todos os direitos reservados). O CI verifica que as dependências têm licenças permissivas. | Adicionar LICENSE. |
| 8. Retenção anônima | 7 dias sem uso, constante `ANON_ROOM_TTL_DAYS`. | Valor da constante. |

## 2. Arquitetura

```
domain  ←  application  ←  adapters  ←  apps/web (composition root)
```

- **domain**: entidades, value objects, políticas de permissão, cálculos e builders. TypeScript puro, zero dependências.
- **application**: casos de uso (orquestração) e **definição das portas**. Depende só de `domain`.
- **adapters**: implementam portas. Cada um depende de `application` (tipos da porta) e da biblioteca externa. Um adapter nunca importa outro adapter.
- **apps/web**: UI, endpoints HTTP e o composition root (`src/lib/server/composition.ts`), único lugar que escolhe qual adapter usar.

```
/
├─ AGENTS.md                         # resumo da seção 0
├─ docs/questions.md                 # dúvidas registradas por agentes
├─ packages/
│  ├─ domain/
│  ├─ application/                   # use-cases/ e ports/
│  ├─ testing/                       # fakes em memória e suítes de contrato
│  ├─ adapter-persistence-postgres/
│  ├─ adapter-realtime-supabase/
│  ├─ adapter-auth-supabase/
│  ├─ adapter-issuetracker-manual/
│  ├─ adapter-exporter-csvjson/
│  └─ adapter-system/                # Clock e IdGenerator reais
└─ apps/web/
```

**Padrões obrigatórios**

- **Result em vez de exceção** para erros esperados: casos de uso retornam `Result<T, AppError>`. `AppError` tem `code` estável (enum), `params` e é mapeado para HTTP e para chave de i18n.
- **Builders** (`RoomBuilder`, `RoomSettingsBuilder`, `SprintBuilder`, `ForecastReportBuilder`): métodos encadeáveis com defaults válidos; `build()` valida invariantes e retorna `Result`. Os fakes de teste usam os mesmos builders.
- **Um adapter por porta no MVP**, mais o fake em `packages/testing`. Generalizar só quando surgir o segundo caso real (risco 7).
- **Contrato por porta**: cada porta tem uma suíte de testes de contrato em `packages/testing/contracts`, executada contra o fake e contra o adapter real.

## 3. Modelo de domínio

| Entidade | Campos-chave | Observações |
| --- | --- | --- |
| Organization | id, name | Uma implícita no MVP (RF-14). |
| User | id, email, displayName, status (active, suspended), isSuperAdmin, locale, theme | Criado no primeiro login. |
| Team | id, organizationId, name, settings {defaultScaleId, storeVotesPerPerson, defaultVotingRoles} |  |
| Membership | userId, teamId, role (TeamAdmin, PM, PO, Dev, QA, Observer) | Chave (userId, teamId). |
| Room | id, code, name, kind (guest, team), teamId?, hostParticipantId, scale, settings, status (open, closed), version, lastActivityAt, expiresAt? | `version` é o relógio da sala (D-06, D-07). |
| RoomSettings | votingRoles\[\], autoReveal, showAverage, timerSeconds?, allowObserverComments, maxParticipants (30) |  |
| Participant | id, roomId, userId?, guestSessionId?, nickname, role, canVote, isFacilitator, joinedAt, lastSeenAt | Convidado tem guestSessionId; logado tem userId. |
| Scale | id, name, cards \[{label, numeric?, special?}\] | Embutidas: fibonacci, fibonacciModified, powersOf2, tshirt; mais custom. |
| Item | id, roomId, teamId?, title, description, externalUrl?, externalKey?, position, status (pending, current, estimated, skipped, deferred), finalEstimate?, sprintId?, doneAt?, carriedOver |  |
| Round | id, itemId, number, status (voting, revealed), startedAt, revealedAt?, timerEndsAt? |  |
| Vote | roundId, participantId, card, comment?, castAt |  |
| EstimateAudit | itemId, changedBy, at, from, to | RF-65. |
| Sprint | id, teamId, name, startDate, endDate, goal, status (planned, active, closed), committedPoints?, deliveredPoints?, frozenMetrics? |  |
| CapacityEntry | sprintId, userId, absenceDays, focusPct | Dias úteis derivados (seção 6). |
| Holiday | teamId, date, name | RF-75. |
| ForecastRecord | sprintId, predicted, low, high, delivered?, errorPct? | Gravado no encerramento (RF-84). |

**Invariantes (cada uma vira teste de domínio)**

- INV-01: sala aceita no máximo 30 participantes (observadores contam). A 31ª entrada falha com `ROOM_FULL`. Reconexão de quem já é participante não conta como nova entrada.
- INV-02: toda sala tem exatamente um host (D-14 cobre host ausente).
- INV-03: um participante tem no máximo um voto por rodada, e só participante com `canVote` vota.
- INV-04: voto só é criado, alterado ou retirado com `Round.status = voting`.
- INV-05: revelar é irreversível. Nova rodada cria `Round n+1` e preserva as anteriores (RF-45).
- INV-06: o valor do voto pertence às cartas da escala da sala ou às cartas especiais (?, ☕, ∞).
- INV-07: só host ou facilitador define a estimativa final; ela pode divergir da média, mas deve ser uma carta numérica da escala.
- INV-08: no máximo um item `current` por sala e no máximo uma rodada `voting` por item.
- INV-09: alterar uma estimativa final já definida grava `EstimateAudit`.
- INV-10: sprint encerrada é imutável (métricas congeladas).
- INV-11: um item pertence a no máximo uma sprint não encerrada por vez.
- INV-12: pontos entregues = soma das estimativas finais numéricas dos itens `Done` da sprint; item não concluído vale zero e vira carry-over.
- INV-13: sala de convidado não grava histórico permanente e expira em `ANON_ROOM_TTL_DAYS` sem uso.
- INV-14: apelido com 1 a 30 caracteres, sem caracteres de controle, único na sala sem diferenciar maiúsculas (`NICKNAME_TAKEN`).

## 4. Portas (contratos)

Definidas em `packages/application/src/ports`. Assinaturas de referência; o agente pode refinar tipos, mas não o significado.

```ts
export interface Clock { now(): Date }
export interface IdGenerator {
  newId(): string          // ULID
  newRoomCode(): string    // D-09
  newToken(): string       // 256 bits, base64url
}

export interface Persistence {
  /** Transação; com lockRoomId trava a sala e incrementa Room.version ao confirmar (D-07). */
  transaction<T>(opts: { lockRoomId?: string }, fn: (r: Repositories) => Promise<T>): Promise<T>
}
export interface Repositories {
  rooms: RoomRepository
  items: ItemRepository
  // R2: users, teams, memberships, history · R3: sprints, holidays · R4: forecasts
}

export interface RealtimePublisher {            // lado servidor
  publish(roomId: string, event: RoomEvent): Promise<void>
}
export interface RealtimeClient {                // lado navegador
  subscribe(roomCode: string, h: {
    onEvent(e: RoomEvent): void
    onPresence(p: PresenceEntry[]): void
    onStatus(s: 'connected' | 'reconnecting' | 'polling'): void
  }): () => void
}

export interface AuthProvider {                  // R2
  sendMagicLink(email: string, redirectTo: string): Promise<Result<void, AuthError>>
  startGoogleSignIn(redirectTo: string): Promise<{ url: string }>
  completeSignIn(params: Record<string, string>): Promise<Result<AuthIdentity, AuthError>>
  getIdentity(req: RequestLike): Promise<AuthIdentity | null>
  signOut(req: RequestLike): Promise<void>
  deleteIdentity(userId: string): Promise<Result<void, AuthError>>
}

export interface IssueTracker {
  readonly kind: string                                           // 'manual-csv'
  importItems(src: ImportSource): Promise<Result<ExternalItem[], ImportError>>
  writeEstimate?(ref: ExternalRef, points: number): Promise<Result<void, ImportError>> // pós-MVP
}

export interface Exporter {
  readonly format: 'csv' | 'json' | 'pdf'
  export(dataset: ExportDataset): Promise<ExportedFile>
}
```

**Contratos de comportamento que os adapters devem cumprir**

- `Persistence.transaction` com `lockRoomId`: duas transações concorrentes na mesma sala são serializadas; nenhuma escrita é perdida.
- `RealtimePublisher.publish` nunca recebe valor de voto antes da revelação (D-05). O adapter não precisa saber disso, mas a suíte de contrato da camada de aplicação verifica.
- `RealtimeClient` entrega eventos em ordem por sala e, na reconexão, sinaliza `reconnecting` e depois `connected`; o cliente reconcilia por versão.
- `IssueTracker.importItems` é puro em relação ao domínio: devolve itens externos, quem cria `Item` é o caso de uso.

## 5. Protocolo de sala

**5.1 Máquinas de estado**

- Item: `pending → current → estimated`. De `current` pode ir a `skipped` ou `deferred` (preservando rodadas e votos). `skipped` e `deferred` voltam a `pending` ou `current`. `estimated` pode voltar a `current` com uma nova rodada.
- Rodada: `voting → revealed`. Nova rodada cria `Round n+1` em `voting` no mesmo item.
- Revelação: manual (host ou facilitador) ou automática quando `autoReveal` está ligado e todos os participantes com `canVote` que estão online já votaram (mínimo de 1 voto).
- Timer (RF-49): o servidor guarda `timerEndsAt`; os clientes calculam o tempo restante com o deslocamento de `serverTime`. Ao zerar, apenas avisa (aria-live). Não revela sozinho.

**5.2 Eventos**

Envelope: `{ type, roomId, version, at, payload }`. Nenhum payload contém valor de voto (D-05).

| ID | type | payload |
| --- | --- | --- |
| EVT-01 | participant.joined | participantId, nickname, role |
| EVT-02 | participant.updated | participantId, campos alterados |
| EVT-03 | host.changed | hostParticipantId, reason (manual, auto) |
| EVT-04 | settings.changed | settings |
| EVT-05 | items.changed | kind (added, reordered, removed) |
| EVT-06 | item.current.changed | itemId |
| EVT-07 | round.started | roundId, number |
| EVT-08 | vote.changed | participantId, hasVoted |
| EVT-09 | round.revealed | roundId (sem valores; o cliente busca o snapshot) |
| EVT-10 | estimate.set | itemId, finalEstimate |
| EVT-11 | timer.changed | timerEndsAt ou null |
| EVT-12 | room.closed | motivo |

**5.3 Snapshot e projeção**

`projectRoomForViewer(room, items, viewer, now): RoomView` é uma função pura em `application`. `RoomView` contém: dados da sala e configurações, participantes (apelido, papel, `online`, `hasVoted`), fila de itens, item atual, rodada atual, `permissions` do viewer (calculadas por `can`), `serverTime` e `version`.

Regra de ouro: com a rodada em `voting`, o `RoomView` traz **apenas o `ownVote` do próprio viewer** e `hasVoted` dos demais. Depois de `revealed`, traz `votes[]` e `stats`.

Teste de não-vazamento (obrigatório): dois estados de sala que diferem apenas nos valores dos votos geram `RoomView` idêntico para qualquer viewer que não seja o autor do voto.

**5.4 Reconexão e idempotência (RF-02, RNF-05)**

- Toda mutação do cliente carrega `clientOpId` (ULID). O servidor deduplica por `(participantId, clientOpId)` por 10 minutos. Repetir o voto com a mesma carta é no-op.
- O cliente mantém uma fila de operações pendentes. Ao reconectar: reenvia a fila e depois busca o snapshot.
- Se `event.version > local + 1`, o cliente descarta o delta e busca o snapshot.

**5.5 API HTTP da R1**

Erros: `{ error: { code, params } }`, com `code` do enum `AppError`.

| Método e caminho | Caso de uso | Ator |
| --- | --- | --- |
| POST /api/rooms | CreateRoom | qualquer |
| POST /api/rooms/:code/join | JoinRoom | qualquer |
| GET /api/rooms/:code/state?since=v | Snapshot (`unchanged: true` se igual) | participante |
| POST /api/rooms/:code/heartbeat | Heartbeat | participante |
| POST, DELETE /api/rooms/:code/votes | CastVote, RetractVote | quem pode votar |
| POST /api/rooms/:code/reveal | RevealRound | host, facilitador |
| POST /api/rooms/:code/rounds | NewRound | host, facilitador |
| PUT /api/rooms/:code/items/:id/estimate | SetFinalEstimate | host, facilitador |
| POST /api/rooms/:code/items, /items/import, /items/reorder | AddItem, ImportItems, ReorderItems | host, facilitador |
| POST /api/rooms/:code/items/:id/current, /skip, /defer | SetCurrentItem, SkipItem, DeferItem | host, facilitador |
| PATCH /api/rooms/:code/settings | UpdateRoomSettings | host |
| POST /api/rooms/:code/host | TransferHost | host |
| GET /api/rooms/:code/summary?format=csv ou json | ExportRoomSummary | participante |

## 6. Regras de cálculo

Tudo em `domain`, funções puras, sem arredondamento interno (a UI arredonda: pontos inteiros, ritmo com 2 casas, média com 1 casa).

**6.1 Estatística da rodada (RF-44)**

- Só cartas com `numeric` entram em média, mediana, moda, mínimo e máximo. Cartas especiais são contadas em `specialCounts`.
- Mediana: média dos dois centrais quando o total é par. Moda: lista ordenada dos valores de maior frequência; vazia se todas as frequências forem 1.
- `consensus = true` quando há 2 ou mais votos numéricos e todos iguais. `nearConsensus = true` quando não há consenso e a distância na escala entre o menor e o maior voto é no máximo 1 posição.
- `extremes`: se mínimo ≠ máximo, ids de quem votou o mínimo e o máximo.
- Escala sem `numeric` (camisetas): média e mediana nulas; moda, mínimo e máximo por posição na escala.

Vetores de teste (Fibonacci): votos \[3, 5, 5, 8\] → média 5,25; mediana 5; moda \[5\]; mín 3; máx 8; consenso falso; quase-consenso falso. Votos \[5, 5, 5\] → consenso. Votos \[3, 5\] → quase-consenso. Votos \[5, ?, ☕\] → 1 voto numérico, sem consenso, `specialCounts {?:1, ☕:1}`.

**6.2 Capacity (RF-71, RF-75, RF-81)**

- `workingDays` = dias de segunda a sexta entre `startDate` e `endDate` (inclusive), menos os feriados do time que caem nesses dias.
- Por pessoa: `availableDays = max(0, workingDays − absenceDays)`; `capacity = availableDays × focusPct / 100`, com `focusPct` entre 0 e 100 (default 100).
- `capacityTotal` = soma das capacities (pessoa-dias).
- Vetor: sprint de 02/11/2026 (segunda) a 13/11/2026 (sexta), feriado em 02/11 → 9 dias úteis. Pessoa A: 1 ausência, foco 80% → 6,4. Pessoa B: 0 ausência, foco 100% → 9. Total 15,4.

**6.3 Comprometido, entregue e carry-over (RF-72 a RF-74)**

- `committedPoints`: soma das estimativas finais numéricas dos itens vinculados no instante em que a sprint passa de `planned` para `active` (snapshot). Itens vinculados depois entram em `addedAfterStart` e contam apenas na entrega.
- `deliveredPoints`: soma das estimativas finais numéricas dos itens `Done` ao encerrar.
- Item não concluído: vale zero, é desvinculado (`sprintId = null`, `carriedOver = true`) e volta ao backlog do time. Quando concluído numa sprint futura, conta lá.
- Item sem estimativa numérica vale zero e entra na lista de aviso `UNESTIMATED_ITEMS` do relatório da sprint.

**6.4 Ritmo, previsão e acurácia (seção 5 dos requisitos)**

- `pace = deliveredPoints / capacityTotal`, só para sprints encerradas com `capacityTotal > 0` (as demais são ignoradas e sinalizadas).
- Seja `closed` a lista de sprints elegíveis ordenada por `endDate`. Se `closed.length < 3`: resultado `{ status: 'insufficient_data', have, need: 3 }`.
- `N = min(6, closed.length)`; usa as últimas N. `medianPace` = mediana dos ritmos. `predicted = plannedCapacity × medianPace`.
- Faixa: com N = 6, percentis 25 e 75 do ritmo por interpolação linear (posição `p × (n − 1)`); com N < 6, mínimo e máximo do ritmo. `low` e `high` = `plannedCapacity` × limites.
- Acurácia: `errorPct = (delivered − predicted) / predicted × 100`, com `predicted > 0`. O `ForecastRecord` é criado quando a sprint é ativada e completado quando é encerrada. Resumo de acompanhamento: média dos `|errorPct|`.
- Vetor: sprints encerradas (entregue/capacity): 20/10, 27/12, 21/14 → ritmos 2,0; 2,25; 1,5 → mediana 2,0. Com `plannedCapacity = 15,4`: previsto 30,8; faixa 23,1 a 34,65. Se entregou 28: `errorPct ≈ −9,09%`.
- Vetor de percentis: ritmos \[1,0; 1,5; 2,0; 2,5; 3,0; 3,5\] → mediana 2,25; p25 1,625; p75 2,875.

## 7. Convenções transversais (checklist de toda tarefa)

**Segurança (RNF-12, RNF-13)**

- Todo endpoint valida a entrada com schema (tipos, tamanhos, enums) antes de chamar o caso de uso.
- Autorização no servidor via `can(...)`; nunca confiar em flag enviada pelo cliente.
- Texto livre (apelido, título, descrição, comentário) é armazenado como veio, normalizado (trim, remoção de caracteres de controle) e **escapado na renderização**. Proibido `{@html}` com conteúdo de usuário.
- Endpoints mutáveis exigem `Origin` igual ao do site; cookies `SameSite=Lax`.
- Limites por IP e por sessão via porta `RateLimiter` (criação de sala, tentativas de código, mensagens).
- Respostas de `NOT_FOUND` e `FORBIDDEN` não revelam a existência de salas.

**Acessibilidade (RNF-08 a RNF-10)**

- Navegação completa por teclado, foco visível, alvos ≥ 44×44 px, contraste AA.
- Estado nunca só por cor: a carta mostra valor e estado em texto (ex.: «Votou», «Oculta»).
- Revelação, mudança de presença e fim de timer anunciados em região `aria-live` (polite).
- Respeitar `prefers-reduced-motion` e `prefers-color-scheme`.
- Cada tela nova tem um teste axe no e2e e um roteiro de verificação manual (VoiceOver, TalkBack, NVDA) anexado ao PR da release.

**i18n (RNF-11)**

- Sem texto fixo: nada de string visível em componente, `aria-label`, `title`, mensagem de erro ou e-mail.
- Datas, números e fusos por `Intl`, no locale ativo. Plural e interpolação pela biblioteca de i18n.
- Teste de CI: toda chave usada existe em `pt-BR` e nenhuma chave de `pt-BR` está órfã.

**Desempenho e custo (RNF-01, RNF-02, RNF-20)**

- 🟡 Orçamento: JS inicial da rota de sala ≤ 150 KB gzip; falha o CI se exceder.
- Nenhuma tarefa adiciona serviço pago. Qualquer consumo novo de cota do plano gratuito é descrito no PR.

**Observabilidade (RNF-19)**

- Logs estruturados (JSON) com `requestId`, `roomId`, `useCase`, `errorCode`. Nunca logar apelido, e-mail, token ou voto.

**Testes**

- Pirâmide: unitários em `domain` (maioria), casos de uso com fakes, contrato por adapter, poucos e2e (Playwright) cobrindo os fluxos críticos.
- Testes determinísticos: nada de `Date.now()` ou `Math.random()` fora de `adapter-system`.

## 8. Tarefas

Ordem de execução: R0 → R1 → R2 → R3 → R4. Dentro de uma release, respeite **Depende de**; tarefas sem dependência entre si podem rodar em paralelo por agentes diferentes (cada uma em seu pacote). Cada release termina com uma tarefa de gate.

### R0 — Fundação

### T-001 · Monorepo e ferramentas

- **R0 · M** · Cobre: RNF-16, RNF-18 · Depende de: nenhuma
- **Entregáveis:** workspace pnpm com a árvore da seção 2 (pacotes vazios, cada um com `package.json`, `tsconfig` e `index.ts`), `AGENTS.md` (resumo da seção 0), `docs/questions.md`, ESLint, Prettier e Vitest por pacote.
- **Aceite:** `pnpm install && pnpm -r build` passa do zero. `tsc` com `strict` e `noUncheckedIndexedAccess` em todos os pacotes. `packages/domain/package.json` sem `dependencies`.
- **Fora do escopo:** qualquer lógica de negócio.

### T-002 · CI, `pnpm verify` e fronteiras

- **R0 · M** · Cobre: RNF-16, RNF-17, RNF-18 · Depende de: T-001
- **Entregáveis:** workflow de CI executando `pnpm verify` (lint + tipos + fronteiras + testes + a11y quando existir); regras de fronteira da seção 2 (dependency-cruiser ou eslint-plugin-boundaries); lint que proíbe `Date.now`, `new Date()` sem argumento e `Math.random` em `domain` e `application`; verificação de licenças das dependências.
- **Aceite:** Dado um import de `adapter-*` dentro de `domain`, quando rodar `pnpm verify`, então falha citando a regra violada. Idem para adapter importando adapter e para `domain` usando `Math.random`.
- **Testes:** fixtures com violações propositais em `tools/boundary-fixtures` que **devem** falhar.

### T-003 · Primitivos do domínio

- **R0 · M** · Cobre: RNF-16, RNF-18 · Depende de: T-001
- **Entregáveis:** em `domain/src/shared`: `Result` (`ok`, `err`, `map`, `andThen`), `AppError` com enum estável de códigos (`VALIDATION`, `NOT_FOUND`, `FORBIDDEN`, `ROOM_FULL`, `NICKNAME_TAKEN`, `ROUND_NOT_VOTING`, `LIMIT_EXCEEDED`, `RATE_LIMITED`, `INSUFFICIENT_DATA`), IDs opacos tipados e constantes `MAX_PARTICIPANTS = 30`, `ANON_ROOM_TTL_DAYS = 7`, `HOST_GRACE_SECONDS = 60`, `ONLINE_WINDOW_SECONDS = 45`.
- **Aceite:** códigos de erro são strings estáveis e únicas; `Result` encadeia sem lançar exceção.
- **Testes:** unitários.

### T-004 · Pacote `testing` (fakes e contratos)

- **R0 · M** · Cobre: RNF-05, RNF-17, RNF-18 · Depende de: T-003
- **Entregáveis:** `InMemoryPersistence` (transação com mutex por sala e incremento de `version`), `FakeClock` com `advance()`, `SequentialIdGenerator`, `FakeRealtime` (publisher e client em memória, entrega ordenada, simula queda e reconexão) e o helper `describePersistenceContract(factory)`.
- **Aceite:** 100 transações concorrentes incrementando um contador na mesma sala resultam em 100, sem perda. Erro dentro da transação não persiste mudanças nem incrementa `version`.
- **Testes:** a própria suíte de contrato rodando contra `InMemoryPersistence`.

### T-005 · Esqueleto do front-end

- **R0 · M** · Cobre: RNF-06, RNF-07, RNF-08, RNF-09, RNF-11, RNF-21, RF-95 (parcial) · Depende de: T-002
- **Entregáveis:** SvelteKit com TypeScript; layout base mobile first (360 px) com tokens de design (contraste AA em claro e escuro, `:focus-visible`, alvos ≥ 44 px, `prefers-reduced-motion`, `prefers-color-scheme`); seletor de tema claro/escuro/automático; i18n com catálogo `pt-BR`; rota `/healthz`; composition root usando os fakes; manifest PWA básico.
- **Aceite:** a home abre em 360×640 sem rolagem horizontal; axe sem violações na home nos dois temas; troca de tema persiste no navegador; nenhum texto fixo em componente.
- **Testes:** e2e Playwright (360×640 e 1280×720) mais axe.
- **Fora do escopo:** telas de produto.

### R1 — Paridade com o PlanITPoker

### T-101 · Escalas e cartas

- **R1 · M** (Fibonacci e personalizada), **S** (demais) · Cobre: RF-47, RF-48 · Depende de: T-003 · Contexto: §3 (INV-06)
- **Entregáveis:** `domain/src/scales`: tipos `Card` e `Scale`; escalas embutidas `fibonacci` \[0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89\], `fibonacciModified` \[0, ½, 1, 2, 3, 5, 8, 13, 20, 40, 100\], `powersOf2` \[0, 1, 2, 4, 8, 16, 32, 64\], `tshirt` \[P, M, G, GG\] (sem `numeric`); cartas especiais `?`, `☕`, `∞` (sem `numeric`); `ScaleBuilder.custom()` com 2 a 20 cartas, rótulos únicos de 1 a 6 caracteres e `numeric` opcional; funções `indexOf`, `distance`, `isSpecial`, `isValidVote`.
- **Aceite:** custom com rótulo duplicado, com 1 carta ou com 21 cartas → `VALIDATION`. `isValidVote(fibonacci, '4')` é falso. `'?'` é válido em qualquer escala. `distance(fibonacci, '5', '8') = 1`.
- **Testes:** unitários dirigidos por tabela, um por escala.

### T-102 · Estatística da rodada

- **R1 · M** · Cobre: RF-44 · Depende de: T-101 · Contexto: §6.1
- **Entregáveis:** `computeRoundStats(scale, votes): RoundStats` com `mean`, `median`, `modes`, `min`, `max`, `consensus`, `nearConsensus`, `extremes`, `specialCounts`, `voteCount`.
- **Aceite:** todos os vetores da §6.1 passam. Sem votos → `voteCount = 0` e demais campos nulos ou vazios. Ordem de saída estável (independe da ordem dos votos).
- **Testes:** unitários com os vetores mais testes baseados em propriedades (fast-check): `min ≤ mediana ≤ max`, média entre mín. e máx., invariância por permutação dos votos.

### T-103 · Política de permissões

- **R1 · M** · Cobre: RF-11 (base), RNF-13 · Depende de: T-003 · Contexto: matriz da seção 3 dos requisitos
- **Entregáveis:** `can(actor, action, ctx): boolean` em `domain/src/policy`. Ações: `manageInstance`, `manageTeam`, `configureSprints`, `createTeamRoom`, `hostRoom`, `vote`, `setFinalEstimate`, `viewDashboard`, `exportData`, `exportOwnRoomSummary`. `actor` = `{ kind: 'guest' | 'member', systemRole?, teamRole?, isHost, isFacilitator }`.
- **Aceite:** cada célula da matriz vira um caso de teste (gerado de uma tabela única). Observador nunca vota. Convidado só hospeda a sala que criou. `vote` para PM e PO depende de `settings.votingRoles`; Dev e QA votam por padrão. Facilitador delegado pode revelar e definir estimativa, mas não pode alterar configurações nem transferir host.
- **Fora do escopo:** aplicar a política nos endpoints (feito em cada caso de uso).

### T-104 · Agregados Room e Participant

- **R1 · M** · Cobre: RF-20, RF-23, RF-24, RF-25 · Depende de: T-101, T-103 · Contexto: §3 (INV-01, INV-02, INV-14), D-14
- **Entregáveis:** `Room` com `join`, `rejoin`, `updateSettings`, `transferHost`, `autoTransferHost(now)`, `delegateFacilitator`, `close`; `RoomBuilder` e `RoomSettingsBuilder`; `Participant` com validação de apelido e `canVote` derivado de `votingRoles` (observador nunca vota).
- **Aceite:** a 31ª entrada → `ROOM_FULL`. Reentrada do mesmo `guestSessionId` não ocupa vaga. «Ana» e «ana» → `NICKNAME_TAKEN`. Host offline há mais de 60 s com outro participante online → `autoTransferHost` escolhe conforme D-14 e emite `host.changed(auto)`. Transferência manual só pelo host. Mudança em `votingRoles` vale a partir da próxima rodada.
- **Testes:** unitários, incluindo desempate por ordem de entrada e sala com um único participante.

### T-105 · Item, Rodada e Voto

- **R1 · M** · Cobre: RF-40, RF-41, RF-43, RF-45, RF-46, RF-47 · Depende de: T-101, T-102, T-104 · Contexto: §3 (INV-03 a INV-09), §5.1
- **Entregáveis:** agregado `Item` com rodadas; operações `startRound`, `castVote`, `retractVote`, `reveal`, `newRound`, `setFinalEstimate`, `skip`, `defer`, `reopen`; retorna `EstimateAudit` quando a estimativa final é alterada.
- **Aceite:** voto após revelar → `ROUND_NOT_VOTING`. Observador votando → `FORBIDDEN`. Carta fora da escala → `VALIDATION`. `newRound` preserva as anteriores e abre a n+1. Estimativa final diferente da média é aceita. Estimativa final com carta especial → `VALIDATION`. Alterar estimativa final devolve `EstimateAudit` (de, para, quem, quando). O campo `comment` do voto é aceito pelo domínio (a UI só chega na R3, RF-50).
- **Testes:** unitários mais teste exaustivo de transições inválidas da máquina de estados.

### T-106 · Projeção `RoomView` e eventos

- **R1 · M** · Cobre: RF-22, RF-42, RNF-05 · Depende de: T-102, T-103, T-105 · Contexto: §5.2, §5.3, D-05, D-06
- **Entregáveis:** tipos `RoomEvent` (EVT-01 a EVT-12), `RoomView` e `projectRoomForViewer`.
- **Aceite:** teste de não-vazamento da §5.3 (baseado em propriedades) passa. `online` calculado de `lastSeenAt` e `now` com janela de 45 s. `permissions` coerentes com `can`. Rodada revelada inclui `votes` e `stats`.
- **Testes:** unitários e baseados em propriedades.

### T-107 · Casos de uso de sala

- **R1 · M** · Cobre: RF-01, RF-02, RF-20, RF-21, RF-23, RF-24, RF-25 · Depende de: T-004, T-104, T-106
- **Entregáveis:** `CreateRoom` (convidado), `JoinRoom`, `ReconnectParticipant`, `Heartbeat`, `TransferHost`, `UpdateRoomSettings`, `CloseRoom`, `GetRoomSnapshot`. Define também a porta `RateLimiter { hit(key, rule): Promise<{ allowed: boolean, retryAfterSec: number }> }` (acrescentada às portas da §4) e seu fake. Todos usam `transaction({ lockRoomId })` e publicam eventos **somente depois do commit**.
- **Aceite:** `CreateRoom` devolve token de host e persiste só o hash (D-10). `JoinRoom` em código inexistente → `NOT_FOUND` sem pista de salas parecidas. `ReconnectParticipant` com token válido devolve o mesmo `participantId`; inválido → `FORBIDDEN`. Evento nunca é publicado antes do commit (teste com `FakeRealtime` que falha se chegar antes). Excedeu limite do `RateLimiter` → `RATE_LIMITED`.
- **Testes:** casos de uso com fakes; dois `JoinRoom` simultâneos na 30ª vaga: um entra, o outro recebe `ROOM_FULL`.

### T-108 · Casos de uso de itens

- **R1 · M** (RF-33 é S) · Cobre: RF-30, RF-31, RF-32, RF-33 · Depende de: T-105, T-107
- **Entregáveis:** `AddItem`, `ImportItems` (via porta `IssueTracker`), `ReorderItems`, `SetCurrentItem` (abre a rodada 1), `SkipItem`, `DeferItem`, `RemoveItem`.
- **Aceite:** `SetCurrentItem` em outro item mantém as rodadas do anterior. Pular ou adiar preserva rodadas e votos (RF-33). `ReorderItems` recebe a lista completa e rejeita id desconhecido ou duplicado. 🟡 Limites: título ≤ 200, descrição ≤ 2000 caracteres e ≤ 500 itens por sala → `LIMIT_EXCEEDED`.
- **Testes:** casos de uso com fakes.

### T-109 · Adapter IssueTracker Manual/CSV

- **R1 · M** · Cobre: RF-31, RF-90 · Depende de: T-107 (porta) · Pacote: `adapter-issuetracker-manual`
- **Entregáveis:** `importItems({ kind: 'text' | 'csv', content })`. Texto: um item por linha, linhas vazias ignoradas, prefixos `-`, `*` e `1.` removidos. CSV: cabeçalho com colunas reconhecidas (`title`, `titulo`, `título`; `description`, `descricao`, `descrição`; `url`, `link`; `key`, `id`, `chave`), separador `,` ou `;` detectado, aspas conforme RFC 4180, BOM tolerado. 🟡 Limites: 500 linhas e 1 MB.
- **Aceite:** CSV com `;` e acentos importa corretamente. Sem coluna de título → `ImportError.MISSING_TITLE_COLUMN`. Acima do limite → `LIMIT_EXCEEDED`. Caracteres de controle removidos.
- **Testes:** fixtures de parser e a suíte de contrato da porta.

### T-110 · Casos de uso de votação

- **R1 · M** (RF-49 é S) · Cobre: RF-40 a RF-46, RF-49 · Depende de: T-106, T-107, T-108
- **Entregáveis:** `CastVote` (idempotente por `clientOpId`), `RetractVote`, `RevealRound`, verificação de revelação automática após cada voto, `NewRound`, `SetFinalEstimate`, `StartTimer` e `StopTimer`.
- **Aceite:** dois `CastVote` simultâneos de participantes diferentes persistem ambos. Mesmo `clientOpId` repetido é no-op. `vote.changed` nunca contém a carta. `RevealRound` por quem não é host nem facilitador → `FORBIDDEN`. Revelação automática dispara quando o último elegível online vota e não dispara se nenhum elegível está online. Timer só grava `timerEndsAt`; não revela sozinho.
- **Testes:** casos de uso com fakes, incluindo concorrência e reenvio após queda simulada.

### T-111 · Adapter Persistence (Postgres), schema da R1

- **R1 · M** · Cobre: RNF-17, RNF-23, RF-60 (parcial) · Depende de: T-004, T-107 · Pacote: `adapter-persistence-postgres`
- **Entregáveis:** migrações SQL versionadas para `rooms`, `participants`, `items`, `rounds`, `votes`, `estimate_audits`, `idempotency_keys`; repositórios; `transaction` com `SELECT ... FOR UPDATE` na linha da sala e incremento de `version` no commit; todas as colunas de tempo em `timestamptz` (UTC); RLS ligada sem policies para o papel anônimo.
- **Aceite:** a suíte `describePersistenceContract` passa contra Postgres real (container em CI). Migrar do zero e reaplicar é idempotente. Tokens guardados só como hash.
- **Fora do escopo:** tabelas de times, sprints e histórico (releases seguintes).

### T-112 · Adapter Realtime e fallback de polling

- **R1 · M** · Cobre: RNF-01, RNF-04, RNF-05, RNF-17 · Depende de: T-004, T-106 · Pacote: `adapter-realtime-supabase`
- **Entregáveis:** `RealtimePublisher` (servidor) e `RealtimeClient` (navegador) sobre o provedor escolhido, com presença; cliente com fallback automático para polling a cada 2 a 3 s no endpoint de snapshot; backoff exponencial na reconexão; heartbeat HTTP a cada 20 s no modo polling (D-13).
- **Aceite:** com o provedor indisponível, o cliente entra em `polling` em até 10 s e volta a `connected` quando o provedor retorna. Eventos fora de ordem ou com lacuna disparam busca de snapshot. Nenhum payload de evento contém valor de voto.
- **Testes:** contrato com `FakeRealtime`; teste de integração simulando queda.

### T-113 · Adapters Exporter (CSV e JSON) e System

- **R1 · M** · Cobre: RF-63 (base), RF-64, RNF-17 · Depende de: T-107 · Pacotes: `adapter-exporter-csvjson`, `adapter-system`
- **Entregáveis:** `Exporter` para `csv` e `json` com o resumo da sessão (itens, estimativa final, rodadas, estatísticas e, se a sala guarda, votos por pessoa); `adapter-system` com `Clock` e `IdGenerator` reais (CSPRNG para códigos e tokens); caso de uso `ExportRoomSummary`.
- **Aceite:** CSV em UTF-8 com BOM e separador `,`; célula que começa com `=`, `+`, `-` ou `@` é prefixada com apóstrofo (proteção contra injeção de fórmula). O código de sala gerado usa só o alfabeto da D-09. 10.000 códigos gerados sem colisão em teste estatístico simples.
- **Testes:** snapshots de saída e suíte de contrato.

### T-114 · Endpoints HTTP da R1, sessão e limites

- **R1 · M** · Cobre: RNF-12, RNF-13, RF-02 · Depende de: T-107, T-108, T-110, T-111, T-113 · Pacote: `apps/web`
- **Entregáveis:** endpoints da §5.5 como camada fina (validar → caso de uso → mapear erro); cookie de sessão do convidado (D-10); verificação de `Origin`; adapter de `RateLimiter` (🟡 limites: 10 salas por hora por IP; 20 tentativas de código por minuto por IP; 60 mutações por minuto por participante); mapeamento `AppError` → HTTP.
- **Aceite:** payload inválido → 400 com `VALIDATION`. Origem diferente → 403. 21ª tentativa de código em 1 minuto → 429 com `retryAfterSec`. Cookie `httpOnly`, `Secure`, `SameSite=Lax`. Nenhuma resposta antes da revelação contém voto alheio (teste de contrato HTTP).
- **Testes:** integração HTTP com Postgres e fakes de realtime.

### T-115 · UI: criar sala e entrar

- **R1 · M** · Cobre: RF-01, RF-20, RF-21, RF-25, RNF-06 · Depende de: T-005, T-114
- **Entregáveis:** home com «Criar sala» e «Entrar com código»; formulário de criação (nome, escala, quem vota, revelação automática, timer, exibir média); rota `/r/:code` como link da sala; tela de entrada com apelido e papel; após criar, exibe link, código e **QR Code gerado no cliente** (sem serviço externo, por privacidade e CSP) com botão de copiar.
- **Aceite:** abrir o link pré-preenche o código. Código inexistente → mensagem genérica. Sala cheia → mensagem clara (`ROOM_FULL`). Apelido repetido → mensagem de erro associada ao campo. Fluxo completo possível só pelo teclado, a partir de 360 px.
- **Testes:** e2e do fluxo criar → compartilhar → entrar por outro navegador; axe.

### T-116 · UI: mesa de votação

- **R1 · M** · Cobre: RF-22, RF-40 a RF-47, RNF-08, RNF-09 · Depende de: T-112, T-115
- **Entregáveis:** lista de presença (online/offline, papel, «Votou» ou «Aguardando» em texto); baralho de cartas como botões com `aria-pressed`; voto oculto, alteração e retirada; botão de revelar (host e facilitador); resultado com média, mediana, moda, mínimo, máximo, indicação de consenso e destaque textual dos extremos; nova rodada; definir estimativa final; cartas especiais. Observador vê a mesa sem baralho.
- **Aceite:** alvos de toque ≥ 44 px e sem rolagem horizontal em 360 px. Revelação anunciada em `aria-live`. Com `showAverage` desligado a média não aparece. Estimativa final pode divergir da média.
- **Testes:** e2e com 3 contextos de navegador; **inspeciona as respostas de rede e confirma que o voto de A não chega a B antes da revelação**; axe nos dois temas.

### T-117 · UI: fila de itens

- **R1 · M** (RF-33 é S) · Cobre: RF-30 a RF-33 · Depende de: T-116, T-109
- **Entregáveis:** painel de itens com o atual em destaque; adicionar item (título, descrição, link externo); importar por texto colado ou CSV com pré-visualização e erros por linha; reordenar com arrastar **e** com botões subir/descer (teclado); pular e adiar; indicador de itens já estimados.
- **Aceite:** importar 50 linhas cria 50 itens na ordem. Reordenação por teclado funciona e é anunciada. Link externo abre em nova aba com `rel=noopener noreferrer` e só aceita `http` e `https`.
- **Testes:** e2e e axe.

### T-118 · UI: configurações da sala e timer

- **R1 · M** (RF-49 é S) · Cobre: RF-24, RF-49 · Depende de: T-116
- **Entregáveis:** painel de configurações do host (escala, quem vota, revelação automática, timer, exibir média); timer visível com contagem e aviso ao zerar em `aria-live`; aviso de que mudança em «quem vota» vale a partir da próxima rodada.
- **Aceite:** só o host altera; os demais veem em leitura. Mudança propaga a todos em até 1 s. Timer consistente entre dispositivos com diferença de relógio de até 5 s (usa `serverTime`).
- **Testes:** e2e com dois navegadores.

### T-119 · UI: modo telão

- **R1 · S** · Cobre: RF-27, RNF-07 · Depende de: T-116, T-106
- **Entregáveis:** rota `/r/:code/screen` somente leitura com fonte grande, alto contraste, QR Code, cartas e resultado em escala projetável. Estende `projectRoomForViewer` com `viewer.kind = 'screen'`: sem permissões, não ocupa vaga entre os 30 e vê o mesmo que um observador.
- **Aceite:** telão não conta em `maxParticipants`. O teste de não-vazamento da §5.3 é estendido ao viewer `screen`. Legível a 3 m em 1920×1080 (texto principal ≥ 48 px).
- **Testes:** e2e em 1920×1080 e axe.

### T-120 · UX de reconexão e estado de sincronização

- **R1 · M** · Cobre: RF-02, RNF-04, RNF-05 · Depende de: T-112, T-116
- **Entregáveis:** indicador textual de conexão (conectado, reconectando, modo alternativo); fila de operações pendentes com reenvio; aviso de «servidor acordando» quando a primeira resposta demora; reconexão automática pela sessão do cookie.
- **Aceite:** derrubar a rede por 15 s com voto já dado: o voto é preservado. Voto feito offline é reenviado ao voltar e confirmado na tela. Recarregar a página mantém identidade e voto da rodada.
- **Testes:** e2e com simulação de offline do Playwright.

### T-121 · Expiração de salas de convidado

- **R1 · M** · Cobre: RNF-15, INV-13 · Depende de: T-111
- **Entregáveis:** caso de uso `PurgeExpiredRooms(now)` idempotente; endpoint de manutenção protegido por segredo, chamado por agendador do plano gratuito; exclusão em cascata de participantes, itens, rodadas e votos.
- **Aceite:** sala com última atividade há 6 d 23 h não é apagada; com 7 d 1 h é. Reexecutar não causa erro. Chamada sem segredo → 403. O log registra só a contagem de salas removidas.
- **Testes:** casos de uso com `FakeClock` e integração.

### T-122 · i18n completo e preferências locais

- **R1 · S** · Cobre: RF-95, RNF-11 · Depende de: T-115 a T-120
- **Entregáveis:** extração de todo texto restante para o catálogo; seletor de idioma e de tema; preferências em `localStorage`; script de CI que falha com chave faltante ou órfã.
- **Aceite:** adicionar um locale de teste (`xx`) só com arquivo de catálogo troca a interface inteira sem tocar em código. Datas e números seguem o locale via `Intl`.
- **Testes:** unitário do carregador e e2e de troca de idioma.

### T-123 · Auditoria de acessibilidade AA da R1

- **R1 · M** · Cobre: RNF-08, RNF-09, RNF-10 · Depende de: T-115 a T-120
- **Entregáveis:** axe em todas as telas da R1, nos dois temas e em 360 e 1280 px, no CI; e2e do fluxo inteiro (criar → votar → revelar → estimativa final) **somente com teclado**; teste com `prefers-reduced-motion`; roteiro manual `docs/a11y/R1.md` (VoiceOver iOS, TalkBack, NVDA) com resultado preenchido.
- **Aceite:** zero violações axe de impacto sério ou crítico. Ordem de foco lógica. Informação nunca só por cor.
- **Fora do escopo:** novas funcionalidades.

### T-124 · PWA e orçamento de desempenho

- **R1 · M** · Cobre: RNF-02, RNF-22 · Depende de: T-116
- **Entregáveis:** manifest com ícones e service worker que cacheia só arquivos estáticos (nunca chamadas `/api`); orçamento de bundle no CI (JS inicial da rota de sala ≤ 150 KB gzip); medição Lighthouse com throttling de 4G e CPU 4×.
- **Aceite:** app instalável. LCP < 2,5 s no perfil descrito. CI falha se o orçamento estourar. Sem uso offline completo.

### T-125 · Observabilidade, backup e limites

- **R1 · M** · Cobre: RNF-19, RNF-20, RNF-23 · Depende de: T-114
- **Entregáveis:** logger JSON (`requestId`, `roomId`, `useCase`, `errorCode`); `ErrorReporter` fino sobre ferramenta de plano gratuito; métricas agregadas diárias (salas ativas, participantes) em log, sem identificar pessoas; rotina agendada de exportação periódica do banco; `docs/limits.md` com os limites **vigentes** de cada plano gratuito (o agente deve conferir na documentação oficial) e alerta a 80% de uso quando o provedor permitir.
- **Aceite:** nenhum log contém apelido, e-mail, token ou voto (teste que varre logs de um fluxo completo). Exportação periódica gera arquivo restaurável (restauração testada em ambiente limpo).

### T-126 · Teste de carga com 30 participantes

- **R1 · M** · Cobre: RNF-01, RNF-03, Risco 4 · Depende de: T-112, T-114
- **Entregáveis:** script de carga (30 participantes votando, revelando e iniciando nova rodada; 3 salas simultâneas) e relatório `docs/perf/R1.md`.
- **Aceite:** p95 do tempo entre o voto e a atualização em todos os clientes ≤ 1 s. Zero votos perdidos. Com o provedor realtime derrubado de propósito, o polling mantém a consistência.

### T-127 · Gate da R1

- **R1 · M** · Depende de: T-101 a T-126
- **Checklist:** todos os RF da R1 com prioridade M cobertos (matriz da seção 9); `pnpm verify` verde; auditoria de acessibilidade concluída; teste de carga aprovado; implantação na hospedagem gratuita; `docs/limits.md` atualizado; **uso real em pelo menos uma sessão do time**; nenhum erro bloqueante aberto.
- **Resultado:** o time pode abandonar o PlanITPoker.

### R2 — Contas e histórico

### T-201 · Adapter Auth: magic link e Google

- **R2 · M** · Cobre: RF-03, RNF-13 · Depende de: T-127 · Pacote: `adapter-auth-supabase`
- **Entregáveis:** implementação da porta `AuthProvider`; endpoints de callback; criação do `User` no primeiro login; logout; fake em `testing`; sessão com expiração (🟡 7 dias deslizantes).
- **Aceite:** link expirado ou reutilizado → `AUTH_LINK_INVALID`. E-mail normalizado em minúsculas. Resposta ao pedir link é idêntica exista a conta ou não (sem enumeração). 🟡 Limites: 5 links por hora por e-mail e 20 por hora por IP. Usuário suspenso → `ACCOUNT_SUSPENDED`.
- **Testes:** contrato de `AuthProvider` contra fake e adapter.

### T-202 · Times, papéis e convites

- **R2 · M** (RF-12 é S) · Cobre: RF-10, RF-11, RF-12 · Depende de: T-103, T-201
- **Entregáveis:** `Team`, `Membership`, `CreateTeam` (criador vira Admin do time), `CreateInvite` (link com papel pré-definido, 🟡 válido por 7 dias, revogável), `AcceptInvite`, `ChangeMemberRole`, `RemoveMember`, `ListMyTeams`.
- **Aceite:** o time sempre tem pelo menos um Admin (`LAST_ADMIN` ao tentar remover ou rebaixar o último). Uma pessoa entra em vários times. Convite expirado ou revogado → `NOT_FOUND`. Só Admin ou SuperAdmin altera papéis (usa `can`).
- **Testes:** casos de uso com fakes.

### T-203 · Persistence: schema da R2

- **R2 · M** · Cobre: RNF-17, RNF-23 · Depende de: T-202
- **Entregáveis:** migrações para `users`, `organizations`, `teams`, `memberships`, `invites`, `history_entries`; repositórios; a suíte de contrato estendida.
- **Aceite:** migração aplicada sobre o banco da R1 em andamento sem perda de dados. Contratos passam em Postgres real.

### T-204 · Convidado vira conta e reivindicação de sala

- **R2 · S** (reivindicação de sala é M) · Cobre: RF-04, seção 2 item 4 dos requisitos · Depende de: T-201, T-203
- **Entregáveis:** `LinkGuestToAccount` (associa `guestSessionId` a `userId` mantendo participações) e `ClaimRoom` (host logado com token de host válido vincula a sala à conta e, opcionalmente, a um time).
- **Aceite:** reivindicar exige token de host válido. Sala reivindicada deixa de expirar por TTL e passa a gravar histórico; o que já foi estimado nela é preservado e vira histórico. Participações anteriores do convidado aparecem na conta.

### T-205 · Salas de time persistentes

- **R2 · M** · Cobre: RF-26 · Depende de: T-202, T-203
- **Entregáveis:** criação de sala vinculada a time por quem tem `createTeamRoom`; membros entram com o papel do time sem escolher; 🟡 convidados externos ainda entram por link (`allowGuests`, padrão ligado) e escolhem papel; sala de time não expira.
- **Aceite:** membro de outro time não entra como membro. Sala de convidado continua efêmera. Papel do time mapeia para o papel do participante e define `canVote` por `votingRoles`.

### T-206 · Registro de histórico

- **R2 · M** (RF-61 e RF-65 são S) · Cobre: RF-60, RF-61, RF-65 · Depende de: T-203, T-205
- **Entregáveis:** `HistoryRecorder` chamado ao definir a estimativa final em sala de time ou de usuário logado: item, rodadas, votos (por pessoa ou agregados, conforme `storeVotesPerPerson`), estimativa final, data, sala e sprint; edição posterior com `EstimateAudit` (quem e quando).
- **Aceite:** com agregado, nenhum voto individual é persistido (verificação direta no banco). Sala de convidado nunca grava histórico (INV-13). Editar a estimativa final grava o registro de auditoria.

### T-207 · UI: histórico, busca e exportação

- **R2 · M** (RF-62 é S) · Cobre: RF-62, RF-63 · Depende de: T-206, T-113
- **Entregáveis:** tela de histórico com filtros por período, sprint, sala, estimativa e texto, com paginação; exportar CSV e JSON do filtro aplicado; edição de estimativa final para quem tem permissão.
- **Aceite:** a exportação é idêntica ao resultado filtrado. Observador vê mas não exporta. Tabela acessível (cabeçalhos, ordenação anunciada).
- **Testes:** e2e e axe.

### T-208 · Painel do SuperAdmin e Organização

- **R2 · S** · Cobre: RF-13, RF-14 · Depende de: T-203
- **Entregáveis:** SuperAdmin definido por variável de ambiente `SUPERADMIN_EMAILS`; painel `/admin` com lista de times e usuários, suspender e reativar, métricas de uso (salas ativas, participantes, times); `Organization` no modelo, sem tela dedicada; log de auditoria das ações administrativas.
- **Aceite:** qualquer rota `/admin` e API correspondente retorna 403 para não SuperAdmin. Suspender invalida sessões ativas e impede nova entrada. As métricas não expõem votos nem apelidos.

### T-209 · Exclusão de conta e privacidade (LGPD)

- **R2 · M** · Cobre: RF-05, RNF-14, RNF-15 · Depende de: T-203, T-206
- **Entregáveis:** `DeleteAccount` (remove usuário, memberships, identidade no provedor e preferências; no histórico do time, a autoria dos votos é anonimizada como «Participante removido»); páginas de política de privacidade simples e aviso de uso, em i18n, citando `PRODUCT_NAME` e a retenção; confirmação com redigitação do e-mail.
- **Aceite:** o único Admin de um time com outros membros não consegue excluir a conta (`LAST_ADMIN`) até transferir. Time sem outros membros é excluído junto. Após excluir, nenhum dado pessoal da pessoa permanece (verificação por consulta no banco).

### T-210 · Preferências na conta

- **R2 · S** · Cobre: RF-96 · Depende de: T-201, T-122
- **Entregáveis:** idioma e tema salvos na conta e aplicados no login em qualquer dispositivo.
- **Aceite:** conflito entre preferência local e da conta: a conta vence e atualiza o navegador.

### T-211 · Testes de autorização ponta a ponta

- **R2 · M** · Cobre: RNF-13 · Depende de: T-201 a T-209
- **Entregáveis:** suíte gerada da matriz de permissões: cada rota × cada ator (SuperAdmin, Admin do time, PM, PO, Dev, QA, Observador, Convidado, sem sessão, usuário de outro time) com permitido ou negado esperado.
- **Aceite:** o teste falha se existir rota sem linha na tabela. Nenhum acesso a dados de outro time (IDOR) por troca de ids na URL ou no corpo.

### T-212 · Gate da R2

- **R2 · M** · Depende de: T-201 a T-211
- **Checklist:** `pnpm verify` verde; axe e roteiro manual atualizados (`docs/a11y/R2.md`); testes de autorização verdes; migrações aplicadas sem perda; exclusão de conta verificada; uso real numa sessão do time com login; nenhum erro bloqueante.

### R3 — Gestão de sprint

**Pré-condição:** as definições da §6 (capacity, comprometido, entregue, carry-over) precisam estar validadas por você antes de iniciar a R3 (risco 2). Se mudarem, ajuste a §6 primeiro e só então rode as tarefas.

### T-301 · Domínio: Sprint e ciclo de vida

- **R3 · M** · Cobre: RF-70, RF-74 · Depende de: T-212 · Contexto: §3 (INV-10, INV-11), §6.3
- **Entregáveis:** agregado `Sprint` (`planned → active → closed`), `SprintBuilder`, operações `activate(now)` e `close(now)`.
- **Aceite:** `startDate ≤ endDate`, nome obrigatório, meta opcional. 🟡 Sprints do mesmo time não se sobrepõem em datas (`VALIDATION`). Sprint `closed` rejeita qualquer alteração (`FORBIDDEN`). `activate` só a partir de `planned`; `close` só a partir de `active`.
- **Testes:** unitários e transições inválidas.

### T-302 · Domínio: dias úteis e capacity

- **R3 · M** (RF-75 é S) · Cobre: RF-71, RF-75, RF-81 · Depende de: T-301 · Contexto: §6.2
- **Entregáveis:** `computeWorkingDays(start, end, holidays)` e `computeCapacity(entries, workingDays)`, com `Holiday`.
- **Aceite:** o vetor da §6.2 resulta em 9 dias úteis e capacity total 15,4. Feriado em fim de semana não reduz dias. Ausência maior que os dias úteis resulta em disponibilidade 0, nunca negativa. `focusPct` fora de 0 a 100 → `VALIDATION`.
- **Testes:** unitários, incluindo sprint que cruza mês e ano.

### T-303 · Domínio: comprometido, entregue e carry-over

- **R3 · M** · Cobre: RF-72, RF-73, RF-74 · Depende de: T-301, T-105 · Contexto: §6.3
- **Entregáveis:** `linkItem`, `unlinkItem`, snapshot de `committedPoints` em `activate`, `markDone`, `close` produzindo `SprintReport` (`committed`, `delivered`, `addedAfterStart`, `carryOver[]`, `unestimated[]`) com métricas congeladas.
- **Aceite:** item em duas sprints abertas → `VALIDATION` (INV-11). Item adicionado após `activate` não altera `committedPoints`, mas entra em `addedAfterStart` e conta na entrega. Item não concluído vira carry-over e volta ao backlog. Item sem estimativa numérica vale zero e aparece em `unestimated`.
- **Testes:** unitários com os cenários acima.

### T-304 · Casos de uso e persistência da sprint

- **R3 · M** · Cobre: RF-70 a RF-75 · Depende de: T-302, T-303 · Pacotes: `application`, `adapter-persistence-postgres`
- **Entregáveis:** `CreateSprint`, `SetCapacity`, `ManageHolidays`, `LinkItemsToSprint`, `MarkItemDone`, `ActivateSprint`, `CloseSprint`, `GetSprintReport`; migrações `sprints`, `capacity_entries`, `holidays`, `sprint_items` e `forecast_records` (criada vazia para a R4); todas protegidas por `can(configureSprints)`.
- **Aceite:** só Admin do time, PM, PO e SuperAdmin configuram. Encerrar congela e persiste o relatório. A suíte de contrato cobre os novos repositórios.

### T-305 · UI: sprints, capacity e feriados

- **R3 · M** (RF-75 é S) · Cobre: RF-70, RF-71, RF-75 · Depende de: T-304
- **Entregáveis:** lista e formulário de sprint; tabela de capacity por pessoa (ausências e % de foco) com total calculado ao vivo; calendário de feriados e folgas do time.
- **Aceite:** o total exibido coincide com `computeCapacity`. Formulários com rótulos, erros associados aos campos e uso completo por teclado. Datas formatadas por `Intl`.
- **Testes:** e2e e axe.

### T-306 · UI: vincular itens, entrega e encerramento

- **R3 · M** · Cobre: RF-72, RF-73, RF-74 · Depende de: T-304, T-207
- **Entregáveis:** escolher itens estimados do histórico do time para a sprint (com total de pontos comprometidos); marcar itens concluídos; encerrar com resumo (comprometido, entregue, carry-over, itens sem estimativa) e confirmação explícita, pois é irreversível.
- **Aceite:** o resumo coincide com o `SprintReport`. Após encerrar, todos os controles de edição ficam desabilitados com texto explicando.

### T-307 · UI: dashboard de velocity e capacity

- **R3 · M** · Cobre: RF-80, RF-81 · Depende de: T-304 · Contexto: D-11
- **Entregáveis:** gráfico de velocity por sprint (comprometido × entregue) e de capacity por sprint (pessoa-dias e capacity ajustada) em SVG próprio; **tabela equivalente** abaixo de cada gráfico; estado vazio claro quando houver menos de 3 sprints.
- **Aceite:** cada série tem rótulo textual e padrão ou forma além da cor. O dashboard exibe pelo menos 3 sprints encerradas (indicador de sucesso). Os dados do gráfico e da tabela vêm da mesma fonte.
- **Testes:** e2e, axe e snapshot do SVG.

### T-308 · Indicadores de estimativa

- **R3 · S** · Cobre: RF-83 · Depende de: T-206, T-307
- **Entregáveis:** `computeEstimationIndicators`: taxa de consenso (rodadas com consenso ÷ rodadas reveladas), distribuição de pontos por valor e lista de itens com muita divergência (🟡 definição: primeira rodada com distância ≥ 3 posições na escala entre mínimo e máximo, ou 3 ou mais rodadas até fechar); tela correspondente.
- **Aceite:** respeita o filtro de time e período. A lista de divergência leva ao item no histórico.

### T-309 · Comentário curto no voto

- **R3 · C** · Cobre: RF-50 · Depende de: T-116
- **Entregáveis:** campo opcional de comentário (🟡 até 140 caracteres) junto ao voto, visível só após a revelação, com escape na renderização.
- **Aceite:** antes da revelação o comentário não sai do servidor para outros participantes (estende o teste de não-vazamento). Observador comenta só se `allowObserverComments` estiver ligado.

### T-310 · Gate da R3

- **R3 · M** · Depende de: T-301 a T-309
- **Checklist:** `pnpm verify` verde; vetores da §6.2 e §6.3 passando; axe e roteiro manual (`docs/a11y/R3.md`); ao menos 1 sprint real registrada e encerrada; nenhum erro bloqueante.

### R4 — Previsão e integração

### T-401 · Domínio: previsão de pontos

- **R4 · M** · Cobre: RF-82, RF-85 · Depende de: T-310 · Contexto: §6.4
- **Entregáveis:** `computeForecast(closedSprints, plannedCapacity)` com `ForecastReportBuilder`, retornando `{ status: 'ok', predicted, low, high, medianPace, sprintsUsed }` ou `{ status: 'insufficient_data', have, need: 3 }`; funções `median` e `percentile` (interpolação linear).
- **Aceite:** todos os vetores da §6.4 (previsão 30,8; faixa 23,1 a 34,65; percentis 1,625 e 2,875) passam. Menos de 3 sprints → `insufficient_data`. Sprint com capacity 0 é ignorada e listada. Com exatamente 3 sprints, usa mínimo e máximo; com 6 ou mais, usa P25 e P75 das últimas 6.
- **Testes:** unitários e baseados em propriedades (`low ≤ predicted ≤ high`).

### T-402 · Acurácia da previsão

- **R4 · S** · Cobre: RF-84 · Depende de: T-401, T-304
- **Entregáveis:** `ActivateSprint` cria o `ForecastRecord` com a previsão do momento; `CloseSprint` completa `delivered` e `errorPct`; `computeAccuracy` devolve série e média dos `|errorPct|`.
- **Aceite:** previsto 30,8 e entregue 28 → `errorPct ≈ −9,09`. Sprint ativada sem dados suficientes grava o registro com `status: insufficient_data` e fica fora da média.

### T-403 · UI: previsão e acurácia

- **R4 · M** · Cobre: RF-82, RF-84, RF-85 · Depende de: T-401, T-402, T-307
- **Entregáveis:** cartão «Previsão para a próxima sprint» com valor, faixa e ritmo usado; aviso «dados insuficientes» quando houver menos de 3 sprints; gráfico previsto × entregue; texto fixo (i18n) deixando claro que é uma **estimativa estatística, não um compromisso**.
- **Aceite:** o texto de aviso está sempre visível junto ao número. Faixa e valor com tabela equivalente. Nenhuma previsão numérica aparece com dados insuficientes.
- **Testes:** e2e com 2, 3 e 6 sprints; axe.

### T-404 · Filtros e exportação do dashboard

- **R4 · S** · Cobre: RF-86 · Depende de: T-307, T-403
- **Entregáveis:** filtros por time e período; exportar dados (CSV e JSON) e gráficos (SVG ou PNG).
- **Aceite:** o arquivo exportado reflete exatamente o filtro aplicado. Observador não exporta.

### T-405 · Primeira integração real, em leitura 🔒 bloqueada

- **R4 · S** · Cobre: RF-91 · Depende de: T-109, **decisão ❓1 (ferramenta de backlog)**
- **Pré-requisitos para liberar:** nome da ferramenta, tipo de autenticação disponível, e confirmação dos limites de API vigentes (conferir na documentação oficial).
- **Entregáveis (quando liberada):** novo pacote `adapter-issuetracker-<ferramenta>` implementando `importItems` somente leitura; credenciais por time guardadas criptografadas em repouso, nunca expostas ao navegador; mapeamento ferramenta → `Item` (chave externa, título, descrição, link); tela de importação com filtro e pré-visualização.
- **Aceite:** a suíte de contrato de `IssueTracker` passa contra servidor simulado. Nenhuma operação de escrita na ferramenta externa. Falha de rede ou credencial inválida gera erro tratado e traduzido, sem expor segredo em log.
- **Fora do escopo:** escrita da estimativa de volta (RF-92).

### T-406 · Gate da R4 e fechamento do MVP

- **R4 · M** · Depende de: T-401 a T-404 (e T-405, se desbloqueada)
- **Checklist:** `pnpm verify` verde; vetores da §6.4 passando; axe e roteiro manual (`docs/a11y/R4.md`); conferência dos indicadores de sucesso da seção 1 dos requisitos (100% das planning sessions por 3 sprints, dashboard com 3 sprints encerradas, acompanhamento do erro de previsão); `docs/limits.md` revisado.

### Pós-MVP (não executar agora)

RF-92 (escrita da estimativa de volta), RF-93 (adapters adicionais: Jira, Azure DevOps, Trello, GitHub, Linear), SSO corporativo (Microsoft e SAML), simulação de Monte Carlo para datas de entrega e interface multi-organização. Cada um vira um conjunto de tarefas próprio a partir desta base, sem alterar o `domain`.

## 9. Matriz de rastreabilidade

| Requisito | Tarefas |
| --- | --- |
| RF-01, RF-02 | T-107, T-114, T-115, T-120 |
| RF-03 | T-201 |
| RF-04 | T-204 |
| RF-05 | T-209 |
| RF-10, RF-11, RF-12 | T-202, T-103 |
| RF-13, RF-14 | T-208 |
| RF-20, RF-21 | T-104, T-107, T-115 |
| RF-22 | T-106, T-116 |
| RF-23, RF-24, RF-25 | T-104, T-107, T-115, T-118 |
| RF-26 | T-205 |
| RF-27 | T-119 |
| RF-30 a RF-33 | T-108, T-109, T-117 |
| RF-40 a RF-43, RF-45, RF-46 | T-105, T-110, T-116 |
| RF-44 | T-102, T-116 |
| RF-47, RF-48 | T-101, T-116 |
| RF-49 | T-110, T-118 |
| RF-50 | T-309 |
| RF-60, RF-61, RF-65 | T-206, T-207 |
| RF-62, RF-63 | T-207, T-113 |
| RF-64 | T-113 |
| RF-70 a RF-75 | T-301 a T-306 |
| RF-80, RF-81 | T-307 |
| RF-82, RF-85 | T-401, T-403 |
| RF-83 | T-308 |
| RF-84 | T-402, T-403 |
| RF-86 | T-404 |
| RF-90 | T-109 |
| RF-91 | T-405 |
| RF-92, RF-93 | pós-MVP |
| RF-95 | T-005, T-122 |
| RF-96 | T-210 |
| RNF-01, RNF-03 | T-112, T-126 |
| RNF-02, RNF-22 | T-124 |
| RNF-04, RNF-05 | T-004, T-106, T-112, T-120 |
| RNF-06, RNF-07 | T-005, T-115, T-119 |
| RNF-08, RNF-09, RNF-10 | T-005, T-123 e todas as tarefas de UI |
| RNF-11 | T-005, T-122 |
| RNF-12, RNF-13 | T-103, T-114, T-211 |
| RNF-14, RNF-15 | T-121, T-209 |
| RNF-16, RNF-17, RNF-18 | T-001 a T-004, T-111 |
| RNF-19, RNF-20, RNF-23 | T-111, T-125 |
| RNF-21 | T-005 |

## 10. Ordem de execução e paralelismo

Após a R0 (T-001 a T-005, quase toda em sequência: T-001 → T-002 e T-003 → T-004; T-005 depende de T-002), a R1 se divide em trilhas que podem rodar em paralelo por agentes diferentes:

- **Domínio:** T-101 → T-102; T-103 em paralelo; T-104 (depende de T-101 e T-103) → T-105 → T-106.
- **Aplicação:** T-107 → T-108 → T-110.
- **Adapters** (depois de T-107 e T-106): T-109, T-111, T-112, T-113, todos em paralelo, cada um no seu pacote.
- **Web:** T-114 → T-115 → T-116 → (T-117, T-118, T-119 em paralelo) → T-120 → (T-121 a T-126 em paralelo) → T-127.

R2, R3 e R4 seguem o mesmo padrão: primeiro domínio, depois aplicação e persistência, depois UI, e por fim o gate. A T-405 pode ser liberada a qualquer momento depois de T-109, assim que a ferramenta de backlog for decidida.

## 11. Modelo de prompt para o agente

```
Você vai executar a tarefa {T-xxx} do SDD do projeto.
1. Leia AGENTS.md e a seção 0 do SDD.
2. Leia as seções do SDD citadas em Contexto e a especificação da tarefa.
3. Escreva primeiro os testes listados em Aceite e Testes; veja-os falhar.
4. Implemente o mínimo necessário, respeitando as fronteiras entre pacotes.
5. Rode pnpm verify até ficar verde.
6. Se houver ambiguidade, registre em docs/questions.md e siga com o default mais conservador.
7. Abra o PR com: critérios de aceite marcados, arquivos criados, decisões tomadas.
Não faça nada listado em Fora do escopo. Não altere o SDD.
```

O `AGENTS.md` da raiz deve conter a seção 0 (convenções, regras para agentes e DoD), a regra de dependência da seção 2 e o comando `pnpm verify`.

## 12. Pontos que precisam da sua validação

**Bloqueio real**

- ❓ Ferramenta de backlog do time: bloqueia apenas a T-405 (R4).

**Antes de começar a implementar**

- Confirmar os limites vigentes dos planos gratuitos (Supabase, Neon, Vercel, Cloudflare) e escolher o provedor. As portas isolam a escolha, mas o adapter de persistência (T-111) e o de realtime (T-112) dependem dela.
- Nome do produto e domínio (`PRODUCT_NAME`) e licença: não bloqueiam, mas aparecem na política de privacidade (T-209).

**Valores 🟡 criados neste SDD (ajuste se discordar)**

- Host offline por 60 s antes da transferência automática; online = visto nos últimos 45 s; heartbeat de 20 s.
- Limites de conteúdo: título 200, descrição 2000 caracteres, 500 itens por sala, importação de 500 linhas e 1 MB, comentário de voto com 140 caracteres.
- Limites de abuso: 10 salas por hora por IP, 20 tentativas de código por minuto por IP, 60 mutações por minuto por participante, 5 magic links por hora por e-mail.
- Sessão de login com 7 dias deslizantes; convite de time válido por 7 dias.
- Orçamento de JS inicial da sala: 150 KB gzip.
- Sprints do mesmo time sem sobreposição de datas; `focusPct` padrão 100.
- Definição de «itens com muita divergência» (distância ≥ 3 posições ou 3 ou mais rodadas).
- Alterações em quem vota valem a partir da próxima rodada; telão não ocupa vaga entre os 30.
