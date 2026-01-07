import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

const STORAGE_KEY = 'sql-canvas-layout-v1'

const DEFAULT_LEFT_PANE_WIDTH = 260
const DEFAULT_RIGHT_PANE_WIDTH = 400

interface LayoutStore {
  leftPaneWidth: number
  rightPaneWidth: number
  setLeftPaneWidth: (width: number) => void
  setRightPaneWidth: (width: number) => void
  resetPaneWidths: () => void
}

export const useLayoutStore = create<LayoutStore>()(
  persist(
    (set) => ({
      leftPaneWidth: DEFAULT_LEFT_PANE_WIDTH,
      rightPaneWidth: DEFAULT_RIGHT_PANE_WIDTH,
      setLeftPaneWidth: (width) => {
        set({ leftPaneWidth: width })
      },
      setRightPaneWidth: (width) => {
        set({ rightPaneWidth: width })
      },
      resetPaneWidths: () => {
        set({
          leftPaneWidth: DEFAULT_LEFT_PANE_WIDTH,
          rightPaneWidth: DEFAULT_RIGHT_PANE_WIDTH,
        })
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        leftPaneWidth: state.leftPaneWidth,
        rightPaneWidth: state.rightPaneWidth,
      }),
    },
  ),
)

