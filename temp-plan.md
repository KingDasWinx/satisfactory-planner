---
name: community-ui-discovery-gamification
overview: "Completar as próximas fases do produto (A+B+C): UI de engajamento (likes/bookmarks/comentários) no viewer do projeto, descoberta completa (coleções + destaques) e gamificação com regras simples por ações, com tarefas pequenas, testes e commits frequentes."
todos: []
isProject: false
---

# Comunidade — UI (Engajamento) + Descoberta + Gamificação Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar as “próximas etapas” pós-MVP: (A) UI completa de comunidade no *viewer* do projeto (likes, favoritos, comentários), (B) descoberta completa (coleções + destaques) e (C) gamificação com regras simples por ações.

**Architecture:** UI client-side em cima de `app/api/*` já existentes/expandido; tudo que toca DB continua server-first com Prisma. A UI de engajamento deve ser um painel flutuante no canvas **somente em** `/project/[id]/view` (decisão do usuário), evitando interferir no editor. Gamificação começa simples: pontos por ações (like, comentário, publicar, fork), recalculados/atualizados em pontos de escrita.

**Tech Stack:** Next.js App Router, React/Tailwind, TypeScript strict, Prisma v7 + adapter-pg, Auth.js v5 (JWT), Zod, rate limiting.

---

## Release map (macro-fases)

- **Release A1:** UI de Engajamento no viewer: “painel Comunidade” com Like, Favoritar e Comentários (CRUD básico).
- **Release A2:** Polimento do viewer: estados de loading/erro, contadores, otimizações (debounce, refresh), acessibilidade e rate-limit friendly.
- **Release B1:** Coleções: schema + APIs básicas (criar/listar/renomear/remover/itens) + UI mínima em `/me`.
- **Release B2:** Destaques: schema + APIs (fixar/desfixar/listar) + render no perfil público `/u/@username`.
- **Release C1:** Gamificação: schema + regras simples por ações (pontos) + endpoint `/api/me/stats` expandido.
- **Release C2:** Conquistas iniciais (seed) + concessão automática em eventos (ex.: “primeiro projeto publicado”, “10 likes dados”, “primeiro comentário”).

---

## Estrutura de arquivos (alvos prováveis)

- Viewer/editor:
  - Modify: `components/FactoryEditor.tsx` (apenas para plugar um painel quando `readOnly`)
  - Modify: `components/panels/ToolsBar.tsx` (opcional: botão “Comunidade” quando `readOnly`)
  - Create: `components/panels/CommunityPanel.tsx` (wrapper do painel no viewer)
  - Create: `components/community/LikeButton.tsx`
  - Create: `components/community/BookmarkButton.tsx`
  - Create: `components/community/CommentsPanel.tsx`

- Discovery (coleções/destaques):
  - Modify: `prisma/schema.prisma` (se precisar ajustar relações/índices)
  - Create: `app/api/me/collections/route.ts`
  - Create: `app/api/me/collections/[collectionId]/route.ts`
  - Create: `app/api/me/collections/[collectionId]/items/route.ts`
  - Create: `app/api/me/featured/route.ts`
  - Create: `app/api/users/[username]/featured/route.ts`
  - Create: `components/me/CollectionsPanel.tsx`
  - Modify: `app/me/page.tsx`
  - Modify: `app/u/[username]/page.tsx`

- Gamificação:
  - Modify: `app/api/projects/[id]/like/route.ts` (atribuir pontos)
  - Modify: `app/api/projects/[id]/comments/route.ts` (atribuir pontos)
  - Modify: `app/api/projects/[id]/fork/route.ts` (atribuir pontos)
  - Modify: `app/api/projects/[id]/route.ts` (quando publicar/alterar visibilidade, atribuir pontos)
  - Modify: `app/api/me/stats/route.ts` (retornar breakdown)
  - Create: `lib/server/gamification.ts` (regras + helpers)
  - Test: `tests/gamificationRules.test.ts`

---

# Release A1 — UI de Engajamento no viewer

### Task A1-1: Plugar painel Comunidade no viewer (readOnly)

**Files:**
- Modify: `components/FactoryEditor.tsx`
- Create: `components/panels/CommunityPanel.tsx`
- Test: `tests/communityPanelExports.test.ts`

- [ ] **Step 1: Write failing test (exports)**

