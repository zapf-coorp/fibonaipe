# Fibonaipe: requisitos do Planning Poker com gestão de sprint e previsão

*Versão 0.2 · 26/10/2026 · Documento vivo. Legenda: ✅ confirmado por você · 🟡 proposta minha para preencher a lacuna (valide) · ❓ ainda em aberto*

## 1. Visão e objetivos

O Fibonaipe é uma ferramenta web gratuita e de código aberto de Planning Poker com paridade em relação ao PlanITPoker, somada a gestão de sprints, dashboard de capacity e velocity e previsão de pontos baseada no histórico do time. Além do valor em Fibonacci, cada voto pode levar um naipe, uma segunda dimensão do esforço (por padrão, o risco). Uso inicial no seu time; depois, apresentação à empresa e ampliação.

| Objetivo | Indicador de sucesso (proposta 🟡) |
| --- | --- |
| Substituir o PlanITPoker no time, sem limites de uso | Time faz 100% das planning sessions na ferramenta por 3 sprints seguidas |
| Histórico e análise de estimativas | Toda estimativa final fica consultável e exportável |
| Dashboard de capacity e velocity | Dashboard mostra pelo menos 3 sprints encerradas |
| Previsão de pontos | Erro médio entre previsto e entregue acompanhado sprint a sprint |
| Ampliar para a empresa | Segundo time usa a ferramenta sem suporte direto seu |

## 2. Decisões tomadas e lacunas preenchidas

| # | Tema | Decisão | Status |
| --- | --- | --- | --- |
| 1 | Nome | O produto se chama **Fibonaipe**. O domínio fica para depois da fase de testes; até lá, hospedagem gratuita em subdomínio do provedor. | ✅ |
| 2 | Participação na sala | Cada pessoa entra como **Votante** ou **Observador** (só assiste). O papel (PO, PM, Dev, QA) não restringe o voto. Cartas que **não contam** no resultado: **?** (dúvida), **Coringa** (abstenção em número e naipe) e **AFK** (ausente, anula o voto). | ✅ |
| 3 | Escala | **Fibonacci**, única. Cada time usa a sequência como está habituado (quais valores e o significado de cada ponto). | ✅ |
| 4 | Naipe no voto | Voto = valor + naipe opcional. ♣ Paus = Alto · ♥ Copas = Médio · ♠ Espadas = Baixo · ♦ Ouros = Insignificante. O significado do eixo é configurável por time; padrão proposto: **risco**. As letras A, K, Q e J ficam como etiquetas do item, se forem necessárias. | 🟡 |
| 5 | Histórico | Só **resultados agregados** por rodada (média, mediana, moda, faixa e distribuição de naipes). Votos individuais nunca são gravados. | ✅ |
| 6 | Pontos parciais | Não se aplicam. Item concluído conta inteiro na sprint em que termina. | ✅ |
| 7 | Salas anônimas | Apagadas **1 hora depois que ninguém mais estiver usando**, sem rastro. O resumo exportável é a única forma de guardar o resultado. | ✅ |
| 8 | Licença | **Código aberto**, com a possibilidade de migrar para fechado no futuro (ver seção 10). | ✅ |
| 9 | Stack | Node, React com TanStack e **npm puro** (sem pnpm), usando npm workspaces. | ✅ |
| 10 | Integrações | Abordagem **Adapter**. Primeira integração real: **ClickUp** (usado hoje pelo time); depois **Jira**, ambos em leitura. Até lá, Manual/CSV. | ✅ abordagem · 🟡 ordem |
| 11 | Escopo do SuperAdmin | Dono da **instância**: vê e gerencia todos os times e usuários, suspende contas, vê métricas de uso. O modelo de dados já prevê **Organização → Times**, mas no MVP a interface expõe só Times. | 🟡 |
| 12 | Entrada do participante anônimo | **Link da sala + código curto** (6–8 caracteres) + **apelido** obrigatório, papel e modo (Votante ou Observador) escolhidos na entrada. Um token de sessão no navegador permite reconectar sem perder o voto. QR Code para sessões presenciais. | 🟡 |
| 13 | Dono da sala anônima | O criador recebe um **token de host** guardado no navegador. Se fizer login enquanto a sala está ativa, pode reivindicá-la e vinculá-la a um time. | 🟡 |
| 14 | Tempo real | **WebSocket (ou equivalente gerenciado) como padrão**, com **polling a cada 2–3 s como fallback**. A porta `Realtime` isola isso e permite trocar o provedor. | 🟡 |
| 15 | Autenticação | **Magic link por e-mail + login com Google**. E-mail e senha ficam fora do MVP. SSO corporativo (Microsoft/SAML) fica para a fase de ampliação. | 🟡 |
| 16 | Integração bidirecional | Em duas etapas: **leitura** de itens primeiro; **escrita** da estimativa final de volta depois. | 🟡 |
| 17 | "MVP tem que ter tudo" | Manter tudo no escopo do MVP, **entregue em releases incrementais** (seção 8). A primeira release já substitui o PlanITPoker. | 🟡 |

