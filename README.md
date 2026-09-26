# MyPokeCards

SPA para buscar cartas do Pokémon TCG e montar decks — interface em **pt-BR**, persistência local no navegador, tema claro/escuro.

## Stack

- **React** + **Vite** + **TypeScript**
- **TCGdex** (API gratuita multilíngue, locale `pt-br`)
- **Dexie** (IndexedDB) para decks, coleção e favoritos
- Decisões técnicas completas: [`.docs/technologies.md`](.docs/technologies.md)

## Pré-requisitos

- [Node.js](https://nodejs.org/) **20 LTS** ou superior
- npm (incluído no Node)

## Como rodar

Na raiz do repositório:

```bash
npm install
npm run dev
```

Abra a URL que o Vite imprimir no terminal (geralmente `http://localhost:5173`).

### Outros scripts

| Comando | Descrição |
|---------|-----------|
| `npm run build` | Build de produção |
| `npm run preview` | Preview do build |
| `npm test` | Testes (Vitest) |

> Se `package.json` ainda não existir, o projeto está na fase de documentação/scaffold — rode o pipeline de implementação ou o scaffold Vite React-TS conforme `.docs/technologies.md` §11.

## Documentação

| Arquivo | Conteúdo |
|---------|----------|
| [`.docs/requirements.md`](.docs/requirements.md) | Requisitos funcionais e NFR |
| [`.docs/technologies.md`](.docs/technologies.md) | Stack, API, pastas, IO, testes |
| [`.docs/todo.md`](.docs/todo.md) | Checklist de features |
| [`.docs/specs/`](.docs/specs/) | Specs por feature |

## Escopo v1

- Busca visual de cartas + detalhe
- Decks (criar, editar, duplicar, excluir, favoritar, avaliar)
- Coleção (cópias possuídas) e cartas faltantes
- Import/export JSON e texto estilo PTCGO
- Tema claro/escuro persistente
- Sem backend, sem conta, sem sync em nuvem

## Licença de dados

Dados e imagens de cartas via [TCGdex](https://tcgdex.dev/). Pokémon e artes © respectivos detentores. Este app não vende cartas.
