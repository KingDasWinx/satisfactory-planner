# Alignment Helper Lines (Figma-like) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar guias de alinhamento e de espaçamento (tipo Figma) ao arrastar nós no canvas, com *snap durante o drag*, mostrando linhas e rótulos em px, para ajudar a organizar blocos sem “ir no olho”.

**Architecture:** Implementar um resolvedor puro de “candidatos de guias” (alinhamento de bordas/centros e espaçamento igual) baseado em bounds reais (`node.measured|width|height`) e posição `top-left`. Integrar em dois pontos: (1) um overlay de UI no `FactoryEditor` para desenhar linhas/rótulos, (2) ajuste de posição do nó arrastado (snap) durante `dragging: true` no `store/factoryStore.ts` antes da colisão anti-overlap já existente.

**Tech Stack:** Next.js (App Router), React, Tailwind, `@xyflow/react`, Zustand, TypeScript strict.

---

### Decisões fechadas com o usuário
- **Snap**: `snap_on_drag` (gruda enquanto arrasta).
- **Frames**: `frameNode` fica **excluído** das guias (como fundo).

---

### Pesquisa (e base de referência)
- React Flow possui **grid snapping** (`snapToGrid`/`snapGrid`), mas o exemplo de **Helper Lines** (alinhamento) existe como **Pro example** (página pública descreve o comportamento, mas o código fica no Pro).
  - Página: `https://reactflow.dev/examples/interaction/helper-lines/` (atualizada em 2026-03-19)
- Vamos implementar internamente (sem dependências) um subconjunto com UX semelhante:
  - Alinhamento horizontal/vertical por bordas e centros.
  - Recomendações de espaçamento (mostrar distância em px quando iguala um gap existente).

---

### Mapa de arquivos (responsabilidades e limites)

**Criar**
- `C:/Users/kingdaswinx/Documents/GitHub/satisfactory-planner/lib/utils/alignmentGuides.ts`
  - Funções puras:
    - extrair bounds (top/left/right/bottom/centers) a partir de `node.position` + `measured/width/height`.
    - detectar candidatos de alinhamento com tolerância.
    - detectar candidatos de espaçamento igual em linha/coluna e retornar guia + rótulo.
    - aplicar snap (retornar `snapPosition` top-left) para o nó arrastado.
- `C:/Users/kingdaswinx/Documents/GitHub/satisfactory-planner/components/layout/HelperLinesOverlay.tsx`
  - Renderização das linhas e labels no viewport (usa transform do React Flow para converter flow→screen).
- `C:/Users/kingdaswinx/Documents/GitHub/satisfactory-planner/lib/hooks/useHelperLines.ts`
  - Hook que observa “drag em progresso” e calcula guias a cada frame/batch.
- `C:/Users/kingdaswinx/Documents/GitHub/satisfactory-planner/tests/alignmentGuides.test.ts`
  - Testes unitários do resolvedor puro (alinhamento + espaçamento + snap).

**Modificar**
- `C:/Users/kingdaswinx/Documents/GitHub/satisfactory-planner/components/FactoryEditor.tsx`
  - Montar overlay e plugar hook.
- `C:/Users/kingdaswinx/Documents/GitHub/satisfactory-planner/store/factoryStore.ts`
  - Durante `dragging: true`, aplicar snap do helper-lines (somente no(s) nó(s) arrastado(s)) antes de `constrainDraggedNodesLive`.
- `C:/Users/kingdaswinx/Documents/GitHub/satisfactory-planner/package.json`
  - Já existe `npm test`; só adicionar o novo arquivo de teste.

---

### Regras de UX (definição clara)

**Alinhamento**
- Mostrar linhas quando o nó arrastado estiver dentro de um `ALIGN_THRESHOLD_PX` (ex.: 6px) de:
  - `left`, `centerX`, `right` de outro nó.
  - `top`, `centerY`, `bottom` de outro nó.
- Com `snap_on_drag`, a posição do nó arrastado deve ser ajustada para casar exatamente com o alvo (top-left recalculado via largura/altura do nó arrastado).

**Espaçamento**
- Considerar “mesma linha” quando há overlap significativo no eixo perpendicular (ex.: overlap vertical ≥ 30% da altura menor).
- Para um conjunto de 3 nós A–B–C em linha, se o nó arrastado (B) estiver quase igualando o gap A↔B e B↔C (ou igualando gap existente A↔C com um nó intermediário), exibir:
  - um retângulo/linha de distância com label `“NN px”` (flow px), desenhado entre as bordas.
- Snap: se a diferença do gap atual para o gap alvo estiver dentro de `SPACING_THRESHOLD_PX` (ex.: 8px), ajustar a posição para igualar o gap exatamente.

**Exclusões**
- `frameNode` não participa como candidato nem como nó arrastado para as guias (mas continua existindo no canvas).

---

### Task 1: Implementar resolvedor puro `alignmentGuides.ts`

**Files:**
- Create: `C:/Users/kingdaswinx/Documents/GitHub/satisfactory-planner/lib/utils/alignmentGuides.ts`
- Test: `C:/Users/kingdaswinx/Documents/GitHub/satisfactory-planner/tests/alignmentGuides.test.ts`

- [ ] **Step 1: Escrever teste falhando (alinhamento básico)**

```ts
import test from 'node:test'
import assert from 'node:assert/strict'
import { getAlignmentSnap } from '../lib/utils/alignmentGuides'

test('snaps dragged node centerX to target centerX', () => {
  const nodes = [
    { id: 'a', type: 'machineNode', position: { x: 0, y: 0 }, measured: { width: 240, height: 120 }, data: {} },
    { id: 'b', type: 'machineNode', position: { x: 500, y: 0 }, measured: { width: 240, height: 200 }, data: {} },
  ] as any

  const out = getAlignmentSnap({
    draggedId: 'b',
    nodes,
    alignThreshold: 6,
  })

  assert.equal(out?.vertical?.kind, 'centerX')
})
```

