# Fibonaipe — Documento Oficial de Requisitos (v1.0)

**Projeto:** Fibonaipe (Fibonacci + Naipe)  
**Versão:** 1.0 (Consolidada)  
**Data:** 26/10/2026  
**Status:** Oficial — Pronto para Arquitetura e Implementação

---

## 1. Visão do Produto e Objetivos

O **Fibonaipe** é uma plataforma web gratuita, de código aberto e *mobile-first* de **Planning Poker**, projetada para oferecer paridade funcional completa com o **PlanITPoker**, acrescentando ferramentas avançadas de **gestão de sprints**, **observabilidade de estimativas**, **dashboard de capacity e velocity** e **previsão estatística de entregas** baseada no histórico real de cada equipe.

Seu grande diferencial na dinâmica de estimativa é a votação bidimensional: além do valor numérico na sequência de **Fibonacci** (esforço/complexidade), cada voto pode carregar um **naipe de baralho** que representa uma segunda dimensão do esforço (por padrão, **Risco / Incerteza**), permitindo que a equipe identifique desalinhamentos ocultos mesmo quando há consenso nos números.

### 1.1 Objetivos de Negócio e Indicadores de Sucesso (KPIs)

| Objetivo | Indicador de Sucesso (Meta) |
| :--- | :--- |
| **Substituir o PlanITPoker sem limites de uso** | O time realiza 100% das sessões de *refinement* e *planning* na ferramenta por 3 sprints consecutivas. |
| **Histórico e observabilidade de estimativas** | 100% das estimativas finais, rodadas agregadas e divergências de naipe ficam consultáveis e exportáveis. |
| **Gestão de Capacity e Velocity** | Dashboard consolidando pelo menos 3 sprints encerradas com comparativo Comprometido × Entregue. |
| **Previsão estatística de pontos** | Acompanhamento sprint a sprint da margem de erro (`errorPct`) entre pontos previstos e pontos entregues. |
| **Escala organizacional** | Adoção autônoma por um segundo time da empresa sem necessidade de suporte técnico direto. |

---

## 2. Diretrizes e Decisões Consolidadas

Esta seção consolida e oficializa todas as decisões de produto e engenharia, unificando as revisões de requisitos e o desenho técnico (SDD):

1. **Identidade do Produto:** O sistema chama-se **Fibonaipe**. Durante a fase inicial de validação, operará em subdomínio gratuito do provedor de hospedagem, com migração posterior para domínio próprio.
2. **Escala Única (Fibonacci Configurável):** A escala oficial do produto é **Fibonacci** (`0, ½, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89`). Cada time ou host pode ativar/desativar quais valores da sequência utiliza habitualmente e documentar o significado de referência para o time.
3. **Segunda Dimensão por Naipe:** Cada voto é composto por `Valor Fibonacci + Naipe (opcional)`:
   - **♣ Paus** = Alto (nível 4)
   - **♥ Copas** = Médio (nível 3)
   - **♠ Espadas** = Baixo (nível 2)
   - **♦ Ouros** = Insignificante (nível 1)
   - **Coringa (sem naipe)** = Abstenção na segunda dimensão (o voto conta normalmente pelo número, mas é neutro no naipe).
   - O significado padrão do eixo de naipe é **Risco**, podendo ser renomeado (ex.: Incerteza, Dependência Externa) ou desligado nas configurações do time/sala.
4. **Etiquetas de Item (A, K, Q, J):** As figuras do baralho (**A, K, Q, J**) ficam disponíveis para o facilitador classificar a natureza do item estimado (ex.: Feature, Bug, Tech Debt, Spike).
5. **Cartas Especiais que Não Contam no Cálculo Numérico:**
   - **`?` (Dúvida):** Sinaliza necessidade de discussão; contabilizada nos indicadores da rodada, mas ignorada na média/mediana/moda.
   - **`Coringa` (Abstenção total):** Quando usada como carta principal, abstém o votante tanto no número quanto no naipe.
   - **`AFK` (Ausente):** Marca o participante como temporariamente ausente, anulando seu voto na rodada e não bloqueando a revelação automática.
6. **Participação Independente de Cargo:** Qualquer pessoa (PO, PM, Dev, QA ou Convidado) escolhe ao entrar na sala se atuará no modo **Votante** ou **Observador**. O cargo organizacional define permissões de gestão, mas não impede o voto se a pessoa entrar como Votante.
7. **Privacidade Estrita no Histórico (Apenas Dados Agregados):** O banco de dados histórico **nunca grava votos individuais nem comentários**. Apenas o resultado agregado de cada rodada (média, mediana, moda, mínimo, máximo, contagem de especiais e distribuição de naipes) e a estimativa final do item são persistidos.
8. **Ciclo de Vida de Salas Efêmeras (Anônimas):** Salas criadas sem vínculo a um time são **apagadas definitivamente 1 hora após ficarem sem conexões ativas** (`ANON_ROOM_TTL_MINUTES = 60`), sem deixar rastros ou logs de conteúdo. Antes de encerrar, o sistema oferece a exportação do resumo da sessão (CSV/JSON).
9. **Reivindicação de Sala Efêmera:** O criador de uma sala anônima recebe um token criptográfico de host. Caso faça login com a sala ainda ativa, pode reivindicá-la e vinculá-la a um time, convertendo os itens já estimados em histórico persistente.
10. **Pontuação Integral na Entrega (Sem Pontos Parciais):** Itens concluídos (`Done`) contabilizam 100% dos seus pontos na sprint em que foram finalizados. Itens não concluídos contabilizam `0` pontos na sprint atual e entram automaticamente em *carry-over* para retorno ao backlog.
11. **Stack Tecnológica Oficial:**
    - **Gerenciador de Pacotes e Monorepo:** **npm puro** (`npm workspaces`, com `package-lock.json` versionado; sem `pnpm` ou `yarn`).
    - **Runtime:** Node.js LTS com TypeScript em modo estrito (`strict: true`, `noUncheckedIndexedAccess: true`).
    - **Front-end:** **React** com **TanStack** (TanStack Router e TanStack Query) empacotado com **Vite**, operando como **PWA** *mobile-first*.
    - **Arquitetura:** **Ports & Adapters (Hexagonal)** com padrão **Builder** para entidades e configurações complexas e padrão **Result** (`Result<T, AppError>`) para tratamento explícito de erros sem exceções não controladas.
12. **Estratégia de Integrações (Issue Trackers):** Implementação via porta `IssueTracker`. A Release 1 entrega importação Manual/Texto/CSV; a primeira integração externa oficial será com o **ClickUp** (modo leitura), seguida pelo **Jira** (modo leitura). A escrita da estimativa de volta na ferramenta externa fica para o Pós-MVP.
13. **Licenciamento e Governança:** Repositório público sob licença permissiva (**Apache-2.0** ou **MIT**), com verificação automatizada de licenças de dependências no CI e exigência de DCO/CLA para contribuições externas, preservando a titularidade e a opção de fechamento comercial futuro.

---

## 3. Papéis, Modos de Sala e Permissões

O Fibonaipe separa **Papel Organizacional** (permissões no sistema e no time) de **Modo de Participação na Sala** (**Votante** vs. **Observador**) e **Função na Sessão** (**Host** / **Facilitador Delegado**).

### 3.1 Matriz de Permissões (`can`)