## 3. Papéis e permissões

**Papéis de sistema:** SuperAdmin. **Papéis de time:** Admin do time, PM, PO, Dev, QA, Observador. **Convidado:** pessoa sem login que entra por link de sala.

| Ação | SuperAdmin | Admin do time | PM | PO | Dev / QA | Observador | Convidado |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Gerenciar instância (todos os times) | ✔ |  |  |  |  |  |  |
| Criar/editar/excluir time e membros | ✔ | ✔ |  |  |  |  |  |
| Configurar sprints e capacity | ✔ | ✔ | ✔ |  |  |  |  |
| Criar sala de time | ✔ | ✔ | ✔ | ✔ |  |  |  |
| Ser facilitador/host da sala | ✔ | ✔ | ✔ | ✔ | opcional\* |  | só em sala própria |
| Votar (entrando como Votante) | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| Definir estimativa final | host | host | host | host |  |  | host |
| Ver dashboard e histórico do time | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ (somente leitura) | ✘ |
| Exportar dados | ✔ | ✔ | ✔ | ✔ | ✔ | ✘ | resumo da própria sala |

\* O host pode delegar o papel de facilitador a qualquer participante. Papel no time e modo na sala são coisas distintas: o papel define permissões de gestão e de leitura; o modo (Votante ou Observador) é escolhido por cada pessoa ao entrar e não depende do papel.

## 4. Requisitos funcionais

Prioridade: **M** = deve ter · **S** = deveria ter · **C** = pode ter. A coluna "Rel." indica a release sugerida (seção 8).

### 4.1 Acesso e identidade

| ID | Requisito | Prio. | Rel. |
| --- | --- | --- | --- |
| RF-01 | Entrar em sala como convidado informando apelido, papel e modo (Votante ou Observador), via link ou código | M | R1 |
| RF-02 | Reconectar automaticamente (mesmo navegador) mantendo identidade e voto da rodada | M | R1 |
| RF-03 | Login por magic link e Google | M | R2 |
| RF-04 | Fazer login durante uma sala ativa e reivindicá-la, vinculando-a a um time (salas efêmeras não deixam histórico) | S | R2 |
| RF-05 | Excluir a própria conta e os dados associados | M | R2 |

### 4.2 Times e administração

| ID | Requisito | Prio. | Rel. |
| --- | --- | --- | --- |
| RF-10 | Criar time e convidar membros por link com papel pré-definido | M | R2 |
| RF-11 | Atribuir e alterar papéis conforme a matriz da seção 3 | M | R2 |
| RF-12 | Uma pessoa pode pertencer a vários times | S | R2 |
| RF-13 | Painel do SuperAdmin: listar times e usuários, suspender, ver métricas de uso | S | R2 |
| RF-14 | Modelo de dados com Organização agrupando times (sem tela dedicada no MVP) | C | R2 |

### 4.3 Salas

| ID | Requisito | Prio. | Rel. |
| --- | --- | --- | --- |
| RF-20 | Criar sala com nome, escala e regras, com ou sem login | M | R1 |
| RF-21 | Gerar link, código curto e QR Code da sala | M | R1 |
| RF-22 | Lista de presença em tempo real (online/offline, papel, modo, AFK e quem já votou) | M | R1 |
| RF-23 | Host/facilitador com transferência de papel; a sala não fica órfã se o host sair | M | R1 |
| RF-24 | Configurações da sala: valores da escala em uso, naipe ligado ou desligado e seu significado, revelação automática, timer, exibir ou ocultar média | M | R1 |
| RF-25 | Limite de 30 participantes; ao exceder, mensagem clara de sala cheia | M | R1 |
| RF-26 | Sala de time persistente (vinculada ao time) e sala efêmera (apagada 1 hora após ficar vazia, sem rastro) | M | R2 |
| RF-27 | Modo "telão" para sessões presenciais (visão ampla para projetar, com QR Code) | S | R1 |