`tests/communityPanelExports.test.ts`:

```ts
import test from 'node:test'
import assert from 'node:assert/strict'

test('CommunityPanel exports component', async () => {
  const mod = await import('../components/panels/CommunityPanel')
  assert.equal(typeof mod.CommunityPanel, 'function')
})
```

- [ ] **Step 2: Run tests (should FAIL)**

Run: `npm test`
Expected: FAIL (module missing)

- [ ] **Step 3: Implement minimal `CommunityPanel`**

`components/panels/CommunityPanel.tsx` (client):
- Recebe `projectId: string`
- Renderiza botões/abas (Like/Favoritar/Comentários)

- [ ] **Step 4: Mount panel only when `readOnly && projectId`**

Em `components/FactoryEditor.tsx`:
- Se `readOnly` for true, renderizar `<CommunityPanel projectId={projectId} />` como overlay (z-10) sem bloquear o canvas.

- [ ] **Step 5: Run tests (PASS)**

Run: `npm test`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add components/panels/CommunityPanel.tsx components/FactoryEditor.tsx tests/communityPanelExports.test.ts
git commit -m "add community panel to project viewer"
```

---

### Task A1-2: Like UI + integração

**Files:**
- Create: `components/community/LikeButton.tsx`
- Modify/Create: `components/panels/CommunityPanel.tsx`
- Test: `tests/likeButtonExports.test.ts`

- [ ] **Step 1: Write failing test (exports)**

```ts
import test from 'node:test'
import assert from 'node:assert/strict'

test('LikeButton exports component', async () => {
  const mod = await import('../components/community/LikeButton')
  assert.equal(typeof mod.LikeButton, 'function')
})
```

- [ ] **Step 2: Run tests (FAIL)**

Run: `npm test`
Expected: FAIL

- [ ] **Step 3: Implement LikeButton**

Behavior:
- `GET /api/projects/[id]/likes` para `{ count, likedByMe }`
- `POST /api/projects/[id]/like` e `DELETE` para togglar
- Mostra contador e estado loading/erro

- [ ] **Step 4: Add to CommunityPanel**

- [ ] **Step 5: Run tests (PASS)**

Run: `npm test`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add components/community/LikeButton.tsx components/panels/CommunityPanel.tsx tests/likeButtonExports.test.ts
git commit -m "add like button ui for community projects"
```

---

### Task A1-3: Bookmark UI + integração

**Files:**
- Create: `components/community/BookmarkButton.tsx`
- Modify: `components/panels/CommunityPanel.tsx`
- Test: `tests/bookmarkButtonExports.test.ts`

- [ ] **Step 1: Failing test (exports)**

```ts
import test from 'node:test'
import assert from 'node:assert/strict'

test('BookmarkButton exports component', async () => {
  const mod = await import('../components/community/BookmarkButton')
  assert.equal(typeof mod.BookmarkButton, 'function')
})
```

- [ ] **Step 2: Run tests (FAIL)**

- [ ] **Step 3: Implement BookmarkButton**

Use endpoints:
- `POST/DELETE /api/projects/[id]/bookmark`

Obs.: como não existe `GET /api/projects/[id]/bookmark`, o estado inicial pode vir de:
- chamar `GET /api/me/bookmarks` e verificar se contém o `projectId` (MVP)

- [ ] **Step 4: Wire no CommunityPanel**

- [ ] **Step 5: Run tests (PASS)**

- [ ] **Step 6: Commit**

```bash
git add components/community/BookmarkButton.tsx components/panels/CommunityPanel.tsx tests/bookmarkButtonExports.test.ts
git commit -m "add bookmark button ui"
```

---

### Task A1-4: Comentários UI (listar/criar/deletar)

**Files:**
- Create: `components/community/CommentsPanel.tsx`
- Modify: `components/panels/CommunityPanel.tsx`
- Test: `tests/commentsPanelExports.test.ts`

- [ ] **Step 1: Failing test (exports)**

```ts
import test from 'node:test'
import assert from 'node:assert/strict'

test('CommentsPanel exports component', async () => {
  const mod = await import('../components/community/CommentsPanel')
  assert.equal(typeof mod.CommentsPanel, 'function')
})
```

- [ ] **Step 2: Run tests (FAIL)**

- [ ] **Step 3: Implement CommentsPanel**

