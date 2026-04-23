'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useFactoryStore } from '@/store/factoryStore'
import type { Machine, ParsedRecipe } from '@/lib/types/game'

type SearchMenuProps = {
  recipes: ParsedRecipe[]
  machines: Machine[]
}

const SPECIAL_NODES = [
  { id: 'splitter', label: 'Splitter', icon: '⑃', description: '1 entrada → 3 saídas' },
  { id: 'merger',  label: 'Merger',  icon: '⑄', description: '3 entradas → 1 saída' },
  { id: 'storage', label: 'Storage', icon: '▤',  description: '1 entrada → 1 saída' },
] as const

const MARGIN = 12 // min distance from viewport edge

export function SearchMenu({ recipes, machines }: SearchMenuProps) {
  const menu = useFactoryStore((s) => s.menu)
  const closeMenu = useFactoryStore((s) => s.closeMenu)
  const addRecipeNode = useFactoryStore((s) => s.addRecipeNode)
  const addSplitterNode = useFactoryStore((s) => s.addSplitterNode)
  const addMergerNode = useFactoryStore((s) => s.addMergerNode)
  const addStorageNode = useFactoryStore((s) => s.addStorageNode)
  const onConnect = useFactoryStore((s) => s.onConnect)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  // Tracks whether the user has manually dragged the menu — if so, skip the auto-clamp on re-renders
  const dragged = useRef(false)
  // Track which menu instance we last clamped — when menu identity changes, reset dragged
  const lastMenuRef = useRef<typeof menu>(null)

  useEffect(() => {
    if (menu) {
      setQuery('')
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [menu])

  // On first open (before drag), clamp to viewport. Skip on subsequent renders if user has dragged.
  useLayoutEffect(() => {
    if (!menu || !menuRef.current) return
    // New menu instance — reset drag state synchronously before visibility check
    if (lastMenuRef.current !== menu) {
      dragged.current = false
      lastMenuRef.current = menu
    }
    if (dragged.current) return
    const el = menuRef.current
    const rect = el.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight

    let x = menu.position.x
    let y = menu.position.y

    if (x + rect.width + MARGIN > vw) x = vw - rect.width - MARGIN
    if (y + rect.height + MARGIN > vh) y = vh - rect.height - MARGIN
    if (x < MARGIN) x = MARGIN
    if (y < MARGIN) y = MARGIN

    el.style.left = `${x}px`
    el.style.top = `${y}px`
    el.style.visibility = 'visible'
  })

  const onDragStart = useCallback((e: React.MouseEvent) => {
    const el = menuRef.current
    if (!el) return
    // Only drag from left mouse button
    if (e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()

    const startX = e.clientX - el.offsetLeft
    const startY = e.clientY - el.offsetTop

    function onMove(ev: MouseEvent) {
      if (!el) return
      const vw = window.innerWidth
      const vh = window.innerHeight
      let x = ev.clientX - startX
      let y = ev.clientY - startY
      x = Math.max(MARGIN, Math.min(vw - el.offsetWidth - MARGIN, x))
      y = Math.max(MARGIN, Math.min(vh - el.offsetHeight - MARGIN, y))
      el.style.left = `${x}px`
      el.style.top = `${y}px`
      dragged.current = true
    }

    function onUp() {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeMenu()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [closeMenu])

  if (!menu) return null

  const machineMap = new Map(machines.map((m) => [m.name, m]))

  function resolveMachine(recipeMachineName: string): Machine | undefined {
    return machineMap.get(recipeMachineName)
      ?? machines.find((m) => m.name.startsWith(recipeMachineName))
  }

  const filteredRecipes = (() => {
    const q = query.toLowerCase()
    if (menu.type === 'input') {
      return recipes
        .filter((r) => r.outputs.some((o) => o.part === menu.inputPart))
        .filter((r) => !q || r.name.toLowerCase().includes(q) || r.machine.toLowerCase().includes(q))
    }
    if (menu.type === 'output') {
      const parts = menu.outputParts
      return recipes
        .filter((r) => r.inputs.some((i) => parts.includes(i.part)))
        .filter((r) => !q || r.name.toLowerCase().includes(q) || r.machine.toLowerCase().includes(q))
    }
    return recipes.filter(
      (r) =>
        !q ||
        r.name.toLowerCase().includes(q) ||
        r.machine.toLowerCase().includes(q) ||
        r.outputs.some((o) => o.part.toLowerCase().includes(q))
    )
  })()

  function getFlowPos(): { x: number; y: number } {
    if (menu!.type === 'canvas') return menu!.flowPosition
    if ('dropFlowPosition' in menu! && menu!.dropFlowPosition) return menu!.dropFlowPosition
    const NODE_WIDTH = 260
    const NODE_GAP = 60
    if (menu!.type === 'input') {
      return { x: menu!.nodeFlowPosition.x - NODE_WIDTH - NODE_GAP, y: menu!.nodeFlowPosition.y }
    }
    return { x: menu!.nodeFlowPosition.x + NODE_WIDTH + NODE_GAP, y: menu!.nodeFlowPosition.y }
  }

  function selectSpecialNode(nodeId: 'splitter' | 'merger' | 'storage') {
    const flowPos = getFlowPos()
    const newNodeId =
      nodeId === 'splitter' ? addSplitterNode(flowPos) :
      nodeId === 'merger'   ? addMergerNode(flowPos)   :
                              addStorageNode(flowPos)

    if (menu!.type === 'input') {
      onConnect({ source: newNodeId, sourceHandle: 'out-0', target: menu!.nodeId, targetHandle: menu!.handleId })
    } else if (menu!.type === 'output') {
      onConnect({ source: menu!.nodeId, sourceHandle: menu!.handleId, target: newNodeId, targetHandle: 'in-0' })
    }

    closeMenu()
  }

  function selectRecipe(recipe: ParsedRecipe) {
    const machine = resolveMachine(recipe.machine)
    if (!machine) return

    const flowPos = getFlowPos()
    const newNodeId = addRecipeNode(recipe, machine, flowPos)

    if (menu!.type === 'input') {
      const outHandleIndex = recipe.outputs.findIndex((o) => o.part === menu!.inputPart)
      onConnect({
        source: newNodeId,
        sourceHandle: `out-${outHandleIndex >= 0 ? outHandleIndex : 0}`,
        target: menu!.nodeId,
        targetHandle: menu!.handleId,
      })
    } else if (menu!.type === 'output') {
      const parts = menu!.outputParts
      const inHandleIndex = recipe.inputs.findIndex((i) => parts.includes(i.part))
      onConnect({
        source: menu!.nodeId,
        sourceHandle: menu!.handleId,
        target: newNodeId,
        targetHandle: `in-${inHandleIndex >= 0 ? inHandleIndex : 0}`,
      })
    }

    closeMenu()
  }

  const title =
    menu.type === 'input'
      ? `Produtores de "${menu.inputPart}"`
      : menu.type === 'output'
      ? menu.outputParts.length > 1
        ? `Consumidores de ${menu.outputParts.slice(0, 2).map(p => `"${p}"`).join(', ')}${menu.outputParts.length > 2 ? '…' : ''}`
        : `Consumidores de "${menu.outputPart}"`
      : 'Adicionar receita'

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={closeMenu} />

      {/* Menu — starts hidden; useLayoutEffect clamps position and makes it visible */}
      <div
        ref={menuRef}
        className="fixed z-50 rounded-xl border border-slate-700 bg-slate-900 shadow-2xl shadow-black/60 flex flex-col"
        style={{ left: menu.position.x, top: menu.position.y, visibility: 'hidden' }}
      >
        {/* Drag handle */}
        <div
          onMouseDown={onDragStart}
          className="h-5 rounded-t-xl flex items-center justify-center cursor-grab active:cursor-grabbing select-none border-b border-slate-700/50 bg-slate-800/40 shrink-0"
        >
          <div className="flex gap-1">
            <span className="w-1 h-1 rounded-full bg-slate-600" />
            <span className="w-1 h-1 rounded-full bg-slate-600" />
            <span className="w-1 h-1 rounded-full bg-slate-600" />
            <span className="w-1 h-1 rounded-full bg-slate-600" />
            <span className="w-1 h-1 rounded-full bg-slate-600" />
            <span className="w-1 h-1 rounded-full bg-slate-600" />
          </div>
        </div>

        {/* Content row */}
        <div className="flex">
        {/* Left sidebar — logistics nodes */}
        <div className="w-28 border-r border-slate-700 flex flex-col pt-2 pb-2">
          <p className="text-[10px] text-slate-500 font-semibold px-2 mb-1 uppercase tracking-wide">Logística</p>
          {SPECIAL_NODES.map((node) => (
            <button
              key={node.id}
              onClick={() => selectSpecialNode(node.id)}
              className="flex flex-col items-center gap-1 px-2 py-3 hover:bg-slate-800 transition-colors rounded mx-1"
            >
              <span className="text-2xl text-amber-400">{node.icon}</span>
              <span className="text-xs font-semibold text-slate-300">{node.label}</span>
              <span className="text-[10px] text-slate-500 text-center leading-tight">{node.description}</span>
            </button>
          ))}
        </div>

        {/* Main recipe area */}
        <div className="w-80 flex flex-col">
          <div className="px-4 pt-3 pb-2">
            <p className="text-sm text-amber-400 font-semibold mb-2 truncate" title={title}>{title}</p>
            <input
              ref={inputRef}
              type="text"
              placeholder="Buscar receita ou máquina..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-lg bg-slate-800 border border-slate-600 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="max-h-80 overflow-y-auto pb-2">
            {filteredRecipes.length === 0 && (
              <p className="px-4 py-4 text-sm text-slate-500 text-center">Nenhuma receita encontrada</p>
            )}
            {filteredRecipes.map((recipe) => {
              const machine = resolveMachine(recipe.machine)
              return (
                <button
                  key={recipe.name}
                  onClick={() => selectRecipe(recipe)}
                  className="w-full text-left px-4 py-2.5 hover:bg-slate-800 transition-colors group"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-slate-200 font-medium truncate group-hover:text-white">
                      {recipe.alternate && <span className="text-purple-400 mr-1 text-xs">★</span>}
                      {recipe.name}
                    </span>
                    <span className="text-xs text-slate-500 shrink-0">{recipe.machine}</span>
                  </div>
                  <div className="flex gap-2 mt-0.5 text-xs text-slate-500">
                    <span className="truncate">
                      {recipe.inputs.map((i) => i.part).join(', ') || '—'}
                      {' → '}
                      {recipe.outputs.map((o) => o.part).join(', ')}
                    </span>
                    {machine && machine.averagePower > 0 && (
                      <span className="ml-auto shrink-0">{machine.averagePower} MW</span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
        </div>{/* end content row */}
      </div>
    </>
  )
}