### 4.4 Itens a estimar

| ID | Requisito | Prio. | Rel. |
| --- | --- | --- | --- |
| RF-30 | Adicionar item manualmente (título, descrição, link externo) | M | R1 |
| RF-31 | Importar lista colando texto ou via CSV | M | R1 |
| RF-32 | Fila de itens reordenável, com item atual em destaque | M | R1 |
| RF-33 | Pular ou adiar item sem perder o que já foi votado | S | R1 |

### 4.5 Votação

| ID | Requisito | Prio. | Rel. |
| --- | --- | --- | --- |
| RF-40 | Votar escolhendo uma carta da escala Fibonacci; voto oculto para os demais até a revelação | M | R1 |
| RF-41 | Alterar ou retirar o voto antes da revelação | M | R1 |
| RF-42 | Indicador de quem já votou, sem revelar o valor | M | R1 |
| RF-43 | Revelar cartas (host) ou revelação automática quando todos os votantes votarem | M | R1 |
| RF-44 | Resultado: média, mediana, moda, mínimo, máximo, indicação de consenso e destaque dos extremos, calculados só com os votos que contam | M | R1 |
| RF-45 | Nova rodada (re-voto) preservando o resultado agregado das rodadas anteriores | M | R1 |
| RF-46 | Host define a estimativa final do item (pode divergir da média) | M | R1 |
| RF-47 | Cartas que não contam no resultado: **?** (dúvida, sinalizada para a discussão), **Coringa** (abstenção em número e naipe) e **AFK** (ausente, anula o voto) | M | R1 |
| RF-48 | Escala única: Fibonacci. Cada time define quais valores da sequência usa e como interpreta cada ponto | M | R1 |
| RF-49 | Timer opcional por rodada | S | R1 |
| RF-50 | Comentário curto opcional junto ao voto, visível após a revelação e descartado com a sala | C | R3 |
| RF-51 | Naipe opcional junto ao valor do voto; sem naipe escolhido, o voto vale só pelo número (equivale a Coringa no naipe) | M | R1 |
| RF-52 | Naipes e níveis: ♣ Paus = Alto · ♥ Copas = Médio · ♠ Espadas = Baixo · ♦ Ouros = Insignificante · Coringa = abstenção | M | R1 |
| RF-53 | Significado do naipe configurável por time (padrão: risco), com opção de desligar o eixo | S | R2 |
| RF-54 | Resultado exibe a distribuição de naipes ao lado dos pontos e destaca divergência de 2 níveis ou mais | S | R1 |
| RF-55 | Modo Observador: só assiste (presença, cartas reveladas e resultado), sem votar | M | R1 |
| RF-56 | Letras A, K, Q e J como etiquetas do item (por exemplo, tipo de trabalho), definidas pelo facilitador | C | R3 |

### 4.6 Histórico

| ID | Requisito | Prio. | Rel. |
| --- | --- | --- | --- |
| RF-60 | Registrar por item, só de forma agregada: rodadas (média, mediana, moda, faixa e distribuição de naipes), estimativa final, data, sala e sprint (salas de time/logados) | M | R2 |
| RF-61 | Nunca gravar votos individuais nem comentários: o histórico guarda apenas resultados agregados | M | R2 |
| RF-62 | Busca e filtros por período, sprint, sala, estimativa e item | S | R2 |
| RF-63 | Exportar histórico em CSV e JSON | M | R2 |
| RF-64 | Ao encerrar sala efêmera, oferecer o download do resumo da sessão antes que ela seja apagada | M | R1 |
| RF-65 | Editar estimativa final depois, com registro de quem alterou e quando | S | R2 |

### 4.7 Gestão de sprint

| ID | Requisito | Prio. | Rel. |
| --- | --- | --- | --- |
| RF-70 | Criar sprint com nome, datas de início e fim e meta | M | R3 |
| RF-71 | Registrar capacity por pessoa: dias úteis, ausências e % de foco | M | R3 |
| RF-72 | Vincular itens estimados à sprint e calcular pontos comprometidos | M | R3 |
| RF-73 | Registrar entrega: marcar itens concluídos, calcular pontos entregues (sem pontuação parcial), itens em carry-over e, opcionalmente, se o item estourou a estimativa | M | R3 |
| RF-74 | Encerrar sprint, congelando suas métricas | M | R3 |
| RF-75 | Calendário de feriados e folgas por time | S | R3 |

