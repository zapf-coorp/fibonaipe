# Plano de conclusão

Executar cada tarefa com testes de comportamento antes da implementação, corrigir as falhas e verificar os critérios da spec. Não marcar concluída sem evidência atual. Preservar a arquitetura e os invariantes de AGENTS.md.

1. **Fundação e diagnóstico:** executar a gate, corrigir falhas existentes e conferir a tarefa `monorepo-foundation`, ainda aberta no checklist. Registrar limitações de serviços externos.
2. **Concluir R2:** confrontar `auth-teams-and-claiming` e `aggregated-history-and-audit` com o backlog; entregar autenticação real, rotas e telas adiadas, privacidade e testes de ponta a ponta previstos nas specs.
3. **Domínio e aplicação de sprints:** implementar `domain-and-app-sprints`, incluindo persistência, transações, feriados, capacidade, vínculo de itens e fechamento imutável. Verificar contratos e concorrência.
4. **Interface e observabilidade:** implementar `sprint-and-observability-ui`, comentários efêmeros, indicadores, gráficos e tabelas acessíveis.
5. **Previsão:** implementar `forecasting-and-accuracy`, com fórmulas, histórico de precisão, dashboard e exportações.
6. **Integrações:** implementar `adapters-clickup-and-jira`, credenciais criptografadas e prévia de importação.
7. **Aceite final:** percorrer fluxos reais, verificar acessibilidade, privacidade e integração, executar `npm run verify` e atualizar checklist e backlog com evidências e eventuais dependências externas.

As tarefas 4 e 5 dependem da 3; a 6 depende da infraestrutura e da autenticação de R2. A ordem pode ser ajustada quando a verificação identificar uma dependência adicional.