Endpoints:
- `GET /api/projects/[id]/comments`
- `POST /api/projects/[id]/comments` `{ content }`
- `DELETE /api/projects/[id]/comments/[commentId]`

UI:
- textarea + botão enviar
- lista com username e tempo
- botão deletar apenas em comentários “meus” (403 → esconder)

- [ ] **Step 4: Add to CommunityPanel**

- [ ] **Step 5: Run tests (PASS)**

- [ ] **Step 6: Commit**

```bash
git add components/community/CommentsPanel.tsx components/panels/CommunityPanel.tsx tests/commentsPanelExports.test.ts
git commit -m "add comments ui panel"
```

---

# Release A2 — Polimento do viewer

### Task A2-1: Acessibilidade + UX (loading/error)

**Files:**
- Modify: `components/panels/CommunityPanel.tsx`
- Modify: `components/community/*.tsx`

- [ ] **Step 1: Adicionar labels e estados acessíveis**

Em cada botão (`LikeButton`, `BookmarkButton`) e no formulário de comentários:
- `aria-label` (ex.: `"Curtir projeto"`, `"Descurtir projeto"`, `"Favoritar projeto"`, `"Remover favorito"`, `"Enviar comentário"`)
- `aria-busy={loading}` durante requisições
- `disabled` enquanto `loading`

- [ ] **Step 2: Debounce de refresh de comentários após POST**

Em `CommentsPanel`, após `POST`, fazer:
- `setTimeout(() => void refresh(), 250)` para evitar “duplo fetch” em redes lentas (rate-limit friendly)
- garantir que o refresh cancela o anterior quando o componente desmonta (flag `cancelled`)

- [ ] **Step 3: Run tests**

Run: `npm test`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add components/panels/CommunityPanel.tsx components/community
git commit -m "polish community viewer panel a11y and refresh behavior"
```

---

# Release B1 — Coleções (APIs + UI mínima em /me)

### Task B1-1: APIs de coleções

**Files:**
- Create: `app/api/me/collections/route.ts`
- Create: `app/api/me/collections/[collectionId]/route.ts`
- Create: `app/api/me/collections/[collectionId]/items/route.ts`
- Test: `tests/collectionsApiHandlers.test.ts`

- [ ] **Step 1: Failing test (exports)**

```ts
import test from 'node:test'
import assert from 'node:assert/strict'

test('collections APIs export handlers', async () => {
  const root = await import('../app/api/me/collections/route')
  const item = await import('../app/api/me/collections/[collectionId]/route')
  const items = await import('../app/api/me/collections/[collectionId]/items/route')
  assert.equal(typeof root.GET, 'function')
  assert.equal(typeof root.POST, 'function')
  assert.equal(typeof item.PATCH, 'function')
  assert.equal(typeof item.DELETE, 'function')
  assert.equal(typeof items.POST, 'function')
  assert.equal(typeof items.DELETE, 'function')
})
```

- [ ] **Step 2: Run tests (FAIL)**
- [ ] **Step 3: Implement endpoints**

Contract:
- `GET /api/me/collections` → lista do usuário
- `POST /api/me/collections` `{ name }`
- `PATCH /api/me/collections/[id]` `{ name }`
- `DELETE /api/me/collections/[id]`
- `POST /api/me/collections/[id]/items` `{ projectId }`
- `DELETE /api/me/collections/[id]/items?projectId=...`

Implementação (resumo obrigatório):
- **Auth obrigatório** em todos.
- **Zod**:
  - `name`: string `trim().min(1).max(60)`
  - `projectId`: string `trim().min(1).max(64)`
- **Prisma**:
  - `Collection` pertence ao usuário (`userId`).
  - `CollectionItem` `@@unique([collectionId, projectId])` para idempotência.
- **Rate limit**:
  - `GET`: 600/min
  - `writes`: 60/min

Exemplo de `POST /api/me/collections` (trecho):

```ts
const Body = z.object({ name: z.string().trim().min(1).max(60) })
const parsed = Body.safeParse(await req.json().catch(() => null))
if (!parsed.success) return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 })
const created = await prisma.collection.create({ data: { userId: uid, name: parsed.data.name }, select: { id: true } })
return NextResponse.json({ ok: true, id: created.id })
```

- [ ] **Step 4: Run tests (PASS)**
- [ ] **Step 5: Commit**

```bash
git add app/api/me/collections tests/collectionsApiHandlers.test.ts
git commit -m "add collections api"
```

---

### Task B1-2: UI mínima de coleções em `/me`

**Files:**
- Create: `components/me/CollectionsPanel.tsx`
- Modify: `app/me/page.tsx`
- Test: `tests/collectionsPanelExports.test.ts`

- [ ] **Step 1: Failing export test**

`tests/collectionsPanelExports.test.ts`:

```ts
import test from 'node:test'
import assert from 'node:assert/strict'

