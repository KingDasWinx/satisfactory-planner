# TextNode QoL + Customizations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir redimensionar o `textNode` no canvas e adicionar um painel de customizações úteis (texto/estilo), além de pequenas melhorias QoL em `frameNode` e ferramentas relacionadas.

**Architecture:** Reaproveitar o padrão já existente do `frameNode` (usa `NodeResizer`) para habilitar resize do `textNode`. Persistir `width/height` no próprio node (via `node.style`) ao finalizar resize (`changes` do tipo `dimensions`). Para customizações, manter os valores no `TextNodeData` e expor um popup leve (estilo `ConfigPopup`) acessível via menu de contexto do bloco.

**Tech Stack:** Next.js (App Router), React, TypeScript (strict), Tailwind CSS v4, @xyflow/react, Zustand.

---

## File structure (new + touched)

**Create**
- `components/nodes/TextConfigPopup.tsx`: popup de customização do text node (tamanho, cor, alinhamento etc.)
- `lib/utils/textStyle.ts`: utils puros (clamp, presets, validação de cor)

**Modify**
- `components/nodes/TextNode.tsx`: adicionar `NodeResizer`, aplicar estilos configuráveis, suportar “auto height” opcional
- `store/factoryStore.ts`: persistir `width/height` do `textNode` em `node.style` no `onNodesChange` ao terminar resize
- `lib/types/store.ts`: expandir `TextNodeData` com novos campos de estilo
- `components/panels/ContextMenu.tsx`: adicionar entradas “Editar texto…” e “Resetar estilo” (só para `textNode`)

**Optional (QoL extra)**
- `components/nodes/FrameNode.tsx`: adicionar opacidade/“título sempre visível” (pequena melhoria)
- `lib/utils/nodeGeometry.ts`: atualizar `estimateNodeSize(textNode)` para respeitar `node.style.width/height` quando existir (para repulsão/magic planner ficarem mais coerentes)

---

## Customizações propostas (TextNode)

Persistidas em `TextNodeData` (pt-BR para labels; chaves em inglês):

- **fontSize**: number (ex: 10–40)
- **color**: string hex/rgb (já existe)
- **backgroundColor**: string (ex: `#0f1117` com alpha)
- **borderColor**: string (para destacar notas)
- **textAlign**: `'left' | 'center' | 'right'`
- **fontWeight**: `400 | 600 | 700`
- **italic**: boolean
- **underline**: boolean
- **padding**: number (ex: 8–20)
- **locked**: boolean (quando true, não entra em modo edição por double click)
- **autoSizeHeight**: boolean (se true, altura cresce com conteúdo; largura continua pelo resize)

QoL extra:
- **Presets rápidos**: “Nota”, “Título”, “Aviso”, “Checklist” (aplicam um conjunto de estilos)
- **Botão “Resetar estilo”**: volta para defaults do projeto

---

### Task 1: Expandir `TextNodeData` (tipos)

**Files:**
- Modify: `lib/types/store.ts`

- [ ] **Step 1: Atualizar tipo `TextNodeData`**

Atualizar `TextNodeData` para:

```ts
export type TextNodeData = {
  text: string
  fontSize?: number
  color?: string
  backgroundColor?: string
  borderColor?: string
  textAlign?: 'left' | 'center' | 'right'
  fontWeight?: 400 | 600 | 700
  italic?: boolean
  underline?: boolean
  padding?: number
  locked?: boolean
  autoSizeHeight?: boolean
}
```

- [ ] **Step 2: Rodar build para validar TypeScript**

Run: `npm run build`  
Expected: sucesso.

- [ ] **Step 3: Commit**

```bash
git add "lib/types/store.ts"
git commit -m "$(cat <<'EOF'
add TextNode style fields

EOF
)"
```

---

### Task 2: Habilitar resize no `TextNode` (UI)

**Files:**
- Modify: `components/nodes/TextNode.tsx`

- [ ] **Step 1: Adicionar `NodeResizer`**

No topo:

```ts
import { NodeResizer, type NodeProps } from '@xyflow/react'
```

No componente, renderizar:

```tsx
<NodeResizer
  isVisible={selected}
  minWidth={160}
  minHeight={60}
  lineStyle={{ borderColor: '#f59e0b' }}
  handleStyle={{ borderColor: '#f59e0b', background: '#1e293b' }}
/>
```

- [ ] **Step 2: Usar estilos do `data`**

Aplicar no container:
- `backgroundColor` via `style`
- `borderColor` (quando não selecionado) via `style`
- `padding` via `style`

Aplicar no `<textarea>` e no `<p>`:
- `textAlign`, `fontWeight`, `fontStyle` (italic), `textDecoration` (underline)

Exemplo de `style` no texto:

```ts
const fontSize = data.fontSize ?? 14
const color = data.color ?? '#e2e8f0'
const textAlign = data.textAlign ?? 'left'
const fontWeight = data.fontWeight ?? 600
const fontStyle = data.italic ? 'italic' : 'normal'
const textDecoration = data.underline ? 'underline' : 'none'
```

- [ ] **Step 3: Respeitar modo locked**

No `startEditing()`:
- se `data.locked === true`, não entrar em edição.

- [ ] **Step 4: Build**

Run: `npm run build`  
Expected: sucesso.

