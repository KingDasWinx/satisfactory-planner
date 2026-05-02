# UI/UX Refactor — Design Spec

## Objetivo

Corrigir todos os problemas de UI e UX identificados na auditoria de 01/05/2026:
navegação quebrada entre rotas, inconsistências de ícones, indicadores de estado faltando,
componentes órfãos, e incoerências de layout entre páginas irmãs.

## Arquitetura

### AppShell (novo)

`components/layout/AppShell.tsx` — wrapper client-side que renderiza uma **topbar de 48 px**
em todas as rotas não-canvas (`/home`, `/me`, `/u/[username]`).

Conteúdo da topbar:
- **Esquerda:** `IconFactory` (SVG novo, amber-500) + "Satisfactory Planner"
- **Centro:** vazio (reservado)
- **Direita:** avatar/nome do usuário → navega para `/u/@username` ou abre `LoginModal` se não autenticado

A sidebar da home (`w-56`, `Sidebar` dentro de `HomeClient`) continua existindo e é
complementar à topbar — apenas navegação interna de `/home`.

Layouts de rota que adotam o AppShell:
- `app/home/layout.tsx` — já existe, recebe `<AppShell>`
- `app/me/layout.tsx` — novo, `<AppShell>`
- `app/(profile)/layout.tsx` — novo grupo de rota; move `app/u/` para dentro dele

### isDirty no factoryStore

`store/factoryStore.ts` ganha flag `isDirty: boolean` (padrão `false`).
- Setada `true` em toda ação que muta nós/arestas.
- Setada `false` após auto-save bem-sucedido.
- `FactoryEditor` passa `isSaved={!isDirty}` para `ToolsBar` (remove o `true` hardcoded).

## Alterações por arquivo

| Arquivo | Tipo | O que muda |
|---|---|---|
| `components/layout/AppShell.tsx` | novo | topbar 48px |
| `app/home/layout.tsx` | editar | envolve com AppShell |
| `app/me/layout.tsx` | novo | envolve com AppShell |
| `app/(profile)/layout.tsx` | novo | envolve com AppShell |
| `app/(profile)/u/[username]/page.tsx` | mover | sai de `app/u/` |
| `components/home/HomeClient.tsx` | editar | logo troca para IconFactory; Comunidade troca para IconGlobe |
| `components/panels/ToolsBar.tsx` | editar | SVGs em todos os botões de ferramenta |
| `store/factoryStore.ts` | editar | flag isDirty |
| `components/FactoryEditor.tsx` | editar | passa `isSaved={!isDirty}` |
| `components/user/PublicProfileHeader.tsx` | editar | remove botão "Editar perfil" do banner; nível 1 visível |
| `app/me/page.tsx` | editar | botão "Ver meu perfil público" |
| `components/home/HomeClient.tsx` (CommunitySection) | editar | filtro persiste via URL; empty state usa IconGlobe |
| `components/home/UserSection.tsx` | deletar | componente órfão |
| `app/u/[username]/page.tsx` | editar | max-w-5xl |
| `app/me/page.tsx` | editar | max-w-5xl |

## Restrições

- O canvas (`/project/[id]/edit` e `/project/[id]/view`) **não** recebe AppShell — continua com
  `ToolsBar` própria.
- Não alterar `globals.css` para cores novas.
- `app/u/` pode permanecer no mesmo lugar se o grupo de rota `(profile)` criar complexidade
  desnecessária — neste caso apenas envolver com layout simples.

## Critérios de aceitação

1. Navegar de `/home` → "Ver meu perfil" → perfil público → a topbar exibe logo e avatar; clicar no avatar leva de volta.
2. `/me` tem topbar com logo e link de volta para `/home`.
3. ToolsBar mostra SVGs em todos os botões (zero caracteres Unicode como ação primária).
4. Salvar no canvas mostra o indicador de "salvando..." durante o auto-save e retorna ao normal.
5. Filtro `?sort=recent` ou `?sort=top` persiste ao recarregar a página de Comunidade.
6. Nível 1 aparece no badge do perfil público.
7. `UserSection.tsx` não existe mais no repositório.
