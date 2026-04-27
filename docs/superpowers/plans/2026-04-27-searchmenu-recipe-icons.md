# SearchMenu Recipe Icons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Exibir o ícone correspondente (PNG em `public/icons/`) para cada receita listada no `SearchMenu`, ao lado do nome da receita, de forma consistente para receitas alternantes.

**Architecture:** Derivar o ícone a partir do **Part** (item) e não do nome da receita. No `SearchMenu`, para cada `ParsedRecipe`, escolher um `part` “principal” e transformar em path via `partNameToIconPath(part)`. Renderizar `<img>` com fallback (hide-on-error) para evitar ícone quebrado e evitar “layout shift”.

**Tech Stack:** Next.js (App Router), React, TypeScript (strict), Tailwind CSS.

---

## File structure (new + touched)

**Create**
- `lib/utils/recipeIcon.ts`: lógica pura para escolher o `part` que representa a receita no menu
- `tests/recipeIcon.test.ts`: unit tests para garantir comportamento (inclusive alternates)

**Modify**
- `components/panels/SearchMenu.tsx`: renderizar ícone ao lado do item na lista e usar fallback visual

**Uses existing**
- `lib/utils/iconName.ts` (`partNameToIconPath`)

---

### Task 1: Util puro para escolher ícone de receita

**Files:**
- Create: `lib/utils/recipeIcon.ts`
- Test: `tests/recipeIcon.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/recipeIcon.test.ts`:

```ts
import test from 'node:test'
import assert from 'node:assert/strict'
import type { ParsedRecipe } from '@/lib/types/game'
import { getRecipePrimaryIconPart } from '@/lib/utils/recipeIcon'

function r(partOut: string, amount = 1, extraOutputs?: Array<{ part: string; amount: number }>): ParsedRecipe {
  return {
    name: 'Any',
    machine: 'Constructor',
    batchTime: 4,
    tier: '0-1',
    alternate: false,
    inputs: [],
    outputs: [{ part: partOut, amount }, ...(extraOutputs ?? [])],
  }
}

test('getRecipePrimaryIconPart returns null when no outputs', () => {
  const recipe: ParsedRecipe = {
    name: 'NoOut',
    machine: 'Constructor',
    batchTime: 4,
    tier: '0-1',
    alternate: false,
    inputs: [],
    outputs: [],
  }
  assert.equal(getRecipePrimaryIconPart(recipe), null)
})

test('getRecipePrimaryIconPart returns the only output part', () => {
  assert.equal(getRecipePrimaryIconPart(r('Iron Ingot')), 'Iron Ingot')
})

test('getRecipePrimaryIconPart picks the largest amount output', () => {
  const recipe = r('A', 1, [{ part: 'B', amount: 5 }])
  assert.equal(getRecipePrimaryIconPart(recipe), 'B')
})

test('getRecipePrimaryIconPart is stable across alternate recipes when outputs match', () => {
  const normal = r('Adaptive Control Unit', 1)
  const alternate: ParsedRecipe = { ...normal, name: 'Alternate ACU', alternate: true }
  assert.equal(getRecipePrimaryIconPart(normal), 'Adaptive Control Unit')
  assert.equal(getRecipePrimaryIconPart(alternate), 'Adaptive Control Unit')
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
- `npm test`

Expected:
- FAIL com erro de módulo não encontrado: `Cannot find module '@/lib/utils/recipeIcon'` (ou export ausente).

- [ ] **Step 3: Implement minimal util**

Create `lib/utils/recipeIcon.ts`:

```ts
import type { ParsedRecipe } from '@/lib/types/game'