### 4.8 Dashboard e previsão

| ID | Requisito | Prio. | Rel. |
| --- | --- | --- | --- |
| RF-80 | Gráfico de velocity por sprint (comprometido × entregue) | M | R3 |
| RF-81 | Gráfico de capacity por sprint (pessoa-dias e capacity ajustada) | M | R3 |
| RF-82 | Previsão de pontos para a próxima sprint, com faixa (ver seção 5) | M | R4 |
| RF-83 | Indicadores de estimativa: taxa de consenso, distribuição de pontos, itens com muita divergência e comparação entre níveis de naipe (por exemplo, risco alto × baixo) | S | R3 |
| RF-84 | Acurácia da previsão: previsto × entregue ao longo das sprints | S | R4 |
| RF-85 | Aviso de "dados insuficientes" quando houver menos de 3 sprints encerradas | M | R4 |
| RF-86 | Filtros por time e por período; exportar gráficos e dados | S | R4 |

### 4.9 Integrações e extensibilidade

| ID | Requisito | Prio. | Rel. |
| --- | --- | --- | --- |
| RF-90 | Porta `IssueTracker` com implementação Manual/CSV | M | R1 |
| RF-91 | Adapter do ClickUp em modo leitura (importar itens) | S | R4 |
| RF-92 | Adapter do Jira em modo leitura, que valida o desenho da porta com uma segunda implementação | S | R4 |
| RF-93 | Escrita da estimativa final de volta na ferramenta externa | C | pós-MVP |
| RF-94 | Adapters adicionais (Azure DevOps, Trello, GitHub, Linear) sem alterar o domínio | C | pós-MVP |

### 4.10 Configurações gerais

| ID | Requisito | Prio. | Rel. |
| --- | --- | --- | --- |
| RF-95 | Seletor de idioma (PT-BR padrão) e tema claro/escuro/automático | S | R1 |
| RF-96 | Preferências persistidas no navegador e, se logado, na conta | S | R2 |

## 5. Definições para o dashboard e a predição

A previsão só funciona se todos usarem as mesmas definições. Proposta 🟡:

- **Velocity da sprint:** soma dos pontos dos itens **concluídos** (Done) dentro da sprint. Item não concluído conta zero e entra em carry-over; os pontos são contabilizados na sprint em que for concluído (regra simples, sem pontuação parcial).
- **Capacity da sprint (pessoa-dias):** soma, por pessoa, de dias úteis disponíveis × % de foco. Feriados e ausências reduzem os dias.
- **Ritmo:** velocity ÷ capacity em pessoa-dias. Normaliza sprints com times de tamanhos ou disponibilidades diferentes.
- **Previsão da próxima sprint:** capacity planejada × **mediana do ritmo das últimas N sprints encerradas** (N entre 3 e 6). A faixa apresentada vai de um limite inferior a um superior (percentis 25 e 75 do ritmo quando houver 6 ou mais sprints; mínimo e máximo quando houver menos).
- **Dados mínimos:** 3 sprints encerradas. Antes disso, o dashboard exibe os gráficos e o aviso "dados insuficientes para previsão".
- **Acurácia:** diferença percentual entre pontos previstos e entregues, registrada a cada sprint encerrada.
- **Evolução futura:** simulação de Monte Carlo para prever datas de entrega de um conjunto de itens.

Com o naipe de risco ligado, o dashboard também mostra, por nível (alto, médio, baixo), quantos itens estouraram a estimativa. Se a próxima sprint concentrar muitos itens de risco alto, a previsão exibe um aviso e uma faixa mais conservadora.

A previsão é **orientativa**: o texto da interface deve deixar claro que é uma estimativa estatística, não um compromisso.

## 6. Requisitos não funcionais

Os números são **metas iniciais 🟡** para a fase de testes e podem ser ajustados.

