import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

const STORAGE_KEY = 'sql-canvas-inspector-v1'

export type InspectorTab = 'structure' | 'relations' | 'sql' | 'code'

interface InspectorStore {
  activeTab: InspectorTab
  setActiveTab: (tab: InspectorTab) => void
}

export const useInspectorStore = create<InspectorStore>()(
  persist(
    (set) => ({
      activeTab: 'structure',
      setActiveTab: (tab) => {
        set({ activeTab: tab })
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        activeTab: state.activeTab,
      }),
    },
  ),
)
