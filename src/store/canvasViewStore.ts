import { create } from 'zustand'

interface CanvasViewStore {
  fitRequestToken: number
  centerRequestToken: number
  requestFitView: () => void
  requestCenterSelected: () => void
}

export const useCanvasViewStore = create<CanvasViewStore>()((set) => ({
  fitRequestToken: 0,
  centerRequestToken: 0,
  requestFitView: () => {
    set((state) => ({ fitRequestToken: state.fitRequestToken + 1 }))
  },
  requestCenterSelected: () => {
    set((state) => ({ centerRequestToken: state.centerRequestToken + 1 }))
  },
}))