export function getRecipePrimaryIconPart(recipe: ParsedRecipe): string | null {
  if (!recipe.outputs || recipe.outputs.length === 0) return null
  let best = recipe.outputs[0]
  if (!best) return null

  for (const o of recipe.outputs) {
    if (o.amount > best.amount) best = o
  }

  return best.part ?? null
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
- `npm test`

Expected:
- PASS.

- [ ] **Step 5: Commit**

```bash
git add "lib/utils/recipeIcon.ts" "tests/recipeIcon.test.ts"
git commit -m "$(cat <<'EOF'
add recipe icon part selector

EOF
)"
```

---

### Task 2: Renderizar ícones na lista do SearchMenu

**Files:**
- Modify: `components/panels/SearchMenu.tsx`

- [ ] **Step 1: Add imports**

Adicionar no topo do arquivo:

```ts
import { partNameToIconPath } from '@/lib/utils/iconName'
import { getRecipePrimaryIconPart } from '@/lib/utils/recipeIcon'
```

- [ ] **Step 2: Implement UI for icon + fallback**

Dentro do `filteredRecipes.map((recipe) => { ... })`, antes do `return ( <button ...> )`, derivar o ícone:

```ts
const iconPart = getRecipePrimaryIconPart(recipe)
const iconSrc = iconPart ? partNameToIconPath(iconPart) : null
```

Alterar o header do item (`<div className="flex items-center justify-between ...">`) para incluir uma coluna esquerda com ícone + nome:

```tsx
<div className="flex items-center justify-between gap-2">
  <div className="flex items-center gap-2 min-w-0">
    {/* Icon slot (fixed size to avoid layout shift) */}
    <span className="h-6 w-6 shrink-0">
      {iconSrc ? (
        <img
          src={iconSrc}
          alt={iconPart ?? ''}
          className="h-6 w-6 object-contain"
          draggable={false}
          onError={(e) => {
            // Hide broken icon without re-rendering the whole list
            const img = e.currentTarget
            img.style.display = 'none'
          }}
        />
      ) : null}
    </span>

    <span className="text-sm text-slate-200 font-medium truncate group-hover:text-white">
      {recipe.alternate && <span className="text-purple-400 mr-1 text-xs">★</span>}
      {recipe.name}
    </span>
  </div>

  <span className="text-xs text-slate-500 shrink-0">{recipe.machine}</span>
</div>
```

Nota: usamos um slot fixo `h-6 w-6` para não “pular” o texto quando o ícone carrega ou falha.

- [ ] **Step 3: Manual verification**

Rodar:
- `npm run dev`

Checklist visual:
- Abrir o `SearchMenu` e verificar que cada receita na lista exibe um ícone (quando existir PNG correspondente).
- Receitas alternantes exibem o mesmo ícone do item produzido.
- Se não existir PNG para um item, não deve aparecer ícone quebrado nem “pular” layout.

- [ ] **Step 4: Typecheck/build**

Run:
- `npm run build`

Expected:
- Sucesso.

- [ ] **Step 5: Commit**

```bash
git add "components/panels/SearchMenu.tsx"
git commit -m "$(cat <<'EOF'
add recipe icons to SearchMenu

EOF
)"
```

---

### Task 3: (Opcional) Melhorar fallback para ícone ausente

**Files:**
- Modify: `components/panels/SearchMenu.tsx`

Objetivo: se um item não tiver PNG, mostrar um placeholder sutil (ex: círculo com borda) para consistência visual.

- [ ] **Step 1: Implement placeholder style**

Substituir `<span className="h-6 w-6 shrink-0">` por:

```tsx
<span className="h-6 w-6 shrink-0 rounded border border-slate-700/60 bg-slate-800/30 grid place-items-center">
  {iconSrc ? (
    <img
      src={iconSrc}
      alt={iconPart ?? ''}
      className="h-5 w-5 object-contain"
      draggable={false}
      onError={(e) => {
        const img = e.currentTarget
        img.style.display = 'none'
      }}
    />
  ) : null}
</span>
```

- [ ] **Step 2: Verify visually**

Garantir que listas com/sem ícone ficam alinhadas.

- [ ] **Step 3: Commit**

```bash
git add "components/panels/SearchMenu.tsx"
git commit -m "$(cat <<'EOF'
refine SearchMenu recipe icon fallback

EOF
)"
```

---

## Self-review checklist (plan)

- Cobertura do requisito: “cada item do SearchMenu com ícone” está coberto pela Task 2.
- Alternates: garantido porque a escolha do ícone depende do `outputs[].part` (Task 1 tests).
- Sem placeholders: cada passo tem paths e snippets completos.

