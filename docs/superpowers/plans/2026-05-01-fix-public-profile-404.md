# Fix `/u/@username` 404 (Public Profile) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminar o “404 This page could not be found” ao abrir perfis públicos em `/u/@username`, garantindo navegação estável e dados consistentes entre sessão, DB e rotas.

**Architecture:** A página `app/u/[username]/page.tsx` usa Server Components + Prisma para resolver o usuário e renderizar o perfil; navegação cliente usa `router.push('/u/@username')`. Diagnóstico deve separar “404 do Next (route missing)” de “404 por `notFound()` (usuário não existe / normalização falhou)”.

**Tech Stack:** Next.js App Router, Auth.js (JWT), Prisma v7 + Postgres, TypeScript strict.

---

## Hipóteses iniciais (como debugar com evidência)

- **H1:** `normalizeUsername(cleaned)` retorna `null` por caracteres inesperados no segmento da URL (encoding/`@`/casos edge), disparando `notFound()`.
- **H2:** O usuário não existe no Postgres para `usernameNorm` (cadastro/sessão divergente), então `prisma.user.findUnique` retorna `null` e dispara `notFound()`.
- **H3:** O segmento dinâmico `[username]` não está chegando como esperado na rota (ex.: `%40`, duplo `@`, etc.).
- **H4:** `GET /api/users/[username]` também não encontra o usuário (confirma H2 vs problema só na página).

---

## Instrumentação (sessão debug)

Arquivos instrumentados (logs NDJSON via ingest):

- `app/u/[username]/page.tsx`
- `app/api/users/[username]/route.ts`
- `components/home/UserSection.tsx`

Log file local (workspace): `debug-78abc6.log`

---

## Tasks

### Task 1: Capturar evidência (pre-fix)

**Files:**
- Modify: `app/u/[username]/page.tsx`
- Modify: `app/api/users/[username]/route.ts`
- Modify: `components/home/UserSection.tsx`

- [ ] **Step 1:** Limpar `debug-78abc6.log` antes do run (delete_file).
- [ ] **Step 2:** Reproduzir o problema (dev server) e coletar logs.

---

### Task 2: Corrigir causa raiz com base nos logs

**Files (dependem do resultado):**
- Provável modify: `components/home/UserSection.tsx` (normalizar URL para `/u/username` sem `@` no path **ou** garantir encoding consistente)
- Provável modify: `components/user/PublicProfileHeader.tsx`, `components/user/FollowersList.tsx`, `components/user/FollowingList.tsx` (links)
- Provável modify: `lib/server/auth.ts` (garantir `session.user.username` sempre presente quando existir no DB)

- [ ] **Step 1:** Implementar correção mínima provada pelos logs.
- [ ] **Step 2:** Rodar `npm test` e `npm run build`.

---

### Task 3: Verificação pós-fix (logs)

- [ ] **Step 1:** Rodar novamente com `runId=post-fix` nos logs (se necessário) e comparar NDJSON antes/depois.
- [ ] **Step 2:** Remover instrumentação somente após confirmação.

---

## Execution handoff

Plan complete. Escolha a forma de execução:

**1) Subagent-Driven (recommended)**

**2) Inline Execution**
