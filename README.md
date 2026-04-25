<div align="center">
  <img src="docs/screenshots/banner.png" alt="Satisfactory Factory Planner" width="100%" />
</div>

### 🏭 Planeje suas fábricas de Satisfactory visualmente

<div align="center">

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38BDF8?logo=tailwindcss)](https://tailwindcss.com/)
[![@xyflow/react](https://img.shields.io/badge/@xyflow-12-FF0072)](https://reactflow.dev/)

</div>

**Satisfactory Factory Planner** é um editor visual de cadeias de produção para
o jogo *Satisfactory*. Monte sua linha de montagem arrastando máquinas,
conectando esteiras e tubulações, e veja taxas, eficiência e consumo de energia
calculados em tempo real — tudo direto no navegador, sem backend.

- 🧩 **Editor de grafo interativo** — arraste, conecte e configure nós
- ⚡ **Cálculo de fluxo em tempo real** — taxas, eficiência e energia
- 🪄 **Magic Planner Wizard** — gera cadeias de produção automaticamente
- 💾 **Múltiplos projetos** — tudo salvo localmente, sem login
- 🖼️ **Exportação para PNG** — compartilhe seus blueprints

---

## 🎬 Demo

> **Vídeo de demonstração**
>
> https://github.com/user-attachments/assets/PLACEHOLDER-VIDEO-ID
>
> *Para hospedar: arraste o `.mp4` numa issue, PR ou comentário do GitHub —
> ele gera uma URL `user-attachments` que você cola aqui.*

<div align="center">
  <img src="docs/screenshots/demo.gif" alt="Demo do editor em ação" width="85%" />
</div>

---

## ✨ Funcionalidades

### Editor de grafo

<div align="center">
  <img src="docs/screenshots/editor.png" alt="Editor de grafo" width="85%" />
</div>

- Nós suportados: **Máquinas**, **Splitters**, **Mergers**, **Storage**, **Texto** e **Frames**
- Conexões coloridas por eficiência: verde ≥ 100%, amarelo 50–99%, vermelho < 50%
- Atalhos de teclado, **undo / redo**, **auto-save** e clipboard interno
- Menu de contexto e busca rápida para inserir novos nós

### Configuração de máquina

<div align="center">
  <img src="docs/screenshots/machine-config.png" alt="Popup de configuração de máquina" width="60%" />
</div>

- **Clock speed** de `0.01` a `2.5` (fórmula oficial: `P = P_base × clockSpeed^1.322`)
- Quantidade de máquinas manual ou calculada automaticamente
- Variantes de minerador (Mk.1 / Mk.2 / Mk.3) e sobreposição de saídas
- Receitas alternativas filtradas por máquina

### Magic Planner Wizard

<div align="center">
  <img src="docs/screenshots/magic-planner.png" alt="Magic Planner Wizard" width="60%" />
</div>

Escolha uma peça-alvo e uma taxa desejada — o wizard monta a cadeia de
produção inteira, do recurso bruto até o item final.

### Painel de projetos

- Múltiplos projetos no mesmo navegador
- Renomear, duplicar e excluir
- Persistência em `localStorage` — nada sai do seu computador

---

## 🚀 Começando

### Pré-requisitos

- **Node.js** ≥ 18 (testado em v24)
- **npm**

### Instalação

```bash
git clone https://github.com/<seu-usuario>/satisfactory-planner.git
cd satisfactory-planner
npm install
npm run dev
```

Abra **http://localhost:3000** no navegador.

### Scripts disponíveis

| Comando | Descrição |
|---|---|
| `npm run dev` | Servidor de desenvolvimento (hot reload) |
| `npm run build` | Build de produção |
| `npm run start` | Serve o build de produção |
| `npm run cli` | Extrator de dados do jogo (não faz parte do app web) |

---

## 🏗️ Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19 + Tailwind CSS 4 |
| Grafo visual | [@xyflow/react](https://reactflow.dev/) 12 |
| Estado global | Zustand 5 |
| Linguagem | TypeScript 6 (`strict`) |
| Runtime | Node.js |

---

## 📁 Estrutura

```
├── app/                  # Rotas Next.js (App Router)
├── components/
│   ├── nodes/            # Nós do grafo (Machine, Splitter, Merger, Storage, Text, Frame)
│   ├── panels/           # Painéis flutuantes (busca, contexto, Magic Planner, projetos)
│   ├── layout/           # Wrappers de layout
│   └── FactoryEditor.tsx # Compositor principal do canvas
├── lib/
│   ├── types/            # Interfaces e tipos TypeScript
│   ├── hooks/            # Custom hooks reutilizáveis
│   ├── utils/            # Funções puras (export, cálculo de fluxo)
│   ├── gameData.ts       # Loader server-side
│   └── flowCalc.ts       # Fonte única de verdade dos cálculos
├── store/                # Stores Zustand (factory, projects)
├── data/
│   ├── game/             # game_data.json (já parseado)
│   ├── Docs/             # JSONs de idioma do jogo
│   └── scripts/          # Scripts de extração
├── scripts/              # CLI de extração (fora do app)
└── public/               # Assets estáticos
```

Convenções detalhadas em [CLAUDE.md](CLAUDE.md).

---

## 🎮 Dados do jogo

Os dados em `data/game/game_data.json` são extraídos dos arquivos oficiais
exportados por [@satisfactory-dev/docs.json.ts](https://www.npmjs.com/package/@satisfactory-dev/docs.json.ts).
Para regenerar:

```bash
npm run cli
```

O escopo cobre máquinas, receitas (incluindo alternativas), itens, prédios e
metadados de potência/tier.

---

## 🤝 Contribuindo

Pull requests são bem-vindos! Antes de abrir um PR:

1. Leia [CLAUDE.md](CLAUDE.md) — convenções de código, paleta de cores e organização de pastas
2. Mantenha componentes ≤ 150 linhas e hooks ≤ 80 linhas
3. Tipos sempre em `lib/types/`, nunca inline
4. Mensagens de commit em inglês, no imperativo

---

## 📄 Licença

Distribuído sob a **GNU General Public License v3.0** (ou posterior).
Veja [LICENSE](LICENSE) para o texto completo.

> Este projeto **não é afiliado** à Coffee Stain Studios. *Satisfactory* é
> marca registrada de seus respectivos donos.

---

## 🔗 Links

- [Satisfactory (jogo oficial)](https://www.satisfactorygame.com/)
- [@xyflow/react — biblioteca do grafo](https://reactflow.dev/)
- [Issues](https://github.com/<seu-usuario>/satisfactory-planner/issues)
