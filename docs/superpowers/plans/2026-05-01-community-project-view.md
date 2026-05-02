# Community Project View — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir o CommunityPanel flutuante pela experiência split-view: canvas à esquerda (70%), sidebar direita com autor, meta, ações sociais e comentários.

**Architecture:** A view page `/project/[id]/view` passa a ser um server component que busca metadados do projeto e renderiza um layout `flex h-screen`. O novo `ProjectSidebar` recebe dados via props e gerencia interações client-side. O fork exige login — o `uiStore` carrega um `pendingAction` que o `AppShell` executa assim que o login é concluído.

**Tech Stack:** Next.js App Router (server components), Zustand (`uiStore`), next-auth (`useSession`), Prisma, Tailwind CSS, componentes existentes `LikeButton` / `BookmarkButton` / `CommentsPanel`.

---

## Mapa de arquivos

| Arquivo | Ação |
|---|---|
| `store/uiStore.ts` | Modificar — adicionar `pendingAction` |
| `components/layout/AppShell.tsx` | Modificar — executar pendingAction após login |
| `components/community/ForkButton.tsx` | Criar |
| `components/community/ProjectSidebar.tsx` | Criar |
| `app/project/[id]/view/page.tsx` | Modificar — buscar meta server-side, layout split |
| `components/panels/CommunityPanel.tsx` | Deletar |
| `components/FactoryEditor.tsx` | Modificar — remover import/uso do CommunityPanel |

---

## Task 1: Estender uiStore com pendingAction

**Arquivos:**
- Modificar: `store/uiStore.ts`

- [ ] **Substituir o conteúdo de `store/uiStore.ts` por:**

```ts
import { create } from 'zustand'

type PendingAction = { type: 'fork'; projectId: string }

interface UiState {
  loginModalOpen: boolean
  openLoginModal: () => void
  closeLoginModal: () => void
  pendingAction: PendingAction | null
  setPendingAction: (action: PendingAction) => void
  clearPendingAction: () => void
}

export const useUiStore = create<UiState>((set) => ({
  loginModalOpen: false,
  openLoginModal: () => set({ loginModalOpen: true }),
  closeLoginModal: () => set({ loginModalOpen: false }),
  pendingAction: null,
  setPendingAction: (action) => set({ pendingAction: action }),
  clearPendingAction: () => set({ pendingAction: null }),
}))
```

- [ ] **Verificar lint:** nenhum erro esperado.

- [ ] **Commit:**
```bash
git add store/uiStore.ts
git commit -m "feat: add pendingAction to uiStore for post-login fork"
```

---

## Task 2: AppShell — executar pendingAction após login

**Arquivos:**
- Modificar: `components/layout/AppShell.tsx`

- [ ] **Adicionar imports no topo do arquivo (após os existentes):**

```ts
import { useRouter } from 'next/navigation'
import { useRef } from 'react'  // já pode estar importado — verificar e não duplicar
```

- [ ] **Dentro da função `AppShell`, adicionar os seletores do uiStore e o useEffect:**

Logo após as linhas existentes de `useUiStore`:
```tsx
const pendingAction = useUiStore((s) => s.pendingAction)
const setPendingAction = useUiStore((s) => s.setPendingAction)
const clearPendingAction = useUiStore((s) => s.clearPendingAction)
const router = useRouter()
const prevStatus = useRef(status)

useEffect(() => {
  const wasNotAuthenticated = prevStatus.current !== 'authenticated'
  prevStatus.current = status
  if (!wasNotAuthenticated || status !== 'authenticated' || !pendingAction) return

  if (pendingAction.type === 'fork') {
    const { projectId } = pendingAction
    clearPendingAction()
    fetch(`/api/projects/${encodeURIComponent(projectId)}/fork`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ target: 'cloud' }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((json: { mode?: string; id?: string }) => {
        if (json.mode === 'cloud' && json.id) router.push(`/project/${json.id}/edit`)
      })
      .catch(() => {})
  }
}, [status, pendingAction, clearPendingAction, router])
```

> Nota: `setPendingAction` não é usada no AppShell — o import pode ser removido se o linter reclamar. `useRef` e `useEffect` já estão importados no arquivo; confirme antes de adicionar.

- [ ] **Verificar lint:** nenhum erro esperado.