| Ação / Capacidade | SuperAdmin | Admin do Time | PM | PO | Dev / QA | Observador (Time) | Convidado (Anônimo) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| Gerenciar instância (todos os times, usuários e métricas globais) | ✔ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ |
| Criar, editar, excluir time e gerenciar membros/convites | ✔ | ✔ | ✘ | ✘ | ✘ | ✘ | ✘ |
| Configurar sprints, feriados e capacity da equipe | ✔ | ✔ | ✔ | ✘ | ✘ | ✘ | ✘ |
| Criar sala persistente vinculada ao time | ✔ | ✔ | ✔ | ✔ | ✘ | ✘ | ✘ |
| Criar sala efêmera (avulsa) | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| Atuar como Host / Facilitador da sala | ✔ | ✔ | ✔ | ✔ | Delegável\* | Delegável\* | Só na sala que criou\* |
| Votar em rodadas (quando entra no modo **Votante**) | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| Revelar cartas, abrir nova rodada, gerir fila e definir estimativa final | Host/Facil. | Host/Facil. | Host/Facil. | Host/Facil. | Host/Facil. | Host/Facil. | Host/Facil. |
| Visualizar dashboard de sprints, observabilidade e histórico do time | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ (leitura) | ✘ |
| Exportar histórico do time e relatórios de sprint (CSV/JSON) | ✔ | ✔ | ✔ | ✔ | ✔ | ✘ | ✘ |
| Exportar resumo da própria sala ativa | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |

*\*Nota: O Host da sala pode transferir a titularidade de Host ou delegar a função de Facilitador para qualquer participante online da sala. Além disso, caso o Host fique offline por mais de 60 segundos havendo outros participantes online, o sistema transfere automaticamente a função de Host (priorizando o Facilitador delegado, depois PM > PO > Dev > QA > Observador, desempatando pela entrada mais antiga).*

---

## 4. Requisitos Funcionais (RF)

Prioridades pelo método MoSCoW:
- **M (*Must have*):** Obrigatório para a release indicada.
- **S (*Should have*):** Importante, agrega alto valor na release indicada.
- **C (*Could have*):** Desejável, incluído se não comprometer o escopo principal.

### 4.1 Acesso, Identidade e Sessão

| ID | Requisito | Prio. | Release |
| :--- | :--- | :---: | :---: |
| **RF-01** | **Entrada Rápida como Convidado:** Entrar em uma sala informando apelido (1 a 30 caracteres, único na sala *case-insensitive*), papel informativo e modo (**Votante** ou **Observador**), via link direto, código curto de 8 caracteres ou QR Code. | M | R1 |
| **RF-02** | **Reconexão Transparente:** Reconectar automaticamente no mesmo navegador (via cookie de sessão seguro) preservando identidade, permissões de host/facilitador e o voto já registrado na rodada ativa. | M | R1 |
| **RF-03** | **Autenticação Passwordless e Social:** Realizar login via *Magic Link* por e-mail e via OAuth com Google. | M | R2 |
| **RF-04** | **Reivindicação de Sala Ativa:** Permitir que o criador de uma sala efêmera faça login durante a sessão e reivindique a sala, vinculando-a a um time e convertendo as estimativas da sessão em histórico persistente. | S | R2 |
| **RF-05** | **Autogestão e Exclusão de Conta (LGPD):** Permitir que o usuário exclua sua própria conta e dados pessoais associados mediante confirmação explícita, mantendo os históricos agregados dos times intactos. | M | R2 |

### 4.2 Times, Organizações e Administração

| ID | Requisito | Prio. | Release |
| :--- | :--- | :---: | :---: |
| **RF-10** | **Gestão de Times e Convites:** Criar times e gerar links de convite (com validade de 7 dias e opção de revogação) com papel pré-definido. | M | R2 |
| **RF-11** | **Controle de Papéis no Time:** Atribuir, alterar e remover papéis de membros respeitando a matriz de permissões, garantindo que todo time possua ao menos um `Admin do Time` (`LAST_ADMIN`). | M | R2 |
| **RF-12** | **Múltiplos Times por Usuário:** Permitir que uma mesma conta de usuário pertença a múltiplos times simultaneamente e alterne entre eles. | S | R2 |
| **RF-13** | **Painel do SuperAdmin:** Interface administrativa da instância (`/admin`) para listar times e usuários, suspender/reativar contas e visualizar métricas operacionais globais (salas ativas, total de participantes, times), sem acesso a votos ou conteúdos privados. | S | R2 |
| **RF-14** | **Estrutura Multi-Organização no Modelo:** Estruturar o banco de dados com a entidade `Organization` agrupando `Teams` (com uma organização padrão implícita no MVP), preparando a expansão corporativa sem migrações destrutivas. | C | R2 |

### 4.3 Salas de Planning Poker

| ID | Requisito | Prio. | Release |
| :--- | :--- | :---: | :---: |
| **RF-20** | **Criação de Sala:** Criar sala configurando nome, subconjunto de cartas da escala Fibonacci, ativação/significado dos naipes e regras de condução, com ou sem login. | M | R1 |
| **RF-21** | **Compartilhamento Fácil:** Gerar link direto (`/r/:code`), código alfanumérico curto de 8 caracteres (sem caracteres ambíguos como `0/O/1/I/L`) e QR Code gerado localmente no navegador. | M | R1 |
| **RF-22** | **Presença e Status em Tempo Real:** Exibir lista de participantes com estado de conexão (`online`/`offline`), papel, modo (`Votante`/`Observador`/`AFK`) e indicador textual de quem já votou na rodada. | M | R1 |
| **RF-23** | **Gestão de Host e Facilitador:** Permitir transferência manual de Host, delegação de Facilitador e transferência automática de Host após 60 segundos de desconexão, evitando salas órfãs. | M | R1 |
| **RF-24** | **Configurações Dinâmicas da Sala:** Permitir ao Host configurar: cartas Fibonacci ativas, eixo de naipe ligado/desligado e seu rótulo (ex.: Risco), revelação automática, timer padrão e exibição ou ocultação da média numérica. | M | R1 |
| **RF-25** | **Limite de Capacidade da Sala:** Suportar até 30 participantes simultâneos por sala (Votantes + Observadores). Na 31ª tentativa de entrada, exibir mensagem clara de sala cheia (`ROOM_FULL`). | M | R1 |
| **RF-26** | **Salas Persistentes vs. Efêmeras:** Diferenciar salas vinculadas a um time (persistentes, associáveis a sprints e com gravação automática de histórico) de salas efêmeras (expiradas e expurgadas 1 hora após ficarem sem conexões ativas). | M | R2 |
| **RF-27** | **Modo Telão (Projetor):** Oferecer rota dedicada (`/r/:code/screen`) somente leitura, com tipografia ampliada (≥ 48 px nos elementos principais), alto contraste e QR Code visível para salas presenciais/híbridas, sem consumir vaga no limite de 30 participantes. | S | R1 |

### 4.4 Fila de Itens a Estimar

| ID | Requisito | Prio. | Release |
| :--- | :--- | :---: | :---: |
| **RF-30** | **Cadastro Manual de Item:** Adicionar itens à fila com título (até 200 caracteres), descrição (até 2.000 caracteres), link externo (`http`/`https`) e etiqueta opcional de figura (`A`, `K`, `Q`, `J`). | M | R1 |
| **RF-31** | **Importação em Lote (Texto e CSV):** Importar lista de itens colando texto livre (um item por linha) ou enviando arquivo CSV (com detecção de `,` ou `;`, suporte a UTF-8/BOM e pré-visualização com validação linha a linha, até 500 itens por sala). | M | R1 |
| **RF-32** | **Gestão e Reordenação da Fila:** Reordenar itens da fila via *drag-and-drop* e via controles de teclado (subir/descer), destacando o item atualmente em votação (`current`). | M | R1 |
| **RF-33** | **Pular, Adiar e Reabrir Item:** Permitir pular (`skipped`) ou adiar (`deferred`) o item atual sem perder rodadas já realizadas, bem como selecionar qualquer item da fila para iniciar ou retomar sua estimativa. | S | R1 |

### 4.5 Dinâmica de Votação, Naipes e Resultados

