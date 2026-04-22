# TODO — Refatoração de Estrutura

Este documento lista as mudanças de código necessárias para adequar o projeto
aos padrões definidos no CLAUDE.md. **Não altere funcionalidade — apenas mova,
separe e renomeie.** Cada item é independente e pode ser feito por um
desenvolvedor separado.

---

## 1. Extrair tipos para `lib/types/`

**Problema:** tipos e interfaces estão espalhados em `store/factoryStore.ts`,
`lib/gameData.ts` e `lib/flowCalc.ts`.

**O que fazer:**
- Criar `lib/types/game.ts` — mover `Ingredient`, `ParsedRecipe`, `Machine`,
  `Part`, `MultiMachine`, `GameData` de `lib/gameData.ts`
- Criar `lib/types/flow.ts` — mover `NodeRates` de `lib/flowCalc.ts`
- Criar `lib/types/store.ts` — mover `MachineNodeData`, `MenuContext` e
  variantes de `store/factoryStore.ts`
- Criar `lib/types/index.ts` — re-exportar tudo dos três arquivos acima

**Atenção:** após mover, `store/factoryStore.ts` deve importar `MachineNodeData`
e `MenuContext` de `lib/types/` — nunca o contrário. A direção de dependência
é sempre `store/ → lib/types/`, jamais `lib/ → store/`.

---

## 2. Separar `MachineNode.tsx` em subcomponentes

**Problema:** `components/nodes/MachineNode.tsx` tem mais de 400 linhas fazendo tudo:
header, corpo, config popup, utilization bar, handles.

**O que fazer:**
- `components/nodes/MachineNode.tsx` — mantém só a montagem, importa os demais
- `components/nodes/MachineNodeHeader.tsx` — nome da máquina, ícone de energia, botão config
- `components/nodes/MachineNodeBody.tsx` — lista de inputs/outputs com valores de supply/demand
- `components/nodes/MachineNodeUtilBar.tsx` — barra de utilização (verde/âmbar/vermelho)
- `components/nodes/ConfigPopup.tsx` — painel de config (recipe picker, nMachines, clockSpeed, variante de minerador)
- `components/nodes/ExtractorRateInput.tsx` — input inline de override de taxa para extratores

---

## 3. Separar `FactoryEditor.tsx` em subcomponentes e hooks

**Problema:** `components/FactoryEditor.tsx` tem ~285 linhas misturando lógica de
cálculo de fluxo, handlers de conexão e JSX do canvas.

**O que fazer:**
- `lib/hooks/useEdgeColors.ts` — recalcula cores e labels das arestas com base
  em supply/demand (parte do cálculo atual de `coloredEdges`)
- `lib/hooks/useFlowSync.ts` — acumula `incomingSupply` e `outgoingDemand` por
  nó e empurra para o store via `setNodeConfig` (o `useEffect` atual)
- `lib/hooks/useConnectionHandler.ts` — lógica de `onConnectStart`, `onConnectEnd`,
  `handleConnect`, `isValidConnection` e as refs de controle (`connectionJustMade`,
  `pendingDrag`, `menuOpenedFromDrag`)
- `components/layout/CanvasBackground.tsx` — wrapper que renderiza `<Background>`,
  `<Controls>` e `<MiniMap>` com suas classes de estilo
- `FactoryEditor.tsx` deve ficar responsável apenas por compor os subcomponentes
  e passar props

**Nota:** `useEdgeColors` e `useFlowSync` são separados propositalmente —
juntos ultrapassariam o limite de 80 linhas por hook definido no CLAUDE.md.

---

## ~~4. Mover `SearchMenu.tsx` para `components/panels/`~~ ✅ CONCLUÍDO

~~**Problema:** `SearchMenu.tsx` é um painel flutuante, não um componente genérico
de UI, e estava na raiz de `components/`.~~

~~Movido para `components/panels/SearchMenu.tsx`. Import em `FactoryEditor.tsx` atualizado.~~

---

## ~~5. Deletar `Sidebar.tsx`~~ ✅ CONCLUÍDO

~~`components/Sidebar.tsx` deletado.~~

---

## 6. Extrair `fmt()` para `lib/utils/format.ts`

**Problema:** a função `fmt()` está exportada de dentro de `MachineNode.tsx`,
o que é semanticamente errado — um componente exportando uma utilidade.
Atualmente `FactoryEditor.tsx` importa `fmt` de `MachineNode.tsx`.