- [ ] **Commit:**
```bash
git add components/layout/AppShell.tsx
git commit -m "feat: execute pending fork action after login in AppShell"
```

---

## Task 3: Criar ForkButton

**Arquivos:**
- Criar: `components/community/ForkButton.tsx`

- [ ] **Criar o arquivo com o conteúdo abaixo:**

```tsx
'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useUiStore } from '@/store/uiStore'

interface ForkButtonProps {
  projectId: string
}

function IconFork() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="7" cy="4" r="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="17" cy="4" r="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="20" r="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 6v2a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12 10v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function ForkButton({ projectId }: ForkButtonProps) {
  const { status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const openLoginModal = useUiStore((s) => s.openLoginModal)
  const setPendingAction = useUiStore((s) => s.setPendingAction)

  async function handleFork() {
    if (loading) return

    if (status !== 'authenticated') {
      setPendingAction({ type: 'fork', projectId })
      openLoginModal()
      return
    }

    setLoading(true)
    setError(null)
    const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/fork`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ target: 'cloud' }),
    }).catch(() => null)
    setLoading(false)

    if (!res?.ok) { setError('Não foi possível fazer o fork.'); return }
    const json = await res.json().catch(() => null) as { mode?: string; id?: string } | null
    if (json?.mode === 'cloud' && json.id) {
      router.push(`/project/${json.id}/edit`)
    } else {
      setError('Resposta inesperada do servidor.')
    }
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        disabled={loading}
        onClick={() => void handleFork()}
        className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 hover:border-slate-700 px-3 py-2.5 text-sm font-semibold text-slate-200 transition-colors disabled:opacity-60"
      >
        <IconFork />
        {loading ? 'Fazendo fork...' : 'Fazer fork'}
      </button>
      {error && <p className="text-xs text-red-300 text-center">{error}</p>}
    </div>
  )
}
```

- [ ] **Verificar lint:** nenhum erro esperado.

- [ ] **Commit:**
```bash
git add components/community/ForkButton.tsx
git commit -m "feat: add ForkButton with post-login pending action support"
```

---

## Task 4: Criar ProjectSidebar

**Arquivos:**
- Criar: `components/community/ProjectSidebar.tsx`

- [ ] **Criar o arquivo com o conteúdo abaixo:**

```tsx
'use client'

import Link from 'next/link'
import { LikeButton } from './LikeButton'
import { BookmarkButton } from './BookmarkButton'
import { CommentsPanel } from './CommentsPanel'
import { ForkButton } from './ForkButton'

interface ProjectSidebarProps {
  projectId: string
  projectName: string
  projectDescription: string
  ownerUsername: string
  ownerName: string | null
  ownerImage: string | null
  commentCount: number
}

function initials(label: string): string {
  const parts = label.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?'
}