test('CollectionsPanel exports component', async () => {
  const mod = await import('../components/me/CollectionsPanel')
  assert.equal(typeof mod.CollectionsPanel, 'function')
})
```

- [ ] **Step 2: Implement panel (listar + criar + renomear + deletar)**

`components/me/CollectionsPanel.tsx` (client):
- `GET /api/me/collections` (lista)
- `POST /api/me/collections` (cria)
- `PATCH /api/me/collections/[id]` (renomeia)
- `DELETE /api/me/collections/[id]` (remove)

UI mínima:
- lista de cards (nome + quantidade de itens se disponível)
- input “Nova coleção”
- botão renomear (inline) e excluir (confirm)

- [ ] **Step 3: Wire into `/me`**

Em `app/me/page.tsx`, renderizar `<CollectionsPanel />` abaixo de “Meus projetos na nuvem”.

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/me/CollectionsPanel.tsx app/me/page.tsx tests/collectionsPanelExports.test.ts
git commit -m "add collections ui to me dashboard"
```

---

# Release B2 — Destaques (featured)

### Task B2-1: APIs de destaque

**Files:**
- Create: `app/api/me/featured/route.ts`
- Create: `app/api/users/[username]/featured/route.ts`
- Test: `tests/featuredApiHandlers.test.ts`

- [ ] **Step 1: Failing test (exports)**

`tests/featuredApiHandlers.test.ts`:

```ts
import test from 'node:test'
import assert from 'node:assert/strict'

test('featured APIs export handlers', async () => {
  const me = await import('../app/api/me/featured/route')
  const pub = await import('../app/api/users/[username]/featured/route')
  assert.equal(typeof me.GET, 'function')
  assert.equal(typeof me.POST, 'function')
  assert.equal(typeof me.DELETE, 'function')
  assert.equal(typeof pub.GET, 'function')
})
```

- [ ] **Step 2: Implement APIs**

Contract:
- `GET /api/users/[username]/featured` → lista de projetos destacados (públicos) do usuário
- `GET /api/me/featured` → lista do usuário
- `POST /api/me/featured` `{ projectId }`
- `DELETE /api/me/featured?projectId=...`

- [ ] **Step 3: Run tests**

Run: `npm test`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add app/api/me/featured app/api/users/[username]/featured tests/featuredApiHandlers.test.ts
git commit -m "add featured projects api"
```

---

### Task B2-2: Mostrar destaques no perfil público

**Files:**
- Modify: `app/u/[username]/page.tsx`
- Create: `components/user/FeaturedProjects.tsx`

- [ ] **Step 1: Implement `FeaturedProjects`**

`components/user/FeaturedProjects.tsx` (client):
- fetch `GET /api/users/${username}/featured`
- render grid de links para `/project/[id]/view`
- empty state “Nenhum destaque”

- [ ] **Step 2: Render no perfil**

Em `app/u/[username]/page.tsx`, renderizar a seção “Destaques” acima da seção “Projetos públicos”.

- [ ] **Step 3: Run tests**

Run: `npm test`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add components/user/FeaturedProjects.tsx app/u/[username]/page.tsx
git commit -m "show featured projects on public profile"
```

---

# Release C1 — Gamificação (pontos por ações)

### Task C1-1: Helper de regras + teste de regras

**Files:**
- Create: `lib/server/gamification.ts`
- Test: `tests/gamificationRules.test.ts`

- [ ] **Step 1: Failing test**

```ts
import test from 'node:test'
import assert from 'node:assert/strict'

test('gamification: points table stable', async () => {
  const mod = await import('../lib/server/gamification')
  assert.equal(mod.pointsFor('like_given'), 1)
  assert.equal(mod.pointsFor('comment_created'), 2)
})
```

- [ ] **Step 2: Implement minimal points table**

