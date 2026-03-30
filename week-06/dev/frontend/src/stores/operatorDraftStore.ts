import { create } from 'zustand'

export type OperatorDraft = {
  name: string
  metadataURI: string
  startAt: string
  endAt: string
  minTier: string
  maxTier: string
}

type OperatorDraftState = {
  draft: OperatorDraft
  setDraftField: <K extends keyof OperatorDraft>(
    field: K,
    value: OperatorDraft[K],
  ) => void
  resetDraft: () => void
}

const initialDraft: OperatorDraft = {
  name: '',
  metadataURI: '',
  startAt: '',
  endAt: '',
  minTier: '0',
  maxTier: '3',
}

export const useOperatorDraftStore = create<OperatorDraftState>((set) => ({
  draft: initialDraft,
  setDraftField: (field, value) =>
    set((state) => ({
      draft: {
        ...state.draft,
        [field]: value,
      },
    })),
  resetDraft: () => set({ draft: initialDraft }),
}))
