# TODO — Refatoração de Estrutura

Este documento lista as mudanças de código necessárias para adequar o projeto
aos padrões definidos no CLAUDE.md. **Não altere funcionalidade — apenas mova,
separe e renomeie.** Cada item é independente e pode ser feito por um
desenvolvedor separado.

---

## ~~1. Extrair tipos para `lib/types/`~~ ✅ CONCLUÍDO

~~**Problema:** tipos e interfaces estavam espalhados em `store/factoryStore.ts`,
`lib/gameData.ts` e `lib/flowCalc.ts`.~~

Criados `lib/types/game.ts`, `lib/types/flow.ts`, `lib/types/store.ts` e `lib/types/index.ts`.
`lib/gameData.ts` e `lib/flowCalc.ts` re-exportam os tipos para backwards compatibility.
`store/factoryStore.ts` importa de `lib/types/`.

---

## ~~2. Separar `MachineNode.tsx` em subcomponentes~~ ✅ CONCLUÍDO

Criados:
- `components/nodes/MachineNode.tsx` — compositor simples
- `components/nodes/MachineNodeHeader.tsx` — cabeçalho, potência, botão config
- `components/nodes/MachineNodeBody.tsx` — receita, inputs/outputs, valores de supply/demand
- `components/nodes/MachineNodeUtilBar.tsx` — barra de utilização
- `components/nodes/ConfigPopup.tsx` — painel de config via portal
- `components/nodes/ExtractorRateInput.tsx` — input inline de override de taxa

---

## ~~3. Separar `FactoryEditor.tsx` em subcomponentes e hooks~~ ✅ CONCLUÍDO

Criados:
- `lib/hooks/useEdgeColors.ts` — calcula cores e labels das arestas
- `lib/hooks/useFlowSync.ts` — sincroniza supply/demand nos nós via store
- `lib/hooks/useConnectionHandler.ts` — lógica de connect/drag/popup
- `components/layout/CanvasBackground.tsx` — Background, Controls e MiniMap

---

## ~~4. Mover `SearchMenu.tsx` para `components/panels/`~~ ✅ CONCLUÍDO

---

## ~~5. Deletar `Sidebar.tsx`~~ ✅ CONCLUÍDO

---

## ~~6. Extrair `fmt()` para `lib/utils/format.ts`~~ ✅ CONCLUÍDO

Criado `lib/utils/format.ts`. Imports em `FactoryEditor.tsx` e `MachineNode.tsx` atualizados.

---

## ~~7. Extrair `gameDataContext.tsx` para `lib/hooks/`~~ ✅ CONCLUÍDO

Criado `lib/hooks/useMultiMachines.ts`. `lib/gameDataContext.tsx` mantém apenas o contexto e o Provider.

---

## ~~8. Corrigir uso do store em `FactoryEditor.tsx`~~ ✅ CONCLUÍDO

`FactoryEditor.tsx` usa seletores individuais para cada campo do store.

---

## ~~9. Organizar pasta `data/`~~ ✅ CONCLUÍDO

---

## ~~10. Mover utilitários CLI para `scripts/`~~ ✅ CONCLUÍDO

---

## ~~11. Criar `lib/utils/index.ts`~~ ✅ CONCLUÍDO

Criado `lib/utils/index.ts` re-exportando `fmt` de `format.ts`.

---

## Estrutura final

```
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── layout/
│   │   └── CanvasBackground.tsx          ✅
│   ├── nodes/
│   │   ├── MachineNode.tsx               ✅
│   │   ├── MachineNodeHeader.tsx         ✅
│   │   ├── MachineNodeBody.tsx           ✅
│   │   ├── MachineNodeUtilBar.tsx        ✅
│   │   ├── ConfigPopup.tsx               ✅
│   │   └── ExtractorRateInput.tsx        ✅
│   ├── panels/
│   │   └── SearchMenu.tsx                ✅
│   └── FactoryEditor.tsx
├── lib/
│   ├── types/
│   │   ├── game.ts                       ✅
│   │   ├── flow.ts                       ✅
│   │   ├── store.ts                      ✅
│   │   └── index.ts                      ✅
│   ├── hooks/
│   │   ├── useEdgeColors.ts              ✅
│   │   ├── useFlowSync.ts                ✅
│   │   ├── useConnectionHandler.ts       ✅
│   │   └── useMultiMachines.ts           ✅
│   ├── utils/
│   │   ├── format.ts                     ✅
│   │   └── index.ts                      ✅
│   ├── gameData.ts
│   ├── gameDataContext.tsx
│   └── flowCalc.ts
├── store/
│   └── factoryStore.ts
├── data/
│   ├── game/
│   │   └── game_data.json                ✅
│   └── docs/
│       └── (JSONs de idioma)
├── scripts/
│   ├── index.ts                          ✅
│   └── config.ts                         ✅
└── public/
    └── icons/                            ✅
```