**O que fazer:**
- Criar `lib/utils/format.ts` com `fmt()` e qualquer outra função de
  formatação de número/texto
- Atualizar todos os imports que usam `fmt` de `MachineNode.tsx`
  (`FactoryEditor.tsx` e o próprio `MachineNode.tsx`)

---

## 7. Extrair `gameDataContext.tsx` para `lib/hooks/`

**Problema:** o hook `useMultiMachines()` está dentro de `lib/gameDataContext.tsx`
junto com o Provider, misturando responsabilidades.

**O que fazer:**
- Manter `lib/gameDataContext.tsx` apenas com o contexto e o Provider
- Criar `lib/hooks/useMultiMachines.ts` que importa o contexto e exporta o hook
- Atualizar imports em todos os componentes que usam `useMultiMachines`

---

## 8. Corrigir uso do store em `FactoryEditor.tsx`

**Problema:** `FactoryEditor.tsx` desestrutura o store inteiro com
`const { nodes, edges, ... } = useFactoryStore()`, violando a regra do CLAUDE.md
que exige seletores individuais.

**O que fazer:**
- Substituir a desestruturação por seletores explícitos:
  ```ts
  const nodes = useFactoryStore((s) => s.nodes)
  const edges = useFactoryStore((s) => s.edges)
  // etc.
  ```
- Aplicar o mesmo padrão a qualquer outro componente que ainda desestruture
  o store inteiro

---

## ~~9. Organizar pasta `data/`~~ ✅ CONCLUÍDO

~~`data/game_data.json` movido para `data/game/game_data.json`. Path em `lib/gameData.ts` atualizado.
`data/icons/` movido para `public/icons/` — Next.js serve assets estáticos de `public/`.~~

---

## ~~10. Mover utilitários CLI para `scripts/`~~ ✅ CONCLUÍDO

~~`src/index.ts` → `scripts/index.ts`, `src/config.ts` → `scripts/config.ts`.
Pasta `src/` deletada. Script `cli` em `package.json` atualizado. Pasta `dist/` deletada.~~

---

## 11. Criar `lib/utils/index.ts`

Após as etapas acima, criar `lib/utils/index.ts` re-exportando todas as
utilidades (`format`, etc.) para imports limpos.

---

## Estrutura alvo após refatoração

Itens com ✅ já estão no lugar. Itens pendentes são os que restam implementar.

```
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── layout/
│   │   └── CanvasBackground.tsx          ← pendente (item 3)
│   ├── nodes/
│   │   ├── MachineNode.tsx               ← pendente separar (item 2)
│   │   ├── MachineNodeHeader.tsx         ← pendente (item 2)
│   │   ├── MachineNodeBody.tsx           ← pendente (item 2)
│   │   ├── MachineNodeUtilBar.tsx        ← pendente (item 2)
│   │   ├── ConfigPopup.tsx               ← pendente (item 2)
│   │   └── ExtractorRateInput.tsx        ← pendente (item 2)
│   ├── panels/
│   │   └── SearchMenu.tsx                ✅ concluído
│   └── FactoryEditor.tsx
├── lib/
│   ├── types/
│   │   ├── game.ts                       ← pendente (item 1)
│   │   ├── flow.ts                       ← pendente (item 1)
│   │   ├── store.ts                      ← pendente (item 1)
│   │   └── index.ts                      ← pendente (item 1)
│   ├── hooks/
│   │   ├── useEdgeColors.ts              ← pendente (item 3)
│   │   ├── useFlowSync.ts                ← pendente (item 3)
│   │   ├── useConnectionHandler.ts       ← pendente (item 3)
│   │   └── useMultiMachines.ts           ← pendente (item 7)
│   ├── utils/
│   │   ├── format.ts                     ← pendente (item 6)
│   │   └── index.ts                      ← pendente (item 11)
│   ├── gameData.ts
│   ├── gameDataContext.tsx
│   └── flowCalc.ts
├── store/
│   └── factoryStore.ts
├── data/
│   ├── game/
│   │   └── game_data.json                ✅ concluído
│   └── docs/
│       └── (JSONs de idioma)
├── scripts/
│   ├── index.ts                          ✅ concluído
│   └── config.ts                         ✅ concluído
└── public/
    └── icons/                            ✅ concluído
        └── (ícones de itens/máquinas)
```
