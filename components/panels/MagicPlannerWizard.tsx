'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useFactoryStore } from '@/store/factoryStore'
import type { Machine, ParsedRecipe } from '@/lib/types/game'
import { fmt } from '@/lib/utils/format'
import { planMagicChain } from '@/lib/utils/magicPlanner'

type MagicPlannerWizardProps = {
  recipes: ParsedRecipe[]
  machines: Machine[]
}

export function MagicPlannerWizard({ recipes, machines }: MagicPlannerWizardProps) {
  const menu = useFactoryStore((s) => s.menu)
  const closeMenu = useFactoryStore((s) => s.closeMenu)
  const applyMagicPlanner = useFactoryStore((s) => s.applyMagicPlanner)
  const nodes = useFactoryStore((s) => s.nodes)

  const [chosenByPart, setChosenByPart] = useState<Record<string, ParsedRecipe>>({})
  const [activePart, setActivePart] = useState<string | null>(null)
  const autoAppliedRef = useRef(false)

  useEffect(() => {
    if (menu?.type === 'magicWizard') {
      setChosenByPart({})
      setActivePart(null)
      autoAppliedRef.current = false
    }
  }, [menu])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeMenu()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [closeMenu])

  const targetNode = useMemo(() => {
    if (!menu || menu.type !== 'magicWizard') return null
    return nodes.find((n) => n.id === menu.nodeId && n.type === 'machineNode') ?? null
  }, [menu, nodes])

  const plan = useMemo(() => {
    if (!targetNode || targetNode.type !== 'machineNode') return null
    const recipe = targetNode.data.recipe
    if (!recipe) return null
    const out = recipe.outputs[0]
    if (!out) return null

    // Target rate: use effective output only when > 0 (machine running with supply).
    // effectiveRates.outputs[0] = 0 means no upstream supply yet, so fall back to the
    // theoretical rate. Using `?? 0` would incorrectly pass 0 to planMagicChain, causing
    // rootMachinesEq = 0 and no parts to be planned.
    const effOut = targetNode.data.effectiveRates?.outputs?.[0]
    const theoretical = (out.amount / recipe.batchTime) * 60 * targetNode.data.nMachines * targetNode.data.clockSpeed
    const targetPerMin = (effOut != null && effOut > 0) ? effOut : theoretical

    return planMagicChain({
      targetRecipe: recipe,
      targetOutputPart: out.part,
      targetOutputPerMin: targetPerMin,
      recipes,
      stopAtRawResources: true,
      chosenByPart,
    })
  }, [targetNode, recipes, chosenByPart])

  // If there are no recipe choices to make, skip the wizard UI and apply immediately.
  useEffect(() => {
    if (!menu || menu.type !== 'magicWizard') return
    if (!plan) return
    if (plan.pendingChoices.length !== 0) return
    if (autoAppliedRef.current) return
    autoAppliedRef.current = true
    applyMagicPlanner({
      targetNodeId: menu.nodeId,
      recipes,
      machines,
      chosenByPart,
    })
  }, [menu, plan, applyMagicPlanner, recipes, machines, chosenByPart])

  useEffect(() => {
    if (!plan) return
    if (plan.pendingChoices.length === 0) {
      setActivePart(null)
      return
    }
    if (activePart && plan.pendingChoices.some((c) => c.part === activePart)) return
    setActivePart(plan.pendingChoices[0].part)
  }, [plan, activePart])

  if (!menu || menu.type !== 'magicWizard') return null
  if (!targetNode || targetNode.type !== 'machineNode' || !plan) return null

  const choice = activePart ? plan.pendingChoices.find((c) => c.part === activePart) : null

  const machineMap = new Map(machines.map((m) => [m.name, m]))
  function resolveMachine(recipeMachineName: string): Machine | undefined {
    return machineMap.get(recipeMachineName) ?? machines.find((m) => m.name.startsWith(recipeMachineName))
  }

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={closeMenu} />
      <div
        className="fixed z-50 w-[520px] max-w-[90vw] rounded-xl border border-slate-700 bg-slate-900 shadow-2xl shadow-black/60"
        style={{ left: Math.min(menu.position.x, window.innerWidth - 540), top: Math.min(menu.position.y, window.innerHeight - 420) }}
      >
        <div className="px-4 py-3 border-b border-slate-700/60 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-amber-200">Magic planner</p>
            <p className="text-xs text-slate-500">Choose recipes when there are alternatives.</p>
          </div>
          <button className="text-slate-400 hover:text-white text-sm" onClick={closeMenu}>✕</button>
        </div>

        <div className="px-4 py-3 space-y-2">
          {choice ? (
            <>
              <p className="text-sm text-slate-200">
                Produzir <span className="text-amber-300 font-semibold">{choice.part}</span>{' '}
                <span className="text-slate-500">({fmt(choice.requiredPerMin)}/m)</span>
              </p>
              <div className="max-h-72 overflow-y-auto rounded-lg border border-slate-800">
                {choice.options.map((r) => {
                  const mach = resolveMachine(r.machine)
                  return (
                    <button
                      key={r.name}
                      onClick={() => setChosenByPart((prev) => ({ ...prev, [choice.part]: r }))}
                      className="w-full text-left px-3 py-2 hover:bg-slate-800 transition-colors border-b border-slate-800 last:border-b-0"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm text-slate-200 font-medium truncate">
                          {r.alternate && <span className="text-purple-400 mr-1 text-xs">★</span>}
                          {r.name}
                        </span>
                        <span className="text-xs text-slate-500 shrink-0">{r.machine}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                        {r.inputs.map((i) => i.part).join(', ') || '—'} → {r.outputs.map((o) => o.part).join(', ')}
                        {mach?.averagePower ? ` · ${mach.averagePower} MW` : ''}
                      </div>
                    </button>
                  )
                })}
              </div>
            </>
          ) : (
            <div className="text-sm text-slate-300">
              <p className="font-medium text-emerald-300">All resolved.</p>
              <p className="text-slate-500 text-xs mt-1">Next step: apply the plan (create nodes and connections).</p>
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-t border-slate-700/60 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Pending: <span className="text-slate-300 font-semibold">{plan.pendingChoices.length}</span>
          </div>
          <button
            disabled={plan.pendingChoices.length > 0}
            className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
              plan.pendingChoices.length > 0
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-amber-500 text-slate-950 hover:bg-amber-400'
            }`}
            onClick={() => {
              if (plan.pendingChoices.length > 0) return
              applyMagicPlanner({
                targetNodeId: menu.nodeId,
                recipes,
                machines,
                chosenByPart,
              })
            }}
          >
            Apply
          </button>
        </div>
      </div>
    </>
  )
}