| ID | Categoria | Requisito |
| --- | --- | --- |
| RNF-01 | Desempenho | Propagar voto e revelação para todos os participantes em até 1 s no p95 (rede normal). |
| RNF-02 | Desempenho | Carregamento inicial (LCP) abaixo de 2,5 s em 4G e celular intermediário; pacote JS inicial enxuto. |
| RNF-03 | Capacidade | Suportar salas de até 30 participantes e várias salas simultâneas dentro dos limites do plano gratuito. |
| RNF-04 | Disponibilidade | Meta de 99% durante a fase de testes. Aceita-se "cold start" ou pausa do plano gratuito, desde que a interface informe o estado de reconexão. |
| RNF-05 | Resiliência | Perda de conexão não perde voto: reenvio e ressincronização do estado da sala ao reconectar. |
| RNF-06 | Mobile first | Layout pensado primeiro para tela de 360 px; telas maiores ampliam o layout. Alvos de toque de pelo menos 44×44 px. |
| RNF-07 | Responsividade | Funcionar em celulares, tablets, notebooks e projetor (modo telão). |
| RNF-08 | Acessibilidade | Seguir **WCAG 2.2 nível AA**: contraste, foco visível, navegação completa por teclado, rótulos ARIA, leitura por leitores de tela (iOS VoiceOver, TalkBack, NVDA). |
| RNF-09 | Acessibilidade | Informação nunca só por cor: as cartas mostram valor, naipe e estado em texto (leitor de tela: "5, risco alto"). Revelação e mudanças de presença anunciadas via `aria-live`. Respeitar `prefers-reduced-motion` e `prefers-color-scheme`. |
| RNF-10 | Acessibilidade | Testes de acessibilidade automatizados no CI (por exemplo axe) e revisão manual a cada release. |
| RNF-11 | Multi-idioma | Todo texto da interface em arquivos de tradução (sem texto fixo no código); datas, números e fusos pelo `Intl` conforme o idioma. PT-BR primeiro; a estrutura aceita novos idiomas sem alterar código. |
| RNF-12 | Segurança | HTTPS obrigatório; código de sala não previsível com limite de tentativas por IP; sanitização de textos digitados (XSS); proteção contra abuso (limites de criação de salas e de mensagens). |
| RNF-13 | Segurança | Controle de acesso no servidor por papel e por time (não confiar no cliente); tokens de sessão com expiração. |
| RNF-14 | Privacidade | Sem dados sensíveis. Coleta mínima: apelido, e-mail (só para quem faz login) e dados da sessão. Votos individuais nunca são gravados, só resultados agregados. Mesmo assim, e-mail e apelido são dados pessoais pela LGPD: política de privacidade simples, aviso de uso e exclusão de conta e dados. |
| RNF-15 | Privacidade | Salas efêmeras são apagadas 1 hora depois que a última pessoa sai, sem deixar rastro: logs não guardam apelidos nem conteúdo da sala. |
| RNF-16 | Arquitetura | Ports & Adapters, com Builders para montagem de configuração (seção 7). O domínio não depende de banco, provedor de tempo real, autenticação nem ferramenta externa. |
| RNF-17 | Portabilidade | Trocar de banco ou de provedor exige apenas um novo adapter e configuração, sem mexer em regras de negócio. |
| RNF-18 | Manutenibilidade | TypeScript estrito, testes unitários do domínio (votação, capacity, previsão) e testes de contrato para cada adapter. |
| RNF-19 | Observabilidade | Logs estruturados, rastreamento de erros e métricas básicas de uso (salas ativas, participantes), sem identificar pessoas. |
| RNF-20 | Custo | Custo zero no MVP, usando apenas planos gratuitos; alertas ao se aproximar dos limites. |
| RNF-21 | Compatibilidade | Duas últimas versões de Chrome, Edge, Firefox e Safari (desktop e mobile). |
| RNF-22 | PWA | Instalável na tela inicial e com carregamento rápido de arquivos estáticos em cache; sem uso offline completo no MVP. |
| RNF-23 | Dados | Migrações versionadas de banco; backup/exportação periódica; tudo em UTC com exibição no fuso do usuário. |
| RNF-24 | Pacotes e runtime | npm puro (sem pnpm nem yarn) com npm workspaces e package-lock.json versionado; versão do Node LTS fixada em engines e .nvmrc. |
| RNF-25 | Código aberto | Repositório público com licença permissiva (MIT ou Apache-2.0), verificação das licenças das dependências e DCO ou CLA nas contribuições externas, para preservar a opção de fechar o código no futuro. |
| RNF-26 | Segredos e integrações | Tokens do ClickUp, Jira e outras ferramentas ficam só no servidor, criptografados, nunca no navegador; permissão mínima de leitura no início. |