| ID | Requisito | Prio. | Release |
| :--- | :--- | :---: | :---: |
| **RF-40** | **Voto Oculto com Segurança de Rede:** Registrar voto escolhendo uma carta da escala Fibonacci; o valor do voto jamais trafega para os demais clientes antes da revelação da rodada. | M | R1 |
| **RF-41** | **Alteração e Retirada de Voto:** Permitir que o participante altere sua carta/naipe ou retire seu voto livremente enquanto a rodada estiver com status `voting`. | M | R1 |
| **RF-42** | **Sinalização de Voto Registrado:** Exibir para a mesa quem já votou (`hasVoted = true`) ou quem está aguardando, sem revelar o conteúdo da carta. | M | R1 |
| **RF-43** | **Revelação Manual e Automática:** Permitir que o Host/Facilitador revele as cartas a qualquer momento ou revelar automaticamente assim que todos os Votantes online (não-AFK) tiverem votado (mínimo de 1 voto válido). | M | R1 |
| **RF-44** | **Estatísticas Completas da Rodada:** Calcular e exibir após a revelação: **média**, **mediana**, **moda**, **mínimo**, **máximo**, indicador de **consenso** (todos os votos numéricos iguais), **quase-consenso** (distância máxima de 1 carta na escala) e destaque textual dos extremos (menor e maior voto). | M | R1 |
| **RF-45** | **Múltiplas Rodadas por Item:** Permitir abrir uma nova rodada (`Round n+1`) para o mesmo item, limpando a mesa para novo voto mas preservando as estatísticas agregadas das rodadas anteriores para comparação de convergência. | M | R1 |
| **RF-46** | **Definição da Estimativa Final:** Permitir que o Host/Facilitador feche a estimativa escolhendo o valor final na escala Fibonacci (podendo divergir da média matemática). | M | R1 |
| **RF-47** | **Cartas Especiais (`?`, `Coringa`, `AFK`):** Disponibilizar as cartas `?` (dúvida — destacada no resultado para puxar debate), `Coringa` (abstenção em ponto e naipe) e o estado `AFK` (ausente temporário — anula voto ativo e retira da contagem de espera). Nenhuma delas entra no cálculo de média/mediana/moda. | M | R1 |
| **RF-48** | **Escala Fibonacci Customizável por Sala/Time:** Operar exclusivamente sobre a sequência de Fibonacci, permitindo selecionar quais cartas compõem o baralho ativo da equipe (ex.: ocultar `0`, `½` ou valores acima de `21`). | M | R1 |
| **RF-49** | **Timer Sincronizado por Rodada:** Oferecer cronômetro opcional por rodada sincronizado pelo horário do servidor (`serverTime`), emitindo alerta visual e sonoro/acessível (`aria-live`) ao zerar, sem forçar revelação automática. | S | R1 |
| **RF-50** | **Justificativa Curta no Voto:** Permitir anexar um comentário curto opcional (até 140 caracteres) ao voto, oculto até a revelação e descartado ao fim da sessão (nunca salvo no histórico permanente). | C | R3 |
| **RF-51** | **Seleção Ágil de Naipe:** Permitir associar um naipe ao voto numérico com no máximo um toque/clique adicional; se nenhum naipe for selecionado, assume-se `Coringa` no naipe (voto vale apenas pelo número). | M | R1 |
| **RF-52** | **Hierarquia dos Naipes:** Mapear os naipes em quatro níveis claros e sempre acompanhados de rótulo textual: **♣ Paus = Alto**, **♥ Copas = Médio**, **♠ Espadas = Baixo**, **♦ Ouros = Insignificante** e **Coringa = Abstenção**. | M | R1 |
| **RF-53** | **Configuração do Eixo de Naipe no Time:** Permitir ao time definir o nome da dimensão representada pelo naipe (padrão: **Risco**) ou desativar o uso de naipes por padrão nas suas salas. | S | R2 |
| **RF-54** | **Análise e Alerta de Divergência de Naipe:** Exibir no resultado da rodada a distribuição de naipes votados e destacar automaticamente quando houver **divergência de 2 ou mais níveis** (ex.: alguém votou ♣ Alto e outro votou ♠ Baixo ou ♦ Insignificante), mesmo que os pontos Fibonacci sejam idênticos. | S | R1 |
| **RF-55** | **Modo Observador Estrito:** Garantir que participantes no modo Observador visualizem a mesa, a presença e os resultados revelados, mas não recebam baralho de votação nem sejam contados no cálculo de revelação automática. | M | R1 |
| **RF-56** | **Etiquetas de Baralho nos Itens (`A`, `K`, `Q`, `J`):** Permitir ao Host/Facilitador rotular itens com as letras **A, K, Q, J** (significados configuráveis pelo time, como *Feature*, *Bug*, *Tech Debt*, *Spike*) para categorização visual e analítica. | C | R3 |

### 4.6 Histórico e Auditoria de Estimativas

| ID | Requisito | Prio. | Release |
| :--- | :--- | :---: | :---: |
| **RF-60** | **Gravação Automática de Histórico Agregado:** Ao definir a estimativa final em uma sala de time, persistir por item: título/chave externa, etiqueta (`A/K/Q/J`), resumo estatístico de cada rodada (média, mediana, moda, mín, máx, distribuição de naipes e contagem de `?`/`Coringa`), estimativa final, naipe predominante, data, sala e sprint associada. | M | R2 |
| **RF-61** | **Proibição de Votos Individuais no Histórico:** Garantir arquiteturalmente que votos individuais por pessoa e comentários de rodada nunca sejam gravados nas tabelas de histórico permanente. | M | R2 |
| **RF-62** | **Consulta e Filtros de Histórico:** Disponibilizar tela de histórico do time com busca textual e filtros por período, sprint, sala, faixa de pontos, nível de naipe e etiqueta (`A/K/Q/J`). | S | R2 |
| **RF-63** | **Exportação de Histórico (CSV e JSON):** Exportar o histórico filtrado em formatos CSV (UTF-8 com BOM e proteção contra *CSV Injection*) e JSON estruturado. | M | R2 |
| **RF-64** | **Resumo Exportável de Sala Efêmera:** Permitir que qualquer participante de uma sala anônima baixe o resumo completo das estimativas da sessão (CSV/JSON) antes que a sala expire. | M | R1 |
| **RF-65** | **Edição Posterior com Trilha de Auditoria:** Permitir que usuários com permissão alterem a estimativa final de um item já estimado, registrando `EstimateAudit` (valor anterior, novo valor, autor e *timestamp* UTC). | S | R2 |

### 4.7 Gestão de Sprints e Capacity

| ID | Requisito | Prio. | Release |
| :--- | :--- | :---: | :---: |
| **RF-70** | **Ciclo de Vida de Sprints:** Criar e gerenciar sprints do time (`planned` → `active` → `closed`) com nome, data de início, data de fim (sem sobreposição de datas no mesmo time) e meta da sprint. | M | R3 |
| **RF-71** | **Cálculo de Capacity por Membro:** Registrar para cada membro na sprint os dias de ausência planejados e o percentual de foco (`focusPct`, de 0% a 100%, padrão 100%), calculando automaticamente os pessoa-dias disponíveis a partir dos dias úteis do período. | M | R3 |
| **RF-72** | **Comprometimento de Escopo (`Committed Points`):** Vincular itens estimados à sprint planejada. Ao ativar a sprint (`planned` → `active`), congelar o *snapshot* de pontos comprometidos; itens adicionados após o início são marcados como `addedAfterStart`. | M | R3 |
| **RF-73** | **Registro de Entrega, Carry-over e Estouro:** Marcar itens concluídos (`Done`) durante ou no fechamento da sprint, contabilizando seus pontos integrais em `deliveredPoints`, movendo itens incompletos para *carry-over* (0 pontos na sprint atual) e permitindo sinalizar se um item **estourou a estimativa** inicialmente prevista. | M | R3 |
| **RF-74** | **Encerramento Imutável de Sprint:** Encerrar a sprint (`active` → `closed`), congelando permanentemente suas métricas (`SprintReport`: comprometido, entregue, escopo adicionado após início, *carry-over*, capacity total e ritmo) para alimentar o motor de previsão. | M | R3 |
| **RF-75** | **Calendário de Feriados e Folgas Coletivas:** Cadastrar feriados e dias sem expediente do time para desconto automático no cálculo de dias úteis das sprints. | S | R3 |