`pointsFor(action)` with actions:
- `like_given`
- `comment_created`
- `project_published`
- `fork_created`

- [ ] **Step 3: Commit**

---

### Task C1-2: Atribuir pontos em eventos

**Files:**
- Modify: `app/api/projects/[id]/like/route.ts`
- Modify: `app/api/projects/[id]/comments/route.ts`
- Modify: `app/api/projects/[id]/fork/route.ts`
- Modify: `app/api/projects/[id]/route.ts` (quando PRIVATE → COMMUNITY)

- [ ] **Step 1: Increment pontos (idempotente)**

Regras (decisão do usuário: “simple-actions”):
- `like_given`: +1 quando o like é criado (não em requests repetidos)
- `comment_created`: +2 quando o comentário é criado
- `fork_created`: +3 quando o fork cloud é criado
- `project_published`: +5 quando um projeto muda de `PRIVATE` → `COMMUNITY`

Implementação:
- Usar helper `addPoints(userId, action, meta)` de `lib/server/gamification.ts`
- `addPoints` faz `prisma.userStats.upsert` com `points: { increment: X }`
- Onde houver `upsert` (like/bookmark), só pontuar se foi **create** (ex.: tentar `create` e capturar erro de unique, ou buscar antes)

- [ ] **Step 2: Aplicar nos endpoints**

Aplicar `addPoints` em:
- `POST /api/projects/[id]/like` (somente se criou)
- `POST /api/projects/[id]/comments` (sempre)
- `POST /api/projects/[id]/fork` (cloud mode, após criar)
- `PUT /api/projects/[id]` (quando detectar mudança de visibilidade para `COMMUNITY`)

- [ ] **Step 3: Run tests**

Run: `npm test`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add app/api/projects lib/server/gamification.ts
git commit -m "award points for community actions"
```

---

### Task C1-3: Expandir `/api/me/stats` com breakdown

**Files:**
- Modify: `app/api/me/stats/route.ts`

- [ ] **Step 1: Retornar level/points + últimos eventos (se armazenar) ou apenas totals**
- [ ] **Step 2: Commit**

---

# Release C2 — Conquistas iniciais

### Task C2-1: Seed de achievements + concessão

**Files:**
- Create: `scripts/seedAchievements.ts` (rodável manualmente)
- Modify: `app/api/projects/[id]/like/route.ts` etc. para conceder

- [ ] **Step 1: Implement seed script**

`scripts/seedAchievements.ts`:
- conecta via Prisma
- cria `Achievement` com `key/title/description` (skipDuplicates)
- exemplo de keys:
  - `first_comment`
  - `first_like_given`
  - `first_project_published`
  - `first_fork`

Run manual:

```bash
node scripts/seedAchievements.ts
```

- [ ] **Step 2: Helper `grantAchievement(userId, key)`**

Adicionar em `lib/server/gamification.ts`:
- buscar `Achievement` por `key`
- `userAchievement.upsert` por `(userId, achievementId)` (idempotente)

- [ ] **Step 3: Conceder em eventos**

Conceder nas mesmas rotas do C1-2:
- após criar comentário → `first_comment`
- após criar like → `first_like_given`
- após publicar → `first_project_published`
- após fork → `first_fork`

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/seedAchievements.ts lib/server/gamification.ts app/api/projects
git commit -m "seed and grant achievements for actions"
```

---

## Self-review

- A UI do viewer foi planejada para não interferir no editor (readOnly overlay).
- Discovery cobre coleções + destaques com APIs e UI mínima.
- Gamificação cobre regras simples por ações (decisão do usuário) e integra nos pontos de escrita.
- Não há placeholders “TBD”; cada task tem arquivos e passos executáveis.

---

## Execution handoff

Plan complete. Escolha a forma de execução:

**1) Subagent-Driven** (recomendado)

**2) Inline Execution**

---

## Como executar (Inline Execution)

- [ ] **Step 1: Criar branch**

```bash
git checkout -b feat/community-ui-discovery-gamification
```

- [ ] **Step 2: Executar task-by-task**

Siga as tasks na ordem: A1 → A2 → B1 → B2 → C1 → C2.

- [ ] **Step 3: Verificação final**

```bash
npm test
npm run build
```

- [ ] **Step 4: Merge/PR**

Criar PR (se usar GitHub) ou merge local.