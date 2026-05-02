# Community Project View — Design Spec
**Data:** 2026-05-01  
**Status:** Aprovado pelo usuário

---

## Contexto

A página `/project/[id]/view` atualmente exibe apenas o canvas em tela cheia (readOnly) com um `CommunityPanel` flutuante no canto superior direito. O painel sobrepõe o canvas, não exibe metadados do projeto, e a aba "Reações" está vazia.

O objetivo é substituir essa experiência por um layout split-view inspirado em plataformas como Figma Community e GitHub: canvas à esquerda, sidebar de informações e interações à direita.

---

## Layout

A página usa `flex h-screen overflow-hidden`:

- **Esquerda (`flex-1 min-w-0 h-full`):** `FactoryEditor` em modo `readOnly`
- **Direita (`w-[360px] shrink-0 h-full overflow-y-auto border-l border-slate-800 bg-slate-900`):** `ProjectSidebar`

O `CommunityPanel` flutuante existente é **removido**. Toda interação social migra para a sidebar.

---

## Página (`app/project/[id]/view/page.tsx`)

Server component. Responsabilidades:

1. Buscar metadados do projeto no banco:
   ```ts
   prisma.project.findUnique({
     where: { id },
     select: {
       id, name, description, visibility, ownerId,
       owner: { select: { username, name, image } },
       _count: { select: { likes: true, comments: true } },
     },
   })
   ```
2. Se não encontrado ou `visibility !== 'COMMUNITY'` → `notFound()`
3. Renderizar layout split com `ProjectSidebar` recebendo metadados via props

---

## Componente `ProjectSidebar` (`components/community/ProjectSidebar.tsx`)

Client component. Recebe metadados server-rendered via props (sem loading visual no cabeçalho). Busca estado social (liked, bookmarked) client-side nos hooks existentes.

### Estrutura de cima para baixo

1. **Botão "Voltar"** — link para `/home?section=community`
2. **Autor** — avatar + nome + `@username`, link para `/u/@username`
3. **Nome do projeto** — heading `text-lg font-bold`
4. **Descrição** — parágrafo, wraps normalmente
5. **Ações sociais:**
   - `LikeButton` (componente existente)
   - `BookmarkButton` (componente existente)
   - `ForkButton` (novo, ver abaixo)
6. **Comentários** — heading com contagem + `CommentsPanel` (componente existente)

---

## Componente `ForkButton` (`components/community/ForkButton.tsx`)

Client component. Comportamento:

- **Autenticado:** `POST /api/projects/[id]/fork` → recebe `{ id: newId }` → `router.push(/project/[newId]/edit)`
- **Não autenticado:**
  1. `useUiStore().setPendingAction({ type: 'fork', projectId })`
  2. `useUiStore().openLoginModal()`
  3. Após login bem-sucedido, o `AppShell` detecta `pendingAction` e executa o fork automaticamente

Estados internos: `loading`, `error`.

---

## `uiStore` — novos campos

```ts
pendingAction: { type: 'fork'; projectId: string } | null
setPendingAction: (action: { type: 'fork'; projectId: string }) => void
clearPendingAction: () => void
```

O `AppShell` usa `useEffect` no `status` da sessão: quando `status` muda de `'loading'` para `'authenticated'` e há `pendingAction.type === 'fork'`, executa o fork e limpa o estado.

---

## Fluxo completo do fork pós-login

```
Clique em Fork (não autenticado)
  → setPendingAction + openLoginModal
  → usuário faz login/cadastro
  → LoginModal.onClose()
  → AppShell detecta status=authenticated + pendingAction
  → POST /api/projects/[id]/fork
  → router.push /project/[newId]/edit
  → clearPendingAction
```

---

## Arquivos afetados

| Arquivo | Mudança |
|---|---|
| `app/project/[id]/view/page.tsx` | Busca metadados server-side, renderiza layout split |
| `components/community/ProjectSidebar.tsx` | **Novo** — sidebar com autor, meta, ações, comentários |
| `components/community/ForkButton.tsx` | **Novo** — fork com gate de login |
| `components/panels/CommunityPanel.tsx` | **Removido** |
| `store/uiStore.ts` | Adiciona `pendingAction`, `setPendingAction`, `clearPendingAction` |
| `components/layout/AppShell.tsx` | `useEffect` para executar `pendingAction` após login |

---

## O que não muda

- `LikeButton`, `BookmarkButton`, `CommentsPanel` — usados sem alteração
- `FactoryEditor` — não recebe novas props
- API routes de like, bookmark, comments, fork — sem alteração
- Rota `/project/[id]/edit` — sem alteração
