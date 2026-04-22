'use client'

import { useEffect, useRef, useState } from 'react'
import { useFactoryStore, type MenuContext } from '@/store/factoryStore'
import type { Machine, ParsedRecipe } from '@/lib/gameData'

type SearchMenuProps = {
  recipes: ParsedRecipe[]
  machines: Machine[]
}

export function SearchMenu({ recipes, machines }: SearchMenuProps) {
  const { menu, closeMenu, addRecipeNode, onConnect } = useFactoryStore()
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (menu) {
      setQuery('')
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [menu])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeMenu()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [closeMenu])

  if (!menu) return null

  const machineMap = new Map(machines.map((m) => [m.name, m]))

  // Recipes use short names like "Miner" but machines are "Miner Mk.1/2/3"
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
      return recipes
        .filter((r) => r.inputs.some((i) => i.part === menu.outputPart))
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

  function selectRecipe(recipe: ParsedRecipe) {
    const machine = resolveMachine(recipe.machine)
    if (!machine) return

    const NODE_WIDTH = 260
    const NODE_GAP = 60
    const flowPos =
      menu!.type === 'canvas'
        ? menu!.flowPosition
        : menu!.dropFlowPosition
        ? menu!.dropFlowPosition
        : menu!.type === 'input'
        ? { x: menu!.nodeFlowPosition.x - NODE_WIDTH - NODE_GAP, y: menu!.nodeFlowPosition.y }
        : { x: menu!.nodeFlowPosition.x + NODE_WIDTH + NODE_GAP, y: menu!.nodeFlowPosition.y }

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
      const inHandleIndex = recipe.inputs.findIndex((i) => i.part === menu!.outputPart)
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
      ? `Consumidores de "${menu.outputPart}"`
      : 'Adicionar receita'

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={closeMenu} />

      {/* Menu */}
      <div
        className="fixed z-50 w-72 rounded-xl border border-slate-700 bg-slate-900 shadow-2xl shadow-black/60"
        style={{ left: menu.position.x, top: menu.position.y }}
      >
        <div className="px-3 pt-3 pb-2">
          <p className="text-xs text-amber-400 font-semibold mb-2">{title}</p>
          <input
            ref={inputRef}
            type="text"
            placeholder="Buscar receita ou máquina..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-lg bg-slate-800 border border-slate-600 px-3 py-1.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="max-h-72 overflow-y-auto pb-2">
          {filteredRecipes.length === 0 && (
            <p className="px-3 py-4 text-xs text-slate-500 text-center">Nenhuma receita encontrada</p>
          )}
          {filteredRecipes.map((recipe) => {
            const machine = resolveMachine(recipe.machine)
            return (
              <button
                key={recipe.name}
                onClick={() => selectRecipe(recipe)}
                className="w-full text-left px-3 py-2 hover:bg-slate-800 transition-colors group"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-slate-200 font-medium truncate group-hover:text-white">
                    {recipe.alternate && <span className="text-purple-400 mr-1 text-xs">★</span>}
                    {recipe.name}
                  </span>
                  <span className="text-xs text-slate-500 shrink-0">{recipe.machine}</span>
                </div>
                <div className="flex gap-2 mt-0.5 text-xs text-slate-500">
                  <span>
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
    </>
  )
}
