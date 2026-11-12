# Fibonaipe

Planning poker (Fibonacci + naipe de risco) com gestão de sprint, observabilidade de estimativas e previsão estatística.

Toda a documentação (PRDs, specs, roadmap) está indexada em [`docs/README.md`](docs/README.md).

## Rodar em desenvolvimento

Na raiz do repositório, use Node.js 24 e npm 10 ou superior. Instale as dependências com o primeiro comando e inicie o servidor com o segundo:

```sh
npm ci
npm run dev --workspace=@fibonaipe/web -- --strictPort
```

Abra [http://localhost:5173](http://localhost:5173). O Vite serve a interface e a API no mesmo endereço. Para testar uma sala de convidados, a configuração padrão usa SQLite em memória e dispensa credenciais externas. Mantenha o terminal aberto durante a partida. Para encerrar, pressione `Ctrl+C`. Reiniciar o servidor descarta as salas em memória. Para configurações de serviços externos, consulte [`.env.example`](.env.example).

## Testar uma sala com três usuários no mesmo computador

O navegador identifica cada participante pelo cookie `fib_session`. Abas anônimas do mesmo navegador e perfil compartilham esse cookie enquanto a sessão privada estiver aberta. Use três contextos separados:

| Participante | Onde abrir | O que fazer |
| --- | --- | --- |
| Ana (anfitriã) | Janela normal do Chrome | Abra a página inicial, selecione **Criar sala**, use o apelido Ana e copie o link de convite. Para testar a revelação manual, deixe a revelação automática desativada. |
| Bruno | Janela anônima do Chrome (`Ctrl+Shift+N` no Windows) | Cole o link de convite, informe Bruno e entre como votante. |
| Carla | Janela InPrivate do Edge (`Ctrl+Shift+N` no Windows) | Abra o mesmo link, informe Carla e entre como votante. |

Também é possível usar três perfis separados do navegador. Use o mesmo endereço `localhost:5173` nas três sessões.

1. Na mesa da Ana, confira se aparecem os três apelidos. Adicione um item à fila e selecione-o para estimar.
2. Vote em cada janela, por exemplo Ana com **3**, Bruno com **5** e Carla com **8**. Antes da revelação, confira em cada janela se os demais participantes aparecem apenas com o estado de votação, sem a carta escolhida.
3. Revele a rodada pela janela da Ana e confira os três votos. Atualize a página do Bruno: ele deve voltar ao mesmo lugar, sem criar um quarto participante.

Se uma janela já abrir com o apelido de outra pessoa, verifique se ambas pertencem ao mesmo perfil ou à mesma sessão anônima. Abra o convite em outro perfil ou navegador para obter um cookie independente.