- [ ] **Step 2: Implementar `getAlignmentSnap` mínimo para passar**

```ts
export type GuideLine =
  | { axis: 'x'; kind: 'left'|'centerX'|'right'; position: number; targetId: string }
  | { axis: 'y'; kind: 'top'|'centerY'|'bottom'; position: number; targetId: string }

export type SnapResult = {
  snapPosition: { x: number; y: number }
  vertical?: GuideLine
  horizontal?: GuideLine
}

export function getAlignmentSnap(args: {
  draggedId: string
  nodes: any[]
  alignThreshold: number
}): SnapResult | null {
  // Implementação: extrair bounds (top/left/right/bottom/center) do dragged e comparar com outros
  // Retornar snapPosition (top-left) e as linhas selecionadas (prioridade: center > edges)
  return null
}
```

- [ ] **Step 3: Rodar teste e confirmar FAIL**

Run: `npm test`
Expected: FAIL no teste novo.

- [ ] **Step 4: Completar implementação (alinhamento x/y)**
  - Usar `node.position` (top-left) e `measured` para bounds.
  - Selecionar melhor candidato por menor delta.

- [ ] **Step 5: Adicionar testes de espaçamento**
  - Casos:
    - 3 nós na mesma linha com gap 40px; ao arrastar o do meio, exibir label `40`.
    - Snap ajusta para o gap exato.

- [ ] **Step 6: Rodar testes**

Run: `npm test`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add lib/utils/alignmentGuides.ts tests/alignmentGuides.test.ts
git commit -m "add helper lines solver for alignment and spacing"
```

---

### Task 2: Criar overlay visual `HelperLinesOverlay`

**Files:**
- Create: `C:/Users/kingdaswinx/Documents/GitHub/satisfactory-planner/components/layout/HelperLinesOverlay.tsx`

- [ ] **Step 1: Implementar overlay com props simples**

```tsx
'use client'

import type { XYPosition } from '@xyflow/react'

export type HelperLine =
  | { axis: 'x'; x: number; y0: number; y1: number; label?: string }
  | { axis: 'y'; y: number; x0: number; x1: number; label?: string }

interface HelperLinesOverlayProps {
  lines: HelperLine[]
  viewport: { x: number; y: number; zoom: number }
}

export function HelperLinesOverlay({ lines, viewport }: HelperLinesOverlayProps) {
  // Render absolutely positioned divs; convert flow->screen using viewport
  // screenX = flowX * zoom + viewport.x; screenY = flowY * zoom + viewport.y
  return (
    <div className=\"pointer-events-none absolute inset-0 z-30\">
      {lines.map((l, i) => {
        // ... render line + label
        return <div key={i} />
      })}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/layout/HelperLinesOverlay.tsx
git commit -m "add helper lines overlay component"
```

---

### Task 3: Hook `useHelperLines` (calcular guias em tempo real)

**Files:**
- Create: `C:/Users/kingdaswinx/Documents/GitHub/satisfactory-planner/lib/hooks/useHelperLines.ts`
- Modify: `C:/Users/kingdaswinx/Documents/GitHub/satisfactory-planner/components/FactoryEditor.tsx`

- [ ] **Step 1: Implementar hook**
  - Inputs: `nodes`, `rfInstance` (ou `useReactFlow`), e “draggedId(s)” (inferir via `nodes.some(n.dragging)` não existe; então usar `onNodesChange` para detectar changes com `dragging: true` e armazenar em store UI local).
  - Output: `lines` + `labels` + `snapInfo` (opcional).

- [ ] **Step 2: Renderizar overlay dentro do `ReactFlow`**
  - Montar `<HelperLinesOverlay />` como filho do `ReactFlow` (mesmo nível de `CanvasBackground`).

- [ ] **Step 3: Commit**

```bash
git add lib/hooks/useHelperLines.ts components/FactoryEditor.tsx
git commit -m "render helper lines during node drag"
```

---

### Task 4: Snap durante drag no `factoryStore`

**Files:**
- Modify: `C:/Users/kingdaswinx/Documents/GitHub/satisfactory-planner/store/factoryStore.ts`

- [ ] **Step 1: Integrar snap antes da colisão**
  - No bloco `isDragging` do `onNodesChange`:
    - determinar `draggedIds`
    - para cada draggedId, calcular `snapPosition` via `getAlignmentSnap` + `getSpacingSnap`
    - atualizar `applied` com a posição snapped (top-left)
    - então chamar `constrainDraggedNodesLive(...)` (anti-overlap) como hoje

- [ ] **Step 2: Rodar build**

Run: `npm run build`
Expected: ok

- [ ] **Step 3: Commit**

```bash
git add store/factoryStore.ts
git commit -m "snap nodes to helper lines while dragging"
```

---

### Task 5: QA manual (feito pelo usuário)

- [ ] **Step 1: Alinhamento**
  - Arrastar nó perto de outro: aparecer linha de centro/borda e grudar.
  - Zoom/pan: linhas continuam corretas (overlay respeita viewport).

- [ ] **Step 2: Espaçamento**
  - Criar 3 nós em linha com gap X: ao mover um, mostrar label X e grudar no mesmo gap.

---

### Self-review (do plano)
- **Cobertura do pedido**: guias de alinhamento (linha/coluna), indicação visual em px, recomendação de espaçamento igual, snap durante drag, exclusão de frames.
- **Sem placeholders**: passos têm arquivos, testes e comandos.
- **Compatibilidade com o projeto**: sem dependências novas; usa Tailwind; lógica pura em `lib/utils`.

