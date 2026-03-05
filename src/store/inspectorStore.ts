import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

const STORAGE_KEY = 'sql-canvas-inspector-v1'

export type InspectorTab = 'structure' | 'relations' | 'sql'

interface InspectorStore {
  activeTab: InspectorTab
  setActiveTab: (tab: InspectorTab) => void
}

function sanitizeInspectorTab(value: unknown): InspectorTab {
  if (value === 'structure' || value === 'relations' || value === 'sql') {
    return value
  }

  return 'structure'
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
      merge: (persistedState, currentState) => {
        const parsed = persistedState as Partial<InspectorStore>

        return {
          ...currentState,
          activeTab: sanitizeInspectorTab(parsed.activeTab),
        }
      },
    },
  ),
)
