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