function IconBack() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M19 12H5M11 6l-6 6 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function ProjectSidebar({
  projectId,
  projectName,
  projectDescription,
  ownerUsername,
  ownerName,
  ownerImage,
  commentCount,
}: ProjectSidebarProps) {
  const ownerLabel = ownerName?.trim() || `@${ownerUsername}`

  return (
    <div className="flex flex-col h-full">
      {/* Voltar */}
      <div className="px-5 pt-5 pb-4 border-b border-slate-800 shrink-0">
        <Link
          href="/home?section=community"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          <IconBack />
          Voltar para comunidade
        </Link>
      </div>

      {/* Conteúdo com scroll */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
        {/* Autor */}
        <Link href={`/u/@${ownerUsername}`} className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-full bg-slate-800 ring-1 ring-slate-700 overflow-hidden shrink-0 flex items-center justify-center">
            {ownerImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={ownerImage} alt={ownerLabel} className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs font-bold text-slate-300">{initials(ownerLabel)}</span>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-200 group-hover:text-amber-400 transition-colors truncate">
              {ownerLabel}
            </p>
            <p className="text-xs text-slate-500">@{ownerUsername}</p>
          </div>
        </Link>

        {/* Meta do projeto */}
        <div className="space-y-2">
          <h1 className="text-lg font-bold text-slate-100 leading-snug">{projectName}</h1>
          {projectDescription && (
            <p className="text-sm text-slate-400 leading-relaxed">{projectDescription}</p>
          )}
        </div>

        {/* Ações sociais */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <LikeButton projectId={projectId} />
            <BookmarkButton projectId={projectId} />
          </div>
          <ForkButton projectId={projectId} />
        </div>

        {/* Divisor */}
        <div className="h-px bg-slate-800" />

        {/* Comentários */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-300">
            {commentCount > 0 ? `Comentários (${commentCount})` : 'Comentários'}
          </h2>
          <CommentsPanel projectId={projectId} />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Verificar lint:** nenhum erro esperado.

- [ ] **Commit:**
```bash
git add components/community/ProjectSidebar.tsx
git commit -m "feat: add ProjectSidebar for community project view"
```

---

## Task 5: Refatorar a view page com layout split

**Arquivos:**
- Modificar: `app/project/[id]/view/page.tsx`

- [ ] **Substituir o conteúdo por:**

```tsx
import { notFound } from 'next/navigation'
import { getGameData } from '@/lib/gameData'
import { FactoryEditor } from '@/components/FactoryEditor'
import { ProjectSidebar } from '@/components/community/ProjectSidebar'
import { prisma } from '@/lib/server/prisma'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ViewPage({ params }: Props) {
  const { id } = await params

  const [gameData, project] = await Promise.all([
    getGameData(),
    prisma.project.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        visibility: true,
        owner: { select: { username: true, name: true, image: true } },
        _count: { select: { likes: true, comments: true } },
      },
    }),
  ])

  if (!project || project.visibility !== 'COMMUNITY') return notFound()

  const { machines, recipes, parts, multiMachines } = gameData

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="flex-1 min-w-0 h-full">
        <FactoryEditor
          machines={machines}
          recipes={recipes}
          parts={parts}
          multiMachines={multiMachines}
          projectId={id}
          readOnly
        />
      </div>
      <div className="w-[360px] shrink-0 h-full border-l border-slate-800 bg-slate-900">
        <ProjectSidebar
          projectId={id}
          projectName={project.name}
          projectDescription={project.description ?? ''}
          ownerUsername={project.owner?.username ?? 'usuario'}
          ownerName={project.owner?.name ?? null}
          ownerImage={project.owner?.image ?? null}
          commentCount={project._count.comments}
        />
      </div>
    </div>
  )
}
```

- [ ] **Verificar lint:** nenhum erro esperado.

- [ ] **Commit:**
```bash
git add app/project/[id]/view/page.tsx
git commit -m "feat: refactor view page to split-view layout with ProjectSidebar"
```

---

## Task 6: Remover CommunityPanel

**Arquivos:**
- Modificar: `components/FactoryEditor.tsx`
- Deletar: `components/panels/CommunityPanel.tsx`

- [ ] **Em `components/FactoryEditor.tsx`, remover a linha de import:**
```ts
import { CommunityPanel } from '@/components/panels/CommunityPanel'
```

- [ ] **No mesmo arquivo, remover o JSX que usa CommunityPanel (buscar por `CommunityPanel`):**
```tsx
{readOnly && projectId && (
  <CommunityPanel projectId={projectId} />
)}
```

- [ ] **Deletar o arquivo `components/panels/CommunityPanel.tsx`.**

- [ ] **Verificar lint em `components/FactoryEditor.tsx`:** nenhum erro esperado.

- [ ] **Commit:**
```bash
git add components/FactoryEditor.tsx
git rm components/panels/CommunityPanel.tsx
git commit -m "refactor: remove CommunityPanel, interactions moved to ProjectSidebar"
```

---

## Self-review

**Spec coverage:**
- Layout split (canvas 70% / sidebar 30%): Task 5 ✓
- Sidebar: voltar, autor, nome, descrição, ações, comentários: Task 4 ✓
- Fork cloud com gate de login: Task 3 ✓
- pendingAction no uiStore: Task 1 ✓
- AppShell executa fork após login: Task 2 ✓
- CommunityPanel removido: Task 6 ✓

**Placeholders:** nenhum.

**Type consistency:**
- `PendingAction` definido em Task 1, referenciado em Task 2 e Task 3 via `useUiStore` — consistente.
- `ProjectSidebarProps` definido em Task 4, usado em Task 5 — props batem.
- `ForkButton` espera `{ projectId: string }`, Task 4 passa `projectId={projectId}` — consistente.
- Fork route retorna `{ mode: 'cloud', id: string }`, Task 3 e Task 2 checam `json.mode === 'cloud' && json.id` — consistente.