### 4.8 Observabilidade, Dashboard e Previsão de Sprints

| ID | Requisito | Prio. | Release |
| :--- | :--- | :---: | :---: |
| **RF-80** | **Gráfico de Velocity:** Exibir gráfico evolutivo por sprint comparando **Pontos Comprometidos × Pontos Entregues** (incluindo destaque para escopo adicionado após o início), acompanhado de tabela acessível equivalente. | M | R3 |
| **RF-81** | **Gráfico de Capacity e Ritmo:** Exibir gráfico por sprint com total de pessoa-dias disponíveis, capacity ajustada pelo foco e o índice de **Ritmo** (`velocity ÷ capacity`). | M | R3 |
| **RF-82** | **Previsão Estatística para a Próxima Sprint:** Calcular e apresentar a previsão de pontos recomendados para a próxima sprint com base na capacity planejada e na mediana do ritmo histórico, exibindo valor central e faixa otimista/conservadora. | M | R4 |
| **RF-83** | **Observabilidade da Qualidade das Estimativas:** Apresentar indicadores analíticos do time: **taxa de consenso na 1ª rodada**, **distribuição de frequência das cartas Fibonacci**, **lista de itens com alta divergência** (distância ≥ 3 cartas na 1ª rodada ou ≥ 3 rodadas para convergir) e **matriz Naipe (Risco) × Estouro de Estimativa**. | S | R3 |
| **RF-84** | **Acurácia da Previsão ao Longo do Tempo:** Registrar a previsão no momento da ativação da sprint e compará-la com os pontos efetivamente entregues no encerramento, exibindo o gráfico Previsto × Entregue e o erro percentual médio (`|errorPct|`). | S | R4 |
| **RF-85** | **Proteção contra Dados Insuficientes:** Exibir aviso explícito de *"Dados insuficientes para previsão estatística (mínimo de 3 sprints encerradas)"* e ocultar números preditivos quando o time tiver menos de 3 sprints válidas no histórico. | M | R4 |
| **RF-86** | **Filtros Analíticos e Exportação do Dashboard:** Filtrar indicadores e gráficos por time e janela de tempo, permitindo exportar os datasets (CSV/JSON) e as visualizações gráficas (SVG/PNG). | S | R4 |

### 4.9 Integrações Externas e Extensibilidade

| ID | Requisito | Prio. | Release |
| :--- | :--- | :---: | :---: |
| **RF-90** | **Porta `IssueTracker` e Adapter Manual/CSV:** Definir contrato agnóstico no domínio/aplicação para importação de itens, entregue inicialmente com o adapter de texto/CSV. | M | R1 |
| **RF-91** | **Adapter ClickUp (Modo Leitura):** Importar tarefas diretamente do ClickUp (mapeando ID/chave externa, título, descrição, URL e campo de Sprint Points/Custom Field) com token armazenado de forma criptografada no servidor por time. | S | R4 |
| **RF-92** | **Adapter Jira (Modo Leitura):** Importar issues do Jira Cloud via API REST/JQL em modo leitura, validando a flexibilidade da porta `IssueTracker` com um segundo provedor oficial. | S | R4 |
| **RF-93** | **Sincronização Reversa (Escrita de Estimativa):** Escrever a estimativa final aprovada no Fibonaipe de volta no campo de pontos do ClickUp / Jira. | C | Pós-MVP |
| **RF-94** | **Adapters Adicionais:** Suportar novos conectores (GitHub Issues, GitLab, Azure DevOps, Linear, Trello) apenas adicionando pacotes `adapter-issuetracker-*`, sem alterar o domínio. | C | Pós-MVP |

### 4.10 Internacionalização e Preferências de Interface

| ID | Requisito | Prio. | Release |
| :--- | :--- | :---: | :---: |
| **RF-95** | **Multi-idioma (PT-BR Nativo) e Tema Visual:** Disponibilizar seletor de idioma (Português do Brasil como padrão, preparado para Inglês/Espanhol) e seletor de tema (`Claro`, `Escuro` e `Automático do Sistema`). | S | R1 |
| **RF-96** | **Persistência de Preferências:** Salvar idioma e tema no `localStorage` para convidados e sincronizar no perfil do usuário quando autenticado. | S | R2 |

---

## 5. Regras Matemáticas, Estatísticas e de Previsão

Todas as fórmulas residem no pacote `domain` como funções puras, determinísticas e sem arredondamento nas etapas intermediárias (a camada de UI formata: pontos inteiros ou `½`, médias com 1 casa decimal e ritmo com 2 casas decimais).

### 5.1 Estatísticas da Rodada de Votação

1. **Votos Elegíveis:** Apenas cartas numéricas da escala Fibonacci entram nos cálculos estatísticos. Cartas `?`, `Coringa` e participantes em `AFK` são contabilizados separadamente em `specialCounts`.
2. **Média, Mediana e Moda:**
   - **Média (`mean`):** Soma dos valores numéricos dividida pela quantidade de votos numéricos.
   - **Mediana (`median`):** Valor central dos votos numéricos ordenados (ou média aritmética dos dois valores centrais quando a quantidade for par).
   - **Moda (`modes`):** Lista ordenada dos valores de maior frequência (vazia se todos os valores tiverem frequência 1).
3. **Consenso e Quase-Consenso:**
   - `consensus = true` quando há $\ge 2$ votos numéricos e todos são estritamente iguais ($\min = \max$).
   - `nearConsensus = true` quando `consensus = false`, há $\ge 2$ votos numéricos e a distância posicional na sequência Fibonacci entre o menor e o maior voto é de no máximo $1$ posição (ex.: todos os votos estão entre `5` e `8`).
4. **Divergência de Naipe:**
   - Convertendo os naipes para escala ordinal ($\text{Ouros } ♦ = 1$, $\text{Espadas } ♠ = 2$, $\text{Copas } ♥ = 3$, $\text{Paus } ♣ = 4$) e ignorando `Coringa`, sinaliza-se `suitDivergence = true` quando $(\max_{\text{naipe}} - \min_{\text{naipe}}) \ge 2$.

### 5.2 Cálculo de Capacity da Sprint

1. **Dias Úteis (`workingDays`):** Quantidade de dias de segunda a sexta-feira entre `startDate` e `endDate` (inclusive), subtraindo os feriados cadastrados pelo time (`Holidays`) que caem em dias de semana.
2. **Capacity Individual (`personCapacity`):**
   $$\text{availableDays}_i = \max(0, \text{workingDays} - \text{absenceDays}_i)$$
   $$\text{capacity}_i = \text{availableDays}_i \times \left(\frac{\text{focusPct}_i}{100}\right)$$
3. **Capacity Total da Sprint (`capacityTotal`):**
   $$\text{capacityTotal} = \sum_{i=1}^{M} \text{capacity}_i \quad \text{(em pessoa-dias)}$$

### 5.3 Velocity, Ritmo e Previsão da Próxima Sprint

1. **Velocity (`deliveredPoints`):** Soma das estimativas finais dos itens marcados como `Done` até o fechamento da sprint. Itens não concluídos somam `0`.
2. **Ritmo Normalizado (`pace`):** Calculado para cada sprint encerrada com $\text{capacityTotal} > 0$:
   $$\text{pace}_s = \frac{\text{deliveredPoints}_s}{\text{capacityTotal}_s}$$