## 7. Arquitetura e hospedagem (proposta)

**Padrão:** Ports & Adapters (arquitetura hexagonal). O núcleo de domínio é TypeScript puro, sem dependência de framework. **Builders** montam objetos complexos e configurações (sala com regras, sprint com capacity, relatório de previsão), sem construtores com dezenas de parâmetros.

| Porta (interface) | Responsabilidade | Adapter no MVP | Adapters futuros |
| --- | --- | --- | --- |
| `Persistence` (repositórios) | Salas, itens, votos, times, sprints | Postgres (Supabase ou Neon) | SQLite, MongoDB, outro Postgres |
| `Realtime` | Presença e eventos da sala | Realtime gerenciado do provedor (WebSocket) + fallback de polling | Servidor próprio, Ably, PartyKit |
| `Auth` | Identidade e sessão | Magic link + Google | Microsoft/SAML, e-mail e senha |
| `IssueTracker` | Importar itens e (depois) escrever estimativa | Manual/CSV | ClickUp (primeiro), Jira, Azure DevOps, Trello, GitHub, Linear |
| `Exporter` | Gerar CSV/JSON/PDF | CSV e JSON | PDF, planilhas |
| `Clock` / `IdGenerator` | Tempo e identificadores | Sistema | Fakes para testes |

**Stack sugerida 🟡 (para hospedagem gratuita):**

- **Front-end:** TypeScript e React com TanStack (Router e Query, com Vite) como PWA, mobile first e i18n desde o início. Gerenciador de pacotes: npm com workspaces (sem pnpm).
- **Hospedagem estática/serverless:** Cloudflare Pages, Vercel ou Netlify (plano gratuito).
- **Back-end gerenciado:** Node (LTS) com TypeScript para a API e o domínio, e Supabase (Postgres, Auth e Realtime) ou Neon para banco, com a porta de persistência isolando a escolha.
- **Alternativa:** Cloudflare Workers com Durable Objects para salas em tempo real, reduzindo dependência de um único provedor.
- **Pontos de atenção:** planos gratuitos mudam de limites e alguns **pausam projetos inativos**. Confirme os limites vigentes antes de decidir, e mantenha a exportação periódica dos dados.
- **Princípio:** criar todas as portas desde o início, mas implementar **um adapter por porta** no MVP, para não cair em excesso de engenharia.

## 8. Fatiamento do MVP em releases

O escopo completo continua sendo o MVP, mas a ordem abaixo reduz o risco de um "MVP gigante" e entrega valor cedo.

| Release | Conteúdo | Resultado |
| --- | --- | --- |
| **R1 – Paridade** | Salas efêmeras, entrada por link/código/QR, votação completa com Fibonacci e naipe opcional, cartas especiais (?, Coringa, AFK), modo Observador, resultado, fila de itens, importação por texto/CSV, resumo exportável, modo telão, PT-BR, acessibilidade AA | Substitui o PlanITPoker no seu time |
| **R2 – Contas e histórico** | Login, times, papéis, salas de time, histórico agregado persistente, busca, exportação, exclusão de conta | Histórico confiável e controle de acesso |
| **R3 – Gestão de sprint** | Sprints, capacity, comprometido × entregue, dashboard de velocity e capacity, indicadores de estimativa e análise por naipe | Acompanhamento da evolução do time |
| **R4 – Previsão e integração** | Previsão de pontos com faixa, acurácia, aviso de dados insuficientes, adapter do ClickUp em leitura e, em seguida, o do Jira | Fecha o escopo do MVP |
| **Pós-MVP** | Escrita de volta nas ferramentas, mais adapters, SSO corporativo, Monte Carlo, multi-organização na interface | Ampliação para a empresa |

**Critério de pronto de cada release:** testes do domínio passando, acessibilidade AA verificada, uso real em pelo menos uma sessão do time e nenhum erro bloqueante aberto.

## 9. Riscos e mitigações