- [ ] **Step 5: Commit**

```bash
git add "components/nodes/TextNode.tsx"
git commit -m "$(cat <<'EOF'
add TextNode resizer and style rendering

EOF
)"
```

---

### Task 3: Persistir `width/height` do TextNode no store ao finalizar resize

**Files:**
- Modify: `store/factoryStore.ts`

Contexto: `FrameNode` já usa `NodeResizer` e o store já detecta `hasDimensionsEnd`. Precisamos garantir que quando um `textNode` for redimensionado, o tamanho fique persistido em `node.style` (para salvar projeto / undo / reload).

- [ ] **Step 1: Detectar `dimensions` changes e aplicar no node**

No `onNodesChange`, antes do `applyNodeChanges(...)` ou logo após (desde que não crie loop), extrair changes:

```ts
const dimensionChanges = changes.filter(
  (c): c is Extract<(typeof changes)[number], { type: 'dimensions' }> => c.type === 'dimensions'
)
```

Depois de `applied`, aplicar patch apenas em `textNode`:

```ts
const next = applied.map((n) => {
  const dc = dimensionChanges.find((c) => c.id === n.id)
  if (!dc) return n
  if (n.type !== 'textNode') return n
  const w = (dc as { dimensions?: { width?: number; height?: number } }).dimensions?.width
  const h = (dc as { dimensions?: { width?: number; height?: number } }).dimensions?.height
  if (!w || !h) return n
  return { ...n, style: { ...(n.style ?? {}), width: w, height: h } } as FactoryNode
})
```

E retornar `nodes: next` (respeitando as branches já existentes de drag/snapping).

- [ ] **Step 2: Verificar Undo**

Manual:
- criar text node
- redimensionar
- `Ctrl+Z` deve voltar o tamanho anterior

- [ ] **Step 3: Build**

Run: `npm run build`  
Expected: sucesso.

- [ ] **Step 4: Commit**

```bash
git add "store/factoryStore.ts"
git commit -m "$(cat <<'EOF'
persist TextNode size on resize end

EOF
)"
```

---

### Task 4: Popup de customização do TextNode (QoL)

**Files:**
- Create: `components/nodes/TextConfigPopup.tsx`
- Create: `lib/utils/textStyle.ts`
- Modify: `components/panels/ContextMenu.tsx`
- Modify: `store/factoryStore.ts` (adicionar actions de update do text style)

- [ ] **Step 1: Criar util de clamp/parse de cor**

`lib/utils/textStyle.ts`:

```ts
export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

export function isLikelyCssColor(v: string): boolean {
  const s = v.trim()
  if (!s) return false
  if (s.startsWith('#')) return true
  if (s.startsWith('rgb')) return true
  if (s.startsWith('hsl')) return true
  return false
}
```

- [ ] **Step 2: Actions no store para estilo do texto**

Adicionar em `FactoryStore`:

```ts
setTextNodeStyle: (nodeId: string, style: Partial<import('@/lib/types/store').TextNodeData>) => void
resetTextNodeStyle: (nodeId: string) => void
```

Implementação:
- `setTextNodeStyle`: `_pushHistory()` e faz merge no `node.data`
- `resetTextNodeStyle`: `_pushHistory()` e remove campos de estilo (mantém `text`)

- [ ] **Step 3: Criar `TextConfigPopup`**

Regras:
- UI simples, `createPortal`, semelhante ao `ConfigPopup`
- Campos:
  - Font size (number)
  - Cor do texto (input text + presets rápidos)
  - Fundo (input text)
  - Alinhamento (select)
  - Bold/Italic/Underline (toggles)
  - Padding (number)
  - Lock (toggle)
  - Auto altura (toggle)
  - Reset style (button)

- [ ] **Step 4: Integrar no `ContextMenu` do `textNode`**

Quando `menu.type === 'nodeContext'` e o node alvo for `textNode`:
- adicionar botão “Editar texto…”
- abrir `TextConfigPopup` ancorado ao menu (mesmo padrão do `ConfigPopup` com `anchorRect`)

- [ ] **Step 5: Build**

Run: `npm run build`  
Expected: sucesso.

- [ ] **Step 6: Commit**

```bash
git add "lib/utils/textStyle.ts" "store/factoryStore.ts" "components/nodes/TextConfigPopup.tsx" "components/panels/ContextMenu.tsx"
git commit -m "$(cat <<'EOF'
add TextNode customization popup

EOF
)"
```

---

### Task 5: (Opcional) QoL para FrameNode e Ferramentas

**Files:**
- Modify: `components/nodes/FrameNode.tsx`
- Modify: `lib/types/store.ts`
- Modify: `store/factoryStore.ts`

Sugestões:
- **Frame opacity** (ex: 2–12%)
- **Frame title size** (pequeno/médio)
- **“Travar tamanho”** (desabilita `NodeResizer` quando ativo)

Implementação: adicionar campos no `FrameNodeData` e aplicar no render.

Commit separado como QoL opcional.

---

## Self-review checklist (plan)

- **Resize do text**: Task 2 (UI) + Task 3 (persistência/undo).
- **Customizações**: Task 1 (tipos) + Task 4 (store + popup + context menu).
- **Sem placeholders**: cada task contém paths e snippets de código/commands.

