import { create } from 'zustand'

export type ActiveTab = 'operator' | 'user'

type UiState = {
  activeTab: ActiveTab
  selectedRaffleId: bigint | null
  setActiveTab: (tab: ActiveTab) => void
  setSelectedRaffleId: (raffleId: bigint | null) => void
  clearSelection: () => void
}

export const useUiStore = create<UiState>((set) => ({
  activeTab: 'user',
  selectedRaffleId: null,
  setActiveTab: (tab) => set({ activeTab: tab }),
  setSelectedRaffleId: (raffleId) => set({ selectedRaffleId: raffleId }),
  clearSelection: () => set({ selectedRaffleId: null }),
}))