3. **Janela Histórica e Regra de Dados Mínimos:**
   - Consideram-se as últimas $N$ sprints encerradas elegíveis ($\text{capacityTotal} > 0$), onde $3 \le N \le 6$.
   - Se o time possuir menos de $3$ sprints encerradas elegíveis, o motor retorna `{ status: 'insufficient_data', have: closed.length, need: 3 }`.
4. **Previsão Central (`predicted`) e Faixa (`low` – `high`):**
   - $\text{medianPace} = \text{mediana}(\text{pace}_1, \dots, \text{pace}_N)$
   - $\text{predicted} = \text{plannedCapacity} \times \text{medianPace}$
   - **Faixa de variação:**
     - Quando $N = 6$: utiliza os **percentis 25 (P25) e 75 (P75)** dos ritmos por interpolação linear: $\text{low} = \text{plannedCapacity} \times P_{25}$ e $\text{high} = \text{plannedCapacity} \times P_{75}$.
     - Quando $3 \le N < 6$: utiliza o **mínimo e o máximo** observados: $\text{low} = \text{plannedCapacity} \times \min(\text{pace})$ e $\text{high} = \text{plannedCapacity} \times \max(\text{pace})$.
5. **Ajuste de Observabilidade por Risco (Naipe):**
   - Caso a sprint planejada concentre uma proporção elevada de itens estimados com naipe **♣ Paus (Risco Alto)** acima da média histórica do time, a interface exibe um alerta preventivo recomendando operar próximo ao limite conservador (`low`) da faixa prevista.
   - A interface sempre acompanha o número preditivo com o aviso de que se trata de uma **estimativa estatística orientativa, e não um compromisso fechado**.
6. **Acurácia da Previsão (`errorPct`):**
   $$\text{errorPct} = \left(\frac{\text{deliveredPoints} - \text{predicted}}{\text{predicted}}\right) \times 100$$

---

## 6. Invariantes de Domínio (INV)

Toda invariante abaixo deve ser garantida pelo pacote `domain` e coberta por testes unitários automatizados:

- **INV-01 (Capacidade da Sala):** Uma sala aceita no máximo 30 participantes (Votantes + Observadores). A 31ª tentativa falha com `ROOM_FULL`. Reconexões da mesma sessão e abas em modo Telão (`screen`) não consomem vaga.
- **INV-02 (Unicidade de Host):** Toda sala aberta possui exatamente um Host ativo.
- **INV-03 (Elegibilidade de Voto):** Cada participante possui no máximo um voto por rodada, e apenas participantes no modo `Votante` e que não estejam em `AFK` podem registrar voto ativo.
- **INV-04 (Janela de Votação):** Votos só podem ser criados, alterados ou retirados enquanto `Round.status === 'voting'`.
- **INV-05 (Irreversibilidade da Revelação):** Revelar uma rodada (`voting` → `revealed`) é irreversível. Para votar novamente, abre-se a rodada `n + 1` preservando o resumo agregado das rodadas anteriores.
- **INV-06 (Validade das Cartas):** O valor do voto deve pertencer ao subconjunto Fibonacci ativo da sala ou às cartas especiais (`?`, `Coringa`, `AFK`), e o naipe deve pertencer a `{♣, ♥, ♠, ♦, Coringa}`.
- **INV-07 (Fechamento de Estimativa):** Apenas o Host ou um Facilitador delegado pode definir a estimativa final do item, que deve ser um valor numérico válido da escala Fibonacci ativa.
- **INV-08 (Foco da Mesa):** Existe no máximo um item com status `current` por sala e no máximo uma rodada com status `voting` por item.
- **INV-09 (Auditoria de Alteração):** Alterar uma estimativa final já consolidada exige geração obrigatória de registro `EstimateAudit`.
- **INV-10 (Imutabilidade de Sprint Encerrada):** Uma sprint com status `closed` tem suas métricas congeladas e rejeita qualquer alteração de itens, datas ou capacity.
- **INV-11 (Alocação Única de Item em Sprint Ativa):** Um item pode estar vinculado a no máximo uma sprint não encerrada (`planned` ou `active`) por vez.
- **INV-12 (Regra de Pontos Entregues):** Pontos entregues na sprint correspondem exatamente à soma das estimativas finais dos itens marcados como `Done` até o encerramento; itens não concluídos valem zero e retornam ao backlog marcados como `carriedOver = true`.
- **INV-13 (Efemeridade e Privacidade):** Salas de convidados nunca gravam histórico permanente e expiram 60 minutos após ficarem sem participantes conectados; salas de time gravam exclusivamente estatísticas agregadas por rodada.
- **INV-14 (Identificação na Sala):** O apelido do participante deve ter entre 1 e 30 caracteres visíveis (sem caracteres de controle) e ser único dentro da sala (*case-insensitive*, erro `NICKNAME_TAKEN`).

---

## 7. Requisitos Não Funcionais (RNF)

