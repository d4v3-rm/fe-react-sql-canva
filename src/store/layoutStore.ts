import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

const STORAGE_KEY = 'sql-canvas-layout-v1'

const DEFAULT_LEFT_PANE_WIDTH = 260
const DEFAULT_RIGHT_PANE_WIDTH = 400

export type PaneId = 'left' | 'center' | 'right'

interface LayoutStore {
  leftPaneWidth: number
  rightPaneWidth: number
  leftCollapsed: boolean
  centerCollapsed: boolean
  rightCollapsed: boolean
  maximizedPane: PaneId | null
  setLeftPaneWidth: (width: number) => void
  setRightPaneWidth: (width: number) => void
  togglePaneCollapsed: (pane: PaneId) => void
  setPaneCollapsed: (pane: PaneId, collapsed: boolean) => void
  togglePaneMaximized: (pane: PaneId) => void
  clearMaximizedPane: () => void
  resetPaneWidths: () => void
}

export const useLayoutStore = create<LayoutStore>()(
  persist(
    (set) => ({
      leftPaneWidth: DEFAULT_LEFT_PANE_WIDTH,
      rightPaneWidth: DEFAULT_RIGHT_PANE_WIDTH,
      leftCollapsed: false,
      centerCollapsed: false,
      rightCollapsed: false,
      maximizedPane: null,
      setLeftPaneWidth: (width) => {
        set({ leftPaneWidth: width })
      },
      setRightPaneWidth: (width) => {
        set({ rightPaneWidth: width })
      },
      togglePaneCollapsed: (pane) => {
        set((state) => {
          if (pane === 'left') {
            return {
              leftCollapsed: !state.leftCollapsed,
              maximizedPane: state.maximizedPane === 'left' ? null : state.maximizedPane,
            }
          }

          if (pane === 'center') {
            return {
              centerCollapsed: !state.centerCollapsed,
              maximizedPane: state.maximizedPane === 'center' ? null : state.maximizedPane,
            }
          }

          return {
            rightCollapsed: !state.rightCollapsed,
            maximizedPane: state.maximizedPane === 'right' ? null : state.maximizedPane,
          }
        })
      },
      setPaneCollapsed: (pane, collapsed) => {
        set((state) => {
          if (pane === 'left') {
            return {
              leftCollapsed: collapsed,
              maximizedPane: state.maximizedPane === 'left' && collapsed ? null : state.maximizedPane,
            }
          }

          if (pane === 'center') {
            return {
              centerCollapsed: collapsed,
              maximizedPane: state.maximizedPane === 'center' && collapsed ? null : state.maximizedPane,
            }
          }

          return {
            rightCollapsed: collapsed,
            maximizedPane: state.maximizedPane === 'right' && collapsed ? null : state.maximizedPane,
          }
        })
      },
      togglePaneMaximized: (pane) => {
        set((state) => {
          const nextMaximized = state.maximizedPane === pane ? null : pane

          return {
            maximizedPane: nextMaximized,
            leftCollapsed: pane === 'left' ? false : state.leftCollapsed,
            centerCollapsed: pane === 'center' ? false : state.centerCollapsed,
            rightCollapsed: pane === 'right' ? false : state.rightCollapsed,
          }
        })
      },
      clearMaximizedPane: () => {
        set({ maximizedPane: null })
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
        leftCollapsed: state.leftCollapsed,
        centerCollapsed: state.centerCollapsed,
        rightCollapsed: state.rightCollapsed,
        maximizedPane: state.maximizedPane,
      }),
    },
  ),
)
