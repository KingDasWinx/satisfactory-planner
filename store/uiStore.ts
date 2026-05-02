import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Locale } from '@/lib/i18n'

type PendingAction = { type: 'fork'; projectId: string }

interface UiState {
  loginModalOpen: boolean
  openLoginModal: () => void
  closeLoginModal: () => void
  pendingAction: PendingAction | null
  setPendingAction: (action: PendingAction) => void
  clearPendingAction: () => void
  locale: Locale
  setLocale: (locale: Locale) => void
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      loginModalOpen: false,
      openLoginModal: () => set({ loginModalOpen: true }),
      closeLoginModal: () => set({ loginModalOpen: false }),
      pendingAction: null,
      setPendingAction: (action) => set({ pendingAction: action }),
      clearPendingAction: () => set({ pendingAction: null }),
      locale: 'en',
      setLocale: (locale) => set({ locale }),
    }),
    {
      name: 'ui-preferences',
      partialize: (state) => ({ locale: state.locale }),
    }
  )
)