| ID | Categoria | Requisito e Meta |
| :--- | :--- | :--- |
| **RNF-01** | **Desempenho (Tempo Real)** | Propagação de eventos de voto, presença e revelação para todos os participantes conectados em **$\le 1\text{ s}$ no p95** em condições normais de rede. |
| **RNF-02** | **Desempenho (Web Vitals)** | Carregamento inicial (*Largest Contentful Paint* — LCP) **$< 2,5\text{ s}$** em perfil 4G / dispositivo móvel intermediário. Orçamento de pacote JS inicial da rota da sala **$\le 150\text{ KB}$ (gzip)**. |
| **RNF-03** | **Capacidade** | Suportar salas com até **30 participantes simultâneos** e múltiplas salas concorrentes operando dentro das cotas gratuitas dos provedores. |
| **RNF-04** | **Disponibilidade** | Meta de **99% de disponibilidade** durante a fase de validação, tratando eventuais *cold starts* do plano gratuito com feedback visual claro (*"Reconectando / Acordando servidor..."*). |
| **RNF-05** | **Resiliência e Idempotência** | Quedas momentâneas de rede não perdem o voto do usuário: toda mutação carrega `clientOpId` (ULID) para deduplicação no servidor e fila local de reenvio + reconciliação por `Room.version` ao reconectar. |
| **RNF-06** | **Mobile First** | Interface desenhada a partir de *viewport* de **360 px de largura** sem rolagem horizontal, com alvos de toque mínimos de **44×44 px**. |
| **RNF-07** | **Responsividade Multi-tela** | Adaptação fluida para smartphones, tablets, desktops e projetores Full HD (1920×1080 no modo Telão). |
| **RNF-08** | **Acessibilidade (WCAG 2.2 AA)** | Conformidade integral com **WCAG 2.2 nível AA**: contraste mínimo validado nos temas claro e escuro, `:focus-visible` nítido, operação 100% via teclado e compatibilidade com leitores de tela (NVDA, VoiceOver, TalkBack). |
| **RNF-09** | **Semântica Visual e Assistiva** | Nenhuma informação transmitida apenas por cor ou símbolo: cartas e naipes apresentam valor e significado em texto acessível (ex.: `aria-label="5 pontos, Paus: Risco Alto"`). Eventos de mesa anunciados via `aria-live="polite"`. Respeito a `prefers-reduced-motion` e `prefers-color-scheme`. Gráficos SVG sempre acompanhados de tabela HTML acessível equivalente. |
| **RNF-10** | **Verificação de Acessibilidade** | Execução automatizada do `@axe-core/playwright` em todas as telas no pipeline de CI, somada a roteiro manual de leitor de tela a cada release. |
| **RNF-11** | **Internacionalização (i18n)** | Proibição de strings fixas (*hardcoded*) em componentes, atributos de acessibilidade ou mensagens de erro. Formatação de datas, números e moedas via API nativa `Intl`. |
| **RNF-12** | **Segurança de Aplicação** | Tráfego 100% HTTPS; códigos de sala gerados via CSPRNG; validação de schema em todos os endpoints; proteção contra XSS (escape automático do React e proibição de injeção de HTML cru); verificação de `Origin` e proteção contra *CSV Formula Injection*. |
| **RNF-13** | **Segurança de Dados e Rede** | Autorização validada exclusivamente no servidor via política `can(...)`; **valores de votos ocultos jamais trafegam pelo canal de tempo real ou respostas HTTP antes da revelação**; sessões de convidado em cookie `httpOnly`, `Secure`, `SameSite=Lax` com apenas o hash SHA-256 salvo no banco; *Rate Limiting* por IP e por participante. |
| **RNF-14** | **Privacidade e LGPD** | Coleta mínima de dados (apelido na sessão e e-mail/nome apenas para contas autenticadas); votos individuais nunca são persistidos no histórico; página de termos/privacidade clara e fluxo completo de exclusão de conta. |
| **RNF-15** | **Expurgo de Salas Efêmeras** | Rotina automatizada e idempotente (`PurgeExpiredRooms`) que apaga em cascata salas anônimas inativas há mais de 60 minutos, sem registrar apelidos ou conteúdos nos logs. |
| **RNF-16** | **Arquitetura Limpa (Hexagonal)** | Separação estrita em `domain` $\leftarrow$ `application` $\leftarrow$ `adapters` $\leftarrow$ `apps/web`. O pacote `domain` possui **zero dependências de runtime** e não importa banco, rede, framework de UI, `Date.now()` ou `Math.random()`. |
| **RNF-17** | **Portabilidade de Infraestrutura** | Toda dependência externa (Persistência, Realtime, Auth, IssueTracker, Exporter, Clock, IdGenerator, RateLimiter) é isolada por uma Porta em `application` com suíte de testes de contrato em `packages/testing`. |
| **RNF-18** | **Qualidade e Manutenibilidade** | TypeScript estrito, cobertura de testes $\ge 90\%$ em `domain` e `application`, testes baseados em propriedades para cálculos estatísticos e testes de fronteira arquitetural no CI (`npm run verify`). |
| **RNF-19** | **Observabilidade Operacional** | Logs estruturados em JSON (`requestId`, `roomId`, `useCase`, `errorCode`, latência) e métricas agregadas de saúde sem vazamento de dados pessoais (PII) ou votos. |
| **RNF-20** | **Custo Zero no MVP** | Operação integral dentro dos limites dos planos gratuitos (*Free Tiers*) no MVP, com documentação de limites (`docs/limits.md`) e alertas de consumo a 80% da cota. |
| **RNF-21** | **Compatibilidade de Navegadores** | Suporte oficial às duas últimas versões estáveis de Chrome, Edge, Firefox e Safari (desktop e mobile). |
| **RNF-22** | **PWA (Progressive Web App)** | Manifesto web e Service Worker para instalação na tela inicial e cache de ativos estáticos (sem cachear respostas de `/api`). |
| **RNF-23** | **Integridade e Concorrência de Dados** | Migrações SQL versionadas; serialização de mutações na mesma sala via lock transacional (`SELECT ... FOR UPDATE`) com incremento de `Room.version`; datas persistidas sempre em UTC (`timestamptz`) e rotina periódica de backup/exportação. |
| **RNF-24** | **Padronização de Pacotes** | Uso exclusivo de **npm** com **npm workspaces** (`package-lock.json` único na raiz) e versão do Node.js LTS travada via `.nvmrc` e `engines`. |
| **RNF-25** | **Governança Open Source** | Licença permissiva, checagem automatizada de licenças de terceiros no CI e DCO/CLA configurado para contribuições externas. |
| **RNF-26** | **Proteção de Credenciais de Integração** | Tokens de acesso ao ClickUp e Jira criptografados em repouso no servidor (AES-256-GCM), nunca enviados ao navegador e restritos ao escopo mínimo necessário. |

---

## 8. Arquitetura Técnica e Estrutura do Monorepo

### 8.1 Regra de Dependência (Ports & Adapters)

```
packages/domain  ←  packages/application  ←  packages/adapter-*  ←  apps/web (Composition Root)
```

1. **`packages/domain`:** Entidades, agregados (`Room`, `Participant`, `Item`, `Round`, `Vote`, `Sprint`), *Value Objects* (`Scale`, `Card`, `Suit`), política de autorização (`can`), motores matemáticos (estatística da rodada, capacity, previsão) e *Builders* (`RoomBuilder`, `RoomSettingsBuilder`, `SprintBuilder`, `ForecastReportBuilder`). Zero dependências externas.
2. **`packages/application`:** Casos de uso transacionais, projetor de visão seguro (`projectRoomForViewer`) e interfaces das **Portas** (`Persistence`, `RealtimePublisher`, `RealtimeClient`, `AuthProvider`, `IssueTracker`, `Exporter`, `RateLimiter`, `Clock`, `IdGenerator`).
3. **`packages/testing`:** Implementações *In-Memory* / *Fakes* (`InMemoryPersistence`, `FakeRealtime`, `FakeClock`, `SequentialIdGenerator`) e suítes de testes de contrato (`describePersistenceContract`, etc.) que validam tanto os fakes quanto os adapters reais.
4. **`packages/adapter-*`:** Implementações concretas das portas (Postgres via Supabase/Neon, Realtime via WebSocket + fallback de polling HTTP a cada 2–3s, Auth via Magic Link/Google, IssueTracker Manual/CSV, ClickUp e Jira, Exporter CSV/JSON). Um adapter nunca importa outro adapter.
5. **`apps/web`:** Aplicação React + TanStack (Router & Query) + Vite + endpoints de servidor da API e o *Composition Root*, único ponto que instancia e injeta os adapters concretos.

### 8.2 Segurança do Protocolo de Tempo Real

- **Não-vazamento de votos:** O evento `vote.changed` publicado no canal de tempo real informa apenas `{ participantId, hasVoted: true | false }`. Os valores das cartas e naipes saem do servidor **exclusivamente** no snapshot projetado após `Round.status === 'revealed'`.
- **Sincronização Versionada:** Cada mutação na sala incrementa `Room.version`. Os clientes aplicam eventos sequenciais (`version === local + 1`) ou buscam o snapshot completo em `GET /api/rooms/:code/state?since=v` caso detectem lacuna de versão ou operem em modo fallback de polling.

---

## 9. Roadmap de Entrega Incremental (Releases do MVP)

O escopo completo do MVP está organizado em **5 fases sequenciais (R0 a R4)** para garantir entregas rápidas, testáveis e sem risco de *big-bang*:

