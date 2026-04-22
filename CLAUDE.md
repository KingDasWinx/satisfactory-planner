# CLAUDE.md — Satisfactory Factory Planner

Guia de referência para desenvolvimento neste projeto. Leia antes de abrir
qualquer arquivo.

---

## Como rodar

**Requisitos:** Node.js ≥ 18 (testado em v24), npm.

```bash
npm install
npm run dev      # inicia em http://localhost:3000
npm run build    # build de produção
npm run start    # serve o build de produção
npm run cli      # script de extração de dados do jogo (não é o app web)
```

O app não tem banco de dados nem variáveis de ambiente obrigatórias.
Os dados do jogo são carregados de `data/game/game_data.json` em tempo de build
(server component — não precisa de API externa).

---

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js (App Router) |
| UI | React + Tailwind CSS v4 |
| Grafo visual | @xyflow/react |
| Estado global | Zustand |
| Linguagem | TypeScript (strict) |
| Runtime | Node.js |

---

## Estrutura de pastas

```
├── app/                  # Rotas Next.js (App Router)
├── components/
│   ├── layout/           # Wrappers de layout (canvas background, providers)
│   ├── nodes/            # Componentes de nós do grafo (@xyflow)
│   ├── panels/           # Painéis flutuantes (menus, sidebars)
│   └── FactoryEditor.tsx # Compositor principal do canvas
├── lib/
│   ├── types/            # Todas as interfaces e tipos TypeScript
│   ├── hooks/            # Custom hooks (lógica reutilizável)
│   ├── utils/            # Funções puras sem efeitos colaterais
│   ├── gameData.ts       # Loader de dados do jogo (server-side)
│   ├── gameDataContext.tsx
│   └── flowCalc.ts       # Cálculo de taxas e cores de arestas
├── store/                # Stores Zustand
├── data/
│   ├── game/             # game_data.json parseado
│   ├── docs/             # JSONs de idioma do Satisfactory
│   └── scripts/          # Scripts de extração de dados
├── scripts/              # Utilitários CLI (não fazem parte do app web)
└── public/               # Assets estáticos servidos pelo Next.js
```

**Regra de ouro:** se você não sabe onde colocar um arquivo novo, escolha pela
responsabilidade — não pelo tamanho.

**Direção de dependência:** `components/ → lib/ → store/`. Nunca importe de
`components/` dentro de `lib/`, e nunca importe de `store/` dentro de `lib/types/`.

---

## Regras de componentização

### Tamanho máximo

- **Componente de UI:** 150 linhas. Acima disso, extraia subcomponentes.
- **Hook:** 80 linhas. Acima disso, divida em hooks menores.
- **Arquivo de utils:** sem limite rígido, mas cada função deve ser pura e ter
  nome autoexplicativo.

### Onde cada coisa vai

| O que é | Onde vai |
|---|---|
| Nó do grafo (@xyflow) | `components/nodes/` |
| Painel/menu flutuante | `components/panels/` |
| Provider ou wrapper de layout | `components/layout/` |
| Lógica de estado/cálculo reutilizável | `lib/hooks/` |
| Função pura (formatação, matemática) | `lib/utils/` |
| Interface ou tipo TypeScript | `lib/types/` |
| Estado global compartilhado | `store/` |

### Regras específicas para nós (@xyflow)

Cada nó complexo deve ser decomposto em:
- `[Nome]Node.tsx` — compositor, recebe `data` do xyflow, monta os demais
- `[Nome]NodeHeader.tsx` — cabeçalho (título, ícones, ações)
- `[Nome]NodeBody.tsx` — conteúdo principal (inputs/outputs)
- `ConfigPopup.tsx` — painel de configuração, separado do nó

---

## Tipos

- Todos os tipos e interfaces ficam em `lib/types/`.
- `lib/types/index.ts` re-exporta tudo — use este caminho nos imports.
- **Nunca defina tipos dentro de componentes ou stores.** Defina em `lib/types/`
  e importe de lá.
- `store/factoryStore.ts` importa tipos de `lib/types/` — nunca o contrário.
- Prefira `interface` para objetos de dados do jogo, `type` para unions e
  aliases.

---

## Estado global (Zustand)

