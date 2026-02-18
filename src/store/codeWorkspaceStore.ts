import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export interface CodeWorkspaceFile {
  path: string
  content: string
}

interface CodeWorkspaceStore {
  files: Record<string, string>
  folders: string[]
  generatedSnapshot: Record<string, string>
  selectedFile: string
  expandedFolders: Record<string, boolean>
  syncGeneratedFiles: (generatedFiles: CodeWorkspaceFile[]) => void
  createFile: (path: string, initialContent?: string) => void
  updateFileContent: (path: string, content: string) => void
  addFolder: (path: string) => void
  setSelectedFile: (path: string) => void
  setExpandedFolder: (path: string, expanded: boolean) => void
  syncExpandedFolders: (validPaths: string[]) => void
}

const STORAGE_KEY = 'sql-canvas-code-workspace-v1'

function sortObjectKeys(record: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(record).sort(([left], [right]) => left.localeCompare(right)))
}

function dedupeFolders(paths: string[]): string[] {
  const seen = new Set<string>()
  const next: string[] = []

  paths.forEach((path) => {
    if (!path) {
      return
    }

    if (seen.has(path)) {
      return
    }

    seen.add(path)
    next.push(path)
  })

  return next.sort((left, right) => left.localeCompare(right))
}

function firstPath(record: Record<string, string>): string {
  return Object.keys(record)
    .sort((left, right) => left.localeCompare(right))[0] ?? ''
}

function areStringRecordsEqual(left: Record<string, string>, right: Record<string, string>): boolean {
  const leftKeys = Object.keys(left)
  const rightKeys = Object.keys(right)

  if (leftKeys.length !== rightKeys.length) {
    return false
  }

  return leftKeys.every((key) => right[key] === left[key])
}

function areBooleanRecordsEqual(left: Record<string, boolean>, right: Record<string, boolean>): boolean {
  const leftKeys = Object.keys(left)
  const rightKeys = Object.keys(right)

  if (leftKeys.length !== rightKeys.length) {
    return false
  }

  return leftKeys.every((key) => right[key] === left[key])
}

function areStringArraysEqual(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false
  }

  return left.every((value, index) => right[index] === value)
}

export const useCodeWorkspaceStore = create<CodeWorkspaceStore>()(
  persist(
    (set) => ({
      files: {},
      folders: [],
      generatedSnapshot: {},
      selectedFile: '',
      expandedFolders: { '': true },
      syncGeneratedFiles: (generatedFiles) => {
        set((state) => {
          const generatedMap = sortObjectKeys(Object.fromEntries(generatedFiles.map((file) => [file.path, file.content])))
          const generatedPaths = new Set(Object.keys(generatedMap))
          const nextFiles = { ...state.files }
          const nextSnapshot = { ...state.generatedSnapshot }

          Object.entries(generatedMap).forEach(([path, content]) => {
            const existingContent = state.files[path]
            const previousGenerated = state.generatedSnapshot[path]

            if (existingContent === undefined || (previousGenerated !== undefined && existingContent === previousGenerated)) {
              nextFiles[path] = content
            }

            nextSnapshot[path] = content
          })

          Object.keys(state.generatedSnapshot).forEach((path) => {
            if (generatedPaths.has(path)) {
              return
            }

            const previousGenerated = state.generatedSnapshot[path]
            if (nextFiles[path] === previousGenerated) {
              delete nextFiles[path]
            }

            delete nextSnapshot[path]
          })

          const orderedFiles = sortObjectKeys(nextFiles)
          const nextSelectedFile = orderedFiles[state.selectedFile] !== undefined ? state.selectedFile : firstPath(orderedFiles)

          if (
            areStringRecordsEqual(state.files, orderedFiles) &&
            areStringRecordsEqual(state.generatedSnapshot, nextSnapshot) &&
            state.selectedFile === nextSelectedFile
          ) {
            return state
          }

          return {
            files: orderedFiles,
            generatedSnapshot: nextSnapshot,
            selectedFile: nextSelectedFile,
          }
        })
      },
      createFile: (path, initialContent = '') => {
        set((state) => {
          if (state.files[path] !== undefined) {
            return state
          }

          const nextFiles = sortObjectKeys({
            ...state.files,
            [path]: initialContent,
          })

          return {
            files: nextFiles,
            selectedFile: path,
          }
        })
      },
      updateFileContent: (path, content) => {
        set((state) => {
          if (state.files[path] === undefined || state.files[path] === content) {
            return state
          }

          return {
            files: {
              ...state.files,
              [path]: content,
            },
          }
        })
      },
      addFolder: (path) => {
        set((state) => {
          const nextFolders = dedupeFolders([...state.folders, path])
          if (areStringArraysEqual(state.folders, nextFolders)) {
            return state
          }

          return {
            folders: nextFolders,
          }
        })
      },
      setSelectedFile: (path) => {
        set((state) => {
          if (state.selectedFile === path) {
            return state
          }

          return { selectedFile: path }
        })
      },
      setExpandedFolder: (path, expanded) => {
        set((state) => {
          if (state.expandedFolders[path] === expanded) {
            return state
          }

          return {
            expandedFolders: {
              ...state.expandedFolders,
              [path]: expanded,
            },
          }
        })
      },
      syncExpandedFolders: (validPaths) => {
        set((state) => {
          const next: Record<string, boolean> = {}
          validPaths.forEach((path) => {
            next[path] = state.expandedFolders[path] ?? true
          })

          if (!Object.prototype.hasOwnProperty.call(next, '')) {
            next[''] = true
          }

          if (areBooleanRecordsEqual(state.expandedFolders, next)) {
            return state
          }

          return {
            expandedFolders: next,
          }
        })
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        files: state.files,
        folders: state.folders,
        generatedSnapshot: state.generatedSnapshot,
        selectedFile: state.selectedFile,
        expandedFolders: state.expandedFolders,
      }),
      merge: (persistedState, currentState) => {
        const parsed = persistedState as Partial<CodeWorkspaceStore>
        const files = sortObjectKeys(parsed.files ?? currentState.files)
        const selectedFile = parsed.selectedFile && files[parsed.selectedFile] !== undefined ? parsed.selectedFile : firstPath(files)

        return {
          ...currentState,
          files,
          folders: dedupeFolders(parsed.folders ?? currentState.folders),
          generatedSnapshot: sortObjectKeys(parsed.generatedSnapshot ?? currentState.generatedSnapshot),
          selectedFile,
          expandedFolders: {
            '': true,
            ...(parsed.expandedFolders ?? currentState.expandedFolders),
          },
        }
      },
    },
  ),
)