| Fase | Nome | Escopo Principal | Critério de Saída (Gate) |
| :--- | :--- | :--- | :--- |
| **R0** | **Fundação Arquitetural** | Monorepo `npm workspaces`, configuração TypeScript estrita, regras de fronteira no lint, primitivos `Result`/`AppError`, pacote `testing` (fakes e contratos), esqueleto React + TanStack + Vite (mobile-first, tema claro/escuro, i18n `pt-BR`, PWA base) e pipeline `npm run verify`. | `npm run verify` verde, testes de fronteira arquitetural ativos e layout base validado no axe em 360px e 1280px. |
| **R1** | **Paridade PlanITPoker + Naipes** | Salas efêmeras, entrada por link/código/QR Code, votação Fibonacci + Naipe opcional (`♣ ♥ ♠ ♦` e `Coringa`), cartas `?` e `AFK`, modo Observador, estatísticas da rodada com divergência de naipe, fila de itens com importação Texto/CSV, resumo exportável, modo Telão, reconexão resiliente e expurgo em 1 hora. | Teste de carga com 30 participantes (p95 $\le 1\text{s}$), auditoria WCAG 2.2 AA aprovada e **uso real em pelo menos 1 sessão de planning do time**. |
| **R2** | **Contas, Times e Histórico Agregado** | Login por Magic Link e Google, gestão de times, convites e papéis (`can`), reivindicação de sala efêmera, salas de time persistentes, gravação de histórico estritamente agregado, busca e exportação de histórico (CSV/JSON), painel SuperAdmin e exclusão de conta (LGPD). | Suíte de testes de autorização ponta a ponta (matriz completa de rotas $\times$ papéis) passando e sessão real do time autenticado. |
| **R3** | **Gestão de Sprints e Observabilidade** | Ciclo de vida de sprints (`planned`/`active`/`closed`), calendário de feriados, cálculo de capacity por membro, vínculo de itens, registro de entrega e *carry-over*, etiquetas `A/K/Q/J`, comentários efêmeros no voto, gráficos SVG acessíveis de Velocity e Capacity e painel de observabilidade de estimativas (consenso, divergência e risco $\times$ estouro). | Pelo menos 1 sprint real configurada e encerrada na ferramenta com métricas congeladas e validadas. |
| **R4** | **Previsão Estatística e Integrações** | Motor de previsão de pontos por mediana do ritmo e faixa por percentis (P25–P75), acompanhamento de acurácia (`errorPct`), trava de dados insuficientes ($< 3$ sprints), filtros/exportação do dashboard e adapters de leitura para **ClickUp** e **Jira**. | Fechamento do MVP completo: 3 sprints encerradas no dashboard, previsão ativa e importação direta do ClickUp validada pelo time. |
| **Pós-MVP** | **Expansão Corporativa** | Escrita da estimativa de volta no ClickUp/Jira (sincronização bidirecional), novos adapters (Azure DevOps, GitHub, Linear, Trello), SSO corporativo (Microsoft Entra ID / SAML), simulação de Monte Carlo para previsão de datas e gestão multi-organização na UI. | Adoção autônoma por múltiplos times da organização. |

---

## 10. Limites Operacionais e Parâmetros de Configuração Padrão

Estes parâmetros são definidos como constantes configuráveis no domínio e na aplicação:

| Parâmetro | Valor Padrão | Descrição |
| :--- | :--- | :--- |
| `MAX_PARTICIPANTS` | `30` | Limite máximo de participantes (Votantes + Observadores) por sala. |
| `ANON_ROOM_TTL_MINUTES` | `60` (1 hora) | Tempo de inatividade (zero conexões ativas) para exclusão definitiva de sala efêmera. |
| `ONLINE_WINDOW_SECONDS` | `45` | Janela desde o último *heartbeat*/evento para considerar um participante `online`. |
| `HEARTBEAT_INTERVAL_SECONDS` | `20` | Intervalo de envio de *heartbeat* pelo cliente quando em modo fallback de polling. |
| `HOST_GRACE_SECONDS` | `60` | Tempo de desconexão do Host antes da transferência automática de liderança na sala. |
| `MAX_ITEMS_PER_ROOM` | `500` | Limite de itens na fila de uma sala e limite de linhas por importação CSV/Texto. |
| `MAX_ITEM_TITLE_LENGTH` | `200` caracteres | Comprimento máximo do título de um item. |
| `MAX_ITEM_DESC_LENGTH` | `2000` caracteres | Comprimento máximo da descrição de um item. |
| `MAX_VOTE_COMMENT_LENGTH` | `140` caracteres | Comprimento máximo do comentário efêmero junto ao voto (R3). |
| `MIN_SPRINTS_FOR_FORECAST` | `3` sprints | Quantidade mínima de sprints encerradas válidas para liberar a previsão estatística. |
| `MAX_SPRINTS_FOR_FORECAST` | `6` sprints | Janela móvel máxima de sprints recentes consideradas no cálculo de ritmo mediano. |
| `RATE_LIMIT_CREATE_ROOM` | `10 / hora / IP` | Limite de criação de salas por endereço IP. |
| `RATE_LIMIT_JOIN_ATTEMPTS` | `20 / min / IP` | Limite de tentativas de entrada por código de sala por endereço IP. |
| `RATE_LIMIT_MUTATIONS` | `60 / min / participante` | Limite de ações de votação/alteração por participante. |
| `BUNDLE_BUDGET_ROOM_GZIP` | `150 KB` | Orçamento máximo de JavaScript inicial (gzip) para a rota da mesa de votação. |

---

## UX / Juice addendum

### Avaliação de Maturidade de UX e Feedback Interativo (Score 1–10)

- **SCORE_BEFORE:** `5/10` — O documento original estabelece metas sólidas de acessibilidade (WCAG 2.2 AA, `aria-live`, `prefers-reduced-motion`, semântica não dependente apenas de cor) e responsividade (*mobile-first* 360px, alvos de 44×44px, Modo Telão), mas carece de especificações concretas de *micro-interações de ação/reação (Juice)*, tempos de transição, estados intermediários de feedback tátil/visual e coreografia de revelação na mesa de Planning Poker e nos gráficos de sprint.
- **SCORE_AFTER:** `9/10` — Com a adição deste adendo, todas as ações críticas da sessão de estimativa e do dashboard de sprints possuem pares explícitos de **Ação → Reação imediata (< 100 ms) → Estado consolidado**, com degradação graciosa obrigatória sob `prefers-reduced-motion: reduce` e conformidade estrita com WCAG 2.2 AA.

### Diretrizes Gerais de Micro-interações, Acessibilidade e Movimento

1. **Orçamento de Tempo e Curvas:**
   - Feedback de toque/clique imediato: `80 ms – 120 ms` (`ease-out`).
   - Transições de estado de componentes (seleção de carta, alternância de naipe, gavetas): `150 ms – 220 ms` (`cubic-bezier(0.22, 1, 0.36, 1)`).
   - Coreografia de revelação da mesa: até `450 ms` no total (com *stagger* máximo de `25 ms` por assento, limitado ao teto global de `450 ms` mesmo com 30 participantes).
2. **Respeito Estrito a `prefers-reduced-motion: reduce` (RNF-09):**
   - Todas as animações espaciais (giro 3D de carta, elevação vertical `translateY`, *spring*, pulso de escala e *stagger* de barras/linhas) são **substituídas por transições instantâneas ou de opacidade pura (`opacity` em `≤ 120 ms`)**.
   - Nenhum feedback semântico depende exclusivamente do movimento: todo estado alterado exibe mudança simultânea de borda, ícone, rótulo textual e atributo ARIA.
3. **Conformidade WCAG 2.2 AA e Foco Visível (RNF-06, RNF-08, RNF-09):**
   - Alvos de toque mínimos de `44×44 px` com espaçamento seguro mínimo de `8 px` entre cartas do baralho e botões de naipe.
   - Anel de foco (`:focus-visible`) de alto contraste (`outline: 3px solid`, `outline-offset: 2px`) sempre preservado durante e após animações.
   - Anúncios em leitores de tela utilizam regiões `aria-live="polite"` (ou `assertive` apenas no esgotamento do timer e queda crítica de conexão) com *debounce* para evitar verbosidade excessiva.

### Matriz de Ação / Reação (Micro-interações Obrigatórias)