| # | Risco | Mitigação |
| --- | --- | --- |
| 1 | Escopo do MVP grande demais | Releases R1–R4; só avançar quando a anterior estiver em uso real |
| 2 | Previsão sem definição clara de velocity e capacity | Definições da seção 5 aprovadas antes de iniciar a R3; aviso de dados insuficientes |
| 3 | Sala anônima com histórico persistente sem regra de dono | Sala anônima apagada 1 hora após ficar vazia, token de host, resumo exportável e reivindicação ao fazer login (seção 2) |
| 4 | Tempo real instável ou limitado em plano gratuito | Porta `Realtime` isolada, fallback de polling e teste de carga com 30 participantes |
| 5 | Plano gratuito pausa ou muda limites | Monitorar limites, exportação periódica e adapters que permitam migrar |
| 6 | Acessibilidade tratada só no final | Critérios AA e testes automatizados desde a R1 |
| 7 | Excesso de engenharia nos adapters | Uma implementação por porta no MVP; só generalizar quando surgir o segundo caso real |
| 8 | Abuso de salas públicas (spam, códigos adivinhados) | Código aleatório, limite de tentativas e de criação, expiração automática |
| 9 | Dados pessoais mesmo sem dados sensíveis (LGPD) | Coleta mínima, política simples, exclusão de conta e retenção definida |
| 10 | Naipe deixa a votação lenta ou confusa | Naipe opcional, Coringa como padrão, no máximo um toque a mais, texto do nível sempre visível e eixo desligável por time |
| 11 | Migrar de código aberto para fechado no futuro | Licença permissiva, DCO ou CLA desde o início e titularidade clara do código; versões já publicadas continuam abertas |
| 12 | Vazamento de tokens de integração | Tokens só no servidor e criptografados, escopo mínimo de leitura e opção de revogar na tela do time |

## 10. Backlog vivo: decisões tomadas e pendências

### Respondidas nesta revisão

| # | Pergunta | Resposta | Onde entrou |
| --- | --- | --- | --- |
| 1 | Qual ferramenta de backlog? | ClickUp hoje; Jira já foi usado. Abordagem Adapter para manter a flexibilidade. Ordem proposta: ClickUp, depois Jira. | RF-90 a RF-94 |
| 2 | PO e PM votam por padrão? | Qualquer pessoa entra como Votante ou Observador. As cartas ?, Coringa e AFK não contam no resultado. | Seção 2, RF-47, RF-55 |
| 3 | Votos individuais no histórico? | Não: só resultados agregados. | RF-60, RF-61 |
| 4 | Pontos parciais? | Não se aplicam. | Seção 5 |
| 5 | Escala fixa ou por sala? | Fibonacci única; cada time a usa como está habituado. | RF-48 |
| 6 | Nome e domínio | Fibonaipe; domínio só depois da fase de testes. | Seção 2 |
| 7 | Código aberto ou fechado? | Aberto, com possibilidade de fechar no futuro. | RNF-25, risco 11 |
| 8 | Retenção das salas anônimas | Apagadas 1 hora depois de vazias, sem rastro. | RNF-15, RF-64 |

### Ainda em aberto

1. ❓ **Risco como significado padrão do naipe** (hoje 🟡). Confirma também que voto sem naipe vale como Coringa no naipe?
2. ❓ **Escala:** "cada time lida como está habituado" significa escolher quais valores da sequência usa (por exemplo, com ou sem 0, ½ e 21)?
3. ❓ **Licença exata:** MIT (mais simples) ou Apache-2.0 (inclui concessão de patentes)? DCO ou CLA para contribuições externas?
4. ❓ **O que é "sala sem uso":** nenhuma conexão ativa por 60 minutos? Quem está em AFK mas conectado conta como uso?
5. ❓ **ClickUp:** onde o time guarda os pontos (campo de Sprint Points, campo personalizado, nome da tarefa)? Isso define o que o adapter lê e, depois, escreve.
6. ❓ **TanStack:** SPA com Router e Query ou TanStack Start (full-stack)? Depende da hospedagem gratuita e do tempo real escolhidos.
7. ❓ **Hospedagem gratuita da fase de testes:** qual provedor para o front-end e para o tempo real (seção 7)?

### Status geral

- ✅ Objetivo, papéis, escopo, limites de sessão, arquitetura, requisitos de design (mobile first, acessibilidade, multi-idioma, gratuito) e as oito decisões da revisão 0.2.
- 🟡 Naipe como eixo de risco, ordem das integrações, itens 11 a 17 da seção 2, metas da seção 6 e definições da seção 5, aguardando sua validação.
- ❓ Itens listados em "Ainda em aberto".