- Um arquivo por domínio em `store/` (ex: `factoryStore.ts`, `uiStore.ts`).
- A store expõe **ações nomeadas**, nunca modifica estado diretamente de fora.
- Componentes acessam a store via **seletores individuais** — nunca desestruture
  o objeto inteiro:
  ```ts
  // correto
  const nodes = useFactoryStore((s) => s.nodes)
  const openMenu = useFactoryStore((s) => s.openMenu)

  // errado — assina re-renders desnecessários e viola o padrão
  const { nodes, edges, menu } = useFactoryStore()
  ```

---

## Dados do jogo

- `lib/gameData.ts` é **server-side only** — nunca importe em Client Components.
- O arquivo fonte é `data/game/game_data.json`.
- Para adicionar novos dados do jogo: atualize o script em
  `data/scripts/satisfactory-data-extractor.js`, rode-o e commite o JSON gerado.
- Scripts de extração/CLI vivem em `scripts/` e **não** são importados pelo app.

---

## Estilo e tema

**Paleta fixa — não invente cores novas sem discutir:**

| Token | Hex | Uso |
|---|---|---|
| Background | `#0f1117` | Fundo geral |
| Surface | `bg-slate-900` | Cards, nós |
| Primary | `#f59e0b` (amber-500) | Destaques, bordas de máquina |
| Input handle | `#60a5fa` (blue-400) | Handles de entrada |
| Output handle | `#34d399` (emerald-400) | Handles de saída |
| Success | `#22c55e` | Aresta ≥ 100% |
| Warning | `#f59e0b` | Aresta 50–99% |
| Danger | `#ef4444` | Aresta < 50% |

- Use classes Tailwind sempre que possível.
- CSS global (`globals.css`) apenas para: animações keyframe, overrides do
  xyflow, variáveis CSS de tema.
- Não adicione CSS inline em componentes — prefira classes Tailwind ou um
  arquivo `.module.css` se o caso for complexo.

---

## Idioma

- **Todo texto visível ao usuário é em português (pt-BR).**
- Nomes de variáveis, funções e comentários de código podem ser em inglês.
- Metadados (`<title>`, `<meta description>`) em português.

---

## TypeScript

- `strict: true` — não desative regras para "facilitar".
- Sem `any` — se precisar de tipo dinâmico, use `unknown` e faça narrowing.
- Props de componentes devem ter interface explícita nomeada:
  ```ts
  interface MachineNodeProps {
    data: MachineNodeData
  }
  export function MachineNode({ data }: MachineNodeProps) { ... }
  ```
- Não use `export default` em componentes — prefira named exports para melhor
  rastreabilidade.

---

## Comentários

- Não comente o que o código já diz (nome de variável, tipo).
- Comente **por quê**, não o quê:
  ```ts
  // xyflow não aceita handles dinâmicos após montagem — recria o nó inteiro
  ```
- Fórmulas não óbvias merecem uma linha explicando a origem:
  ```ts
  // potência com overclock: P = P_base × clockSpeed^1.322 (fórmula oficial do jogo)
  ```

---

## Fluxo de cálculo (regras de negócio)

- `lib/flowCalc.ts` é a **única** fonte de verdade para cálculos de taxa.
- Nunca calcule taxas inline em componentes — chame `calcNodeRates()`.
- Extratores (Miner, Oil Extractor, etc.) não têm inputs — tratamento especial
  já existe em `calcNodeRates()`.
- ClockSpeed vai de `0.01` a `2.5` (1.0 = 100%). A potência escala com
  expoente `1.322`.

---

## Commits e PRs

- Mensagens de commit em inglês, no imperativo: `add ConfigPopup component`,
  `fix edge color on overclock > 100%`.
- Um commit por mudança lógica — não misture refatoração com feature.
- PRs de refatoração (sem mudança de comportamento) devem ter `[refactor]` no
  título.

---

## O que não fazer

- Não adicione dependências sem discutir — o bundle já tem xyflow + zustand +
  tailwind, que é pesado o suficiente.
- Não use `useEffect` para sincronizar estado derivado — calcule na hora ou use
  seletores Zustand.
- Não coloque lógica de negócio em componentes — extraia para `lib/hooks/` ou
  `lib/utils/`.
- Não importe de `components/` dentro de `lib/` — a dependência é de uma mão
  só: `components → lib`, nunca o contrário.
- Não deixe arquivos não utilizados no repositório.
- Não desestruture o store inteiro em componentes — use seletores individuais.