| Contexto / Elemento | Ação do Usuário ou Evento do Sistema | Reação Visual e Tátil (`no-preference`) | Alternativa `prefers-reduced-motion: reduce` | Semântica Assistiva e WCAG 2.2 AA |
| :--- | :--- | :--- | :--- | :--- |
| **1. Seleção de Carta (`Card Selection`)** | Votante foca, passa o cursor ou toca/clica em uma carta Fibonacci ou especial (`?`, `Coringa`, `AFK`). | **Hover/Focus:** elevação suave (`translateY(-4px)`) e sombra sutil em `120 ms`. **Seleção ativa:** elevação firme (`translateY(-10px) scale(1.04)`), borda de destaque de `2px`, selo visual de confirmação ("Selecionada") no topo da carta e confirmação otimista com pulso único no assento do próprio usuário na mesa. Ao trocar ou retirar o voto (RF-41), a carta anterior retorna suavemente à mão (`150 ms`). | Sem deslocamento vertical (`translateY(0)`) nem `scale`. A seleção aplica imediatamente borda espessa (`3px`), mudança de cor de fundo de alto contraste e ícone de *check* visível no canto da carta. | Botão com `aria-pressed="true/false"` e rótulo completo (`aria-label="Carta 5 pontos, selecionada"`). Na mesa, o assento do participante muda para o estado textual `"Votou"` sem revelar o valor (RF-40, RF-42). |
| **2. Alternância de Naipe (`Suit Toggle`)** | Votante seleciona ou alterna o naipe (`♣ Paus`, `♥ Copas`, `♠ Espadas`, `♦ Ouros`) ou mantém `Coringa` (RF-51, RF-52). | Ao tocar em um naipe na barra rápida (1 toque), o selo do naipe na carta selecionada executa um *pop* elástico (`scale(0.85 → 1.08 → 1.0)` em `160 ms`), atualizando a insígnia no canto da carta e exibindo *pill* textual imediato com o significado configurado (ex.: `"♣ Paus · Risco Alto"`). Tocar novamente no mesmo naipe reverte para `Coringa` (neutro) com transição suave de opacidade. | Troca instantânea do ícone e do rótulo textual do naipe na carta e no seletor, com destaque de borda sólida no botão do naipe ativo. | Grupo `role="radiogroup"` (ou botões com `aria-pressed`) sempre acompanhado de texto visível além do símbolo/cor (`♣ Alto`, `♥ Médio`, `♠ Baixo`, `♦ Insignificante`, `Coringa Neutro`), garantindo independência cromática. |
| **3. Revelação de Cartas (`Card Reveal`)** | Host/Facilitador aciona "Revelar cartas" ou o último votante ativo registra voto com auto-revelação ativa (RF-43). | As cartas viradas na mesa executam rotação 3D no eixo Y (`rotateY(0deg → 180deg)` em `320 ms`, com *stagger* de até `20 ms` por participante, limitado a `450 ms` totais) revelando simultaneamente valor Fibonacci e insígnia de naipe. O painel de estatísticas (média, mediana, moda, mín/máx) entra com *fade-in* sincronizado ao final da virada. | Substitui o giro 3D por *cross-fade* rápido (`120 ms`) direto do verso para a face revelada de todas as cartas simultaneamente, exibindo o painel de estatísticas sem atraso. | Anúncio único consolidado em `aria-live="polite"`: ex. *"Cartas reveladas. Mediana 5, Média 5,4. Consenso atingido"* ou *"Divergência de naipe detectada"*, transferindo ou mantendo o foco de forma previsível. |
| **4. Destaques de Consenso e Divergência de Naipe (`Consensus / Suit-Divergence Highlights`)** | Rodada revelada atinge `consensus`, `nearConsensus` (RF-44) ou `suitDivergence >= 2` níveis (RF-54), ou contém carta `?` (RF-47). | **Consenso numérico:** brilho de borda sincronizado (*pulse* único de `400 ms`) nas cartas da mesa e *badge* celebratório discreto (`"Consenso!"` / `"Quase-consenso"`). **Divergência de naipe ($\ge 2$ níveis) ou extremos:** destaque visual com moldura de atenção nos votos extremos (menor/maior número e menor/maior naipe, ex.: `♣ Alto` vs. `♠ Baixo`) e *banner* analítico acionável sugerindo debate antes de fechar a estimativa (RF-46). Cartas `?` recebem *badge* de "Dúvida" destacado. | Exibição estática imediata dos *badges* de `"Consenso"`, `"Quase-consenso"` ou alerta `"Divergência de Naipe"` com ícones distintos (troféu, aproximação, alerta triangular) e bordas diferenciadas (sólida vs. tracejada) nos votos extremos, sem pulsação. | Todos os destaques possuem rótulos textuais explícitos ao lado dos cartões dos participantes (`"Menor voto"`, `"Maior voto"`, `"Risco Alto ♣"`, `"Dúvida ?"`), nunca dependendo apenas de cor verde/amarela/vermelha. |
| **5. Alertas de Cronômetro (`Timer Alerts`)** | Cronômetro sincronizado da rodada (`serverTime`, RF-49) atinge os últimos 10 segundos e quando chega a `00:00`. | Barra de progresso contínua fluida; ao entrar nos últimos `10 s`, o mostrador assume cor de atenção com pulsação sutil a cada segundo; ao atingir `00:00`, executa um *shake* horizontal curto (`±3px` por `240 ms`), muda para o estado visual `"Tempo esgotado"` e emite sinal sonoro curto e discreto (com botão de *mute* persistente na barra da sala). O timer zerado **não bloqueia votos nem força revelação** (RF-49). | Atualização numérica segundo a segundo sem *shake* nem pulsação de escala; mudança direta de ícone (ampulheta → sino de alerta) e destaque de borda nos `10 s` finais e em `00:00`. | Anúncio via `aria-live` apenas nos marcos críticos (`"30 segundos restantes"`, `"10 segundos restantes"` e `"Tempo da rodada esgotado"`), evitando anunciar cada segundo individualmente para não poluir o leitor de tela. |
| **6. Indicador de Reconexão e Sincronização (`Reconnection Indicator`)** | Oscilação de rede, *cold start* do servidor (RNF-04), reenvio de mutação idempotente (`clientOpId`, RNF-05) ou queda para fallback de polling HTTP. | *Pill* de status não bloqueante no cabeçalho da sala: **Conectado** (indicador discreto estável), **Sincronizando voto...** (ícone de rotação suave quando há operação na fila local), **Reconectando / Acordando servidor...** (barra indeterminada suave após `1,5 s` de desconexão, preservando a carta selecionada na tela com selo `"Salvo localmente — aguardando rede"`). Ao reconectar e reconciliar `Room.version`, exibe confirmação `"Conectado e sincronizado"` por `2 s` antes de recolher. | Mesmo *pill* textual e ícones de status estáticos (ponto sólido, relógio, ícone de alerta de rede, ícone de *check*), sem *spinners* rotativos contínuos nem barras animadas. | Região `role="status"` (`aria-live="polite"`) que informa mudanças de conectividade (*"Conexão instável, seu voto está salvo localmente"* e *"Conexão restabelecida"*), mantendo todos os controles navegáveis sem perda de foco. |
| **7. Gráficos e Indicadores do Dashboard de Sprints (`Sprint Dashboard Charts`)** | Visualização e filtragem dos gráficos de Velocity (RF-80), Capacity/Ritmo (RF-81), Previsão com faixa P25–P75 (RF-82), Acurácia (RF-84) e Matriz Naipe × Estouro (RF-83). | Entrada das barras e linhas SVG com transição suave (`220 ms`) ao alternar filtros (RF-86); *hover* ou foco via teclado (`Tab` entre pontos de dados) destaca a sprint correspondente com linha-guia vertical, eleva a opacidade da série focada e abre *tooltip* rico posicionado sem corte de *viewport* (mostrando Comprometido, Entregue, `addedAfterStart`, Capacity, Ritmo e faixa prevista `low`–`predicted`–`high`). Quando há `< 3` sprints encerradas (RF-85), exibe estado vazio informativo com indicador visual de progresso (`"1 de 3 sprints concluídas para liberar previsão"`). | Renderização imediata dos gráficos SVG sem animação de crescimento de barras/linhas; destaque instantâneo de alto contraste no ponto ou barra focada/selecionada. | Todo gráfico SVG possui `role="region"` com `aria-label` descritivo, pontos de dados navegáveis via teclado, padrões de preenchimento/hachura ou marcadores distintos além da cor (para diferenciar Comprometido, Entregue e Adicionado após início) e **tabela HTML acessível equivalente** (RNF-09) sincronizada com os mesmos filtros. |

