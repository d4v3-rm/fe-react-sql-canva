import clsx from 'clsx'
import Editor, { useMonaco } from '@monaco-editor/react'
import JSZip from 'jszip'
import { ChevronDown, ChevronRight, Download, FileCode2, FileJson2, Folder, FolderOpen, Maximize2, Minimize2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import { Button } from '@/components/ui/Button'
import { generateSequelizeScaffold } from '@/lib/codegen/generateSequelizeScaffold'
import { downloadBlobFile } from '@/lib/file/textFile'
import { useSchemaStore } from '@/store/schemaStore'
import { useThemeStore } from '@/store/themeStore'

import styles from './CodeStudio.module.scss'

const MONACO_EXTRA_LIBS = `
declare const process: {
  env: Record<string, string | undefined>
}

declare module 'reflect-metadata' {}

declare module 'sequelize' {
  export type CreationOptional<T> = T
  export type InferAttributes<T> = Record<string, unknown>
  export type InferCreationAttributes<T> = Record<string, unknown>
}

declare module 'sequelize-typescript' {
  export class Model<T = unknown> {}
  export class Sequelize {
    constructor(options: Record<string, unknown>)
    authenticate(): Promise<void>
  }
  export const Table: (options?: Record<string, unknown>) => ClassDecorator
  export const Column: (options?: Record<string, unknown>) => PropertyDecorator
  export const DataType: {
    SMALLINT: unknown
    INTEGER: unknown
    BIGINT: unknown
    TEXT: unknown
    BOOLEAN: unknown
    DATEONLY: unknown
    DATE: unknown
    UUID: unknown
    JSONB: unknown
    STRING: (length?: number) => unknown
    DECIMAL: (precision?: number, scale?: number) => unknown
  }
  export const PrimaryKey: PropertyDecorator
  export const AutoIncrement: PropertyDecorator
  export const AllowNull: (value: boolean) => PropertyDecorator
  export const Unique: PropertyDecorator
  export const ForeignKey: (resolver: () => unknown) => PropertyDecorator
  export const BelongsTo: (resolver: () => unknown, options?: Record<string, unknown>) => PropertyDecorator
  export const HasMany: (resolver: () => unknown, options?: Record<string, unknown>) => PropertyDecorator
  export const HasOne: (resolver: () => unknown, options?: Record<string, unknown>) => PropertyDecorator
}

declare module 'class-validator' {
  export const IsOptional: () => PropertyDecorator
  export const IsNotEmpty: () => PropertyDecorator
  export const IsString: () => PropertyDecorator
  export const MaxLength: (value: number) => PropertyDecorator
  export const IsUUID: () => PropertyDecorator
  export const IsInt: () => PropertyDecorator
  export const IsNumber: () => PropertyDecorator
  export const IsBoolean: () => PropertyDecorator
  export const IsDate: () => PropertyDecorator
  export const IsObject: () => PropertyDecorator
}
`

function normalizeArchiveName(raw: string): string {
  return (
    raw
      .trim()
      .replace(/[^a-zA-Z0-9_-]+/g, '-')
      .replace(/-{2,}/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase() || 'sequelize-scaffold'
  )
}

type TreeNodeType = 'folder' | 'file'

interface FileTreeNode {
  type: TreeNodeType
  name: string
  path: string
  children: FileTreeNode[]
}

function sortTree(node: FileTreeNode): void {
  node.children.sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'folder' ? -1 : 1
    }

    return a.name.localeCompare(b.name)
  })

  node.children.forEach((child) => {
    if (child.type === 'folder') {
      sortTree(child)
    }
  })
}

function buildFileTree(paths: string[]): FileTreeNode {
  const root: FileTreeNode = {
    type: 'folder',
    name: '',
    path: '',
    children: [],
  }

  const folderMap = new Map<string, FileTreeNode>([['', root]])

  paths.forEach((filePath) => {
    const segments = filePath.split('/').filter(Boolean)
    let currentParent = root
    let currentPath = ''

    segments.forEach((segment, index) => {
      const isLast = index === segments.length - 1
      const nextPath = currentPath ? `${currentPath}/${segment}` : segment

      if (isLast) {
        currentParent.children.push({
          type: 'file',
          name: segment,
          path: nextPath,
          children: [],
        })
        return
      }

      const existingFolder = folderMap.get(nextPath)
      if (existingFolder) {
        currentParent = existingFolder
        currentPath = nextPath
        return
      }

      const folderNode: FileTreeNode = {
        type: 'folder',
        name: segment,
        path: nextPath,
        children: [],
      }

      folderMap.set(nextPath, folderNode)
      currentParent.children.push(folderNode)
      currentParent = folderNode
      currentPath = nextPath
    })
  })

  sortTree(root)
  return root
}

function collectFolderPaths(node: FileTreeNode, output: string[] = []): string[] {
  if (node.type === 'folder') {
    output.push(node.path)
  }

  node.children.forEach((child) => {
    if (child.type === 'folder') {
      collectFolderPaths(child, output)
    }
  })

  return output
}

function detectEditorLanguage(path: string): 'typescript' | 'json' | 'markdown' {
  if (path.endsWith('.json')) {
    return 'json'
  }

  if (path.endsWith('.md')) {
    return 'markdown'
  }

  return 'typescript'
}

function fileUri(path: string): string {
  return `file:///workspace/${path}`
}

function isFileDirty(path: string, overrides: Record<string, string>, originalContent: string | undefined): boolean {
  if (!Object.prototype.hasOwnProperty.call(overrides, path)) {
    return false
  }

  return overrides[path] !== (originalContent ?? '')
}

export function CodeStudio() {
  const monaco = useMonaco()
  const didSetupMonacoRef = useRef(false)

  const database = useSchemaStore((state) => state.database)
  const tables = useSchemaStore((state) => state.tables)
  const relations = useSchemaStore((state) => state.relations)
  const theme = useThemeStore((state) => state.theme)

  const files = useMemo(
    () =>
      generateSequelizeScaffold({
        database,
        tables,
        relations,
      }),
    [database, relations, tables],
  )

  const fileMap = useMemo(() => new Map(files.map((file) => [file.path, file.content])), [files])
  const treeRoot = useMemo(() => buildFileTree(files.map((file) => file.path)), [files])
  const folderPaths = useMemo(() => collectFolderPaths(treeRoot), [treeRoot])

  const [selectedFile, setSelectedFile] = useState('')
  const [overrides, setOverrides] = useState<Record<string, string>>({})
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({ '': true })
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [exportingArchive, setExportingArchive] = useState(false)

  useEffect(() => {
    if (!monaco || didSetupMonacoRef.current) {
      return
    }

    const tsApi = (monaco.languages as unknown as {
      typescript?: {
        typescriptDefaults: {
          setCompilerOptions: (options: Record<string, unknown>) => void
          setDiagnosticsOptions: (options: Record<string, unknown>) => void
          addExtraLib: (content: string, filePath: string) => void
        }
        ScriptTarget: {
          ES2022: number
        }
        ModuleKind: {
          ESNext: number
        }
        ModuleResolutionKind: {
          NodeJs: number
        }
      }
    }).typescript

    if (!tsApi) {
      return
    }

    tsApi.typescriptDefaults.setCompilerOptions({
      target: tsApi.ScriptTarget.ES2022,
      module: tsApi.ModuleKind.ESNext,
      moduleResolution: tsApi.ModuleResolutionKind.NodeJs,
      strict: true,
      noUnusedLocals: false,
      noUnusedParameters: false,
      noEmit: true,
      skipLibCheck: true,
      esModuleInterop: true,
      allowSyntheticDefaultImports: true,
      experimentalDecorators: true,
    })

    tsApi.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
      noSuggestionDiagnostics: false,
    })

    tsApi.typescriptDefaults.addExtraLib(MONACO_EXTRA_LIBS, 'file:///types/scaffold-libs.d.ts')
    didSetupMonacoRef.current = true
  }, [monaco])

  useEffect(() => {
    if (!selectedFile || !fileMap.has(selectedFile)) {
      setSelectedFile(files[0]?.path ?? '')
    }
  }, [fileMap, files, selectedFile])

  useEffect(() => {
    setExpandedFolders((current) => {
      const next: Record<string, boolean> = {}

      folderPaths.forEach((folderPath) => {
        next[folderPath] = current[folderPath] ?? true
      })

      return next
    })
  }, [folderPaths])

  useEffect(() => {
    setOverrides((current) => {
      const next = Object.fromEntries(Object.entries(current).filter(([path]) => fileMap.has(path)))

      return Object.keys(next).length === Object.keys(current).length ? current : next
    })
  }, [fileMap])

  useEffect(() => {
    if (!monaco) {
      return
    }

    const validUris = new Set(files.map((file) => fileUri(file.path)))

    files.forEach((file) => {
      const uri = monaco.Uri.parse(fileUri(file.path))
      const content = overrides[file.path] ?? file.content
      const language = detectEditorLanguage(file.path)
      const model = monaco.editor.getModel(uri)

      if (!model) {
        monaco.editor.createModel(content, language, uri)
        return
      }

      if (model.getValue() !== content) {
        model.setValue(content)
      }
    })

    monaco.editor.getModels().forEach((model) => {
      const modelUri = model.uri.toString()

      if (modelUri.startsWith('file:///workspace/') && !validUris.has(modelUri)) {
        model.dispose()
      }
    })
  }, [files, monaco, overrides])

  function expandPathToFile(filePath: string) {
    const segments = filePath.split('/').filter(Boolean)

    setExpandedFolders((current) => {
      const next: Record<string, boolean> = { ...current, '': true }
      let runningPath = ''

      segments.slice(0, -1).forEach((segment) => {
        runningPath = runningPath ? `${runningPath}/${segment}` : segment
        next[runningPath] = true
      })

      return next
    })
  }

  function handleSelectFile(path: string) {
    expandPathToFile(path)
    setSelectedFile(path)
  }

  function toggleFolder(path: string) {
    setExpandedFolders((current) => ({
      ...current,
      [path]: !current[path],
    }))
  }

  function renderTreeNodes(nodes: FileTreeNode[], depth = 0): ReactNode {
    return nodes.map((node) => {
      if (node.type === 'folder') {
        const isExpanded = expandedFolders[node.path] ?? true

        return (
          <div key={node.path} className={styles.treeNode}>
            <button
              className={styles.treeRow}
              style={{ paddingInlineStart: `${0.38 + depth * 0.74}rem` }}
              onClick={() => toggleFolder(node.path)}
              type="button"
            >
              <span className={styles.treeChevron}>{isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}</span>
              <span className={styles.treeIcon}>{isExpanded ? <FolderOpen size={13} /> : <Folder size={13} />}</span>
              <span className={styles.treeLabel}>{node.name}</span>
            </button>

            {isExpanded ? <div className={styles.treeChildren}>{renderTreeNodes(node.children, depth + 1)}</div> : null}
          </div>
        )
      }

      const fileDirty = isFileDirty(node.path, overrides, fileMap.get(node.path))
      const fileExtension = node.name.split('.').pop()?.toLowerCase()
      const fileIcon = fileExtension === 'json' ? <FileJson2 size={13} /> : <FileCode2 size={13} />

      return (
        <button
          key={node.path}
          className={clsx(styles.treeRow, styles.treeFileRow, selectedFile === node.path && styles.treeFileRowActive)}
          style={{ paddingInlineStart: `${0.38 + depth * 0.74}rem` }}
          onClick={() => handleSelectFile(node.path)}
          type="button"
        >
          <span className={styles.treeChevron} />
          <span className={styles.treeIcon}>{fileIcon}</span>
          <span className={styles.treeLabel}>{node.name}</span>
          {fileDirty ? <span className={styles.treeDirtyDot} /> : null}
        </button>
      )
    })
  }

  const editorValue = selectedFile ? overrides[selectedFile] ?? fileMap.get(selectedFile) ?? '' : ''
  const editorLanguage = selectedFile ? detectEditorLanguage(selectedFile) : 'typescript'
  const selectedFileDirty = selectedFile ? isFileDirty(selectedFile, overrides, fileMap.get(selectedFile)) : false
  const rootFolderName = `${normalizeArchiveName(database.name)}-sequelize-scaffold`
  const rootExpanded = expandedFolders[''] ?? true

  async function handleExportArchive() {
    setExportingArchive(true)

    try {
      const zip = new JSZip()

      files.forEach((file) => {
        const content = overrides[file.path] ?? file.content
        zip.file(file.path, content)
      })

      const blob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
      })

      downloadBlobFile(`${normalizeArchiveName(database.name)}-sequelize-scaffold.zip`, blob)
    } finally {
      setExportingArchive(false)
    }
  }

  return (
    <section className={clsx(styles.codeStudio, isFullscreen && styles.fullscreenMode)}>
      <header className={styles.header}>
        <div className={styles.meta}>
          <h4>Code Studio ORM</h4>
          <p>Generazione real-time: class-validator + sequelize + sequelize-typescript.</p>
        </div>

        <div className={styles.actions}>
          <Button compact variant="ghost" onClick={() => setIsFullscreen((current) => !current)}>
            {isFullscreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
            {isFullscreen ? 'Esci full screen' : 'Full screen'}
          </Button>

          <Button compact onClick={() => void handleExportArchive()} disabled={files.length === 0 || exportingArchive}>
            <Download size={12} />
            {exportingArchive ? 'Esportazione...' : 'Esporta archivio'}
          </Button>
        </div>
      </header>

      <div className={styles.workspace}>
        <aside className={styles.filePanel}>
          <p className={styles.panelTitle}>Explorer</p>
          <div className={styles.treeView}>
            <button
              className={clsx(styles.treeRow, styles.treeRootRow)}
              style={{ paddingInlineStart: '0.38rem' }}
              onClick={() => toggleFolder('')}
              type="button"
            >
              <span className={styles.treeChevron}>{rootExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}</span>
              <span className={styles.treeIcon}>{rootExpanded ? <FolderOpen size={13} /> : <Folder size={13} />}</span>
              <span className={styles.treeLabel}>{rootFolderName}</span>
              <span className={styles.treeMeta}>{files.length}</span>
            </button>

            {rootExpanded ? <div className={styles.treeChildren}>{renderTreeNodes(treeRoot.children, 1)}</div> : null}
          </div>
        </aside>

        <section className={styles.editorPanel}>
          <header className={styles.editorHeader}>
            <span className={styles.editorPath}>{selectedFile || 'Nessun file selezionato'}</span>
            {selectedFile ? (
              <span className={clsx(styles.editorState, selectedFileDirty && styles.editorStateDirty)}>
                {selectedFileDirty ? 'Modificato' : 'Allineato'}
              </span>
            ) : null}
          </header>

          <div className={styles.editorBody}>
            {selectedFile ? (
              <Editor
                path={fileUri(selectedFile)}
                language={editorLanguage}
                value={editorValue}
                theme={theme === 'dark' ? 'vs-dark' : 'vs'}
                onChange={(value) => {
                  if (!selectedFile) {
                    return
                  }

                  setOverrides((current) => ({
                    ...current,
                    [selectedFile]: value ?? '',
                  }))
                }}
                options={{
                  automaticLayout: true,
                  minimap: { enabled: true },
                  fontSize: 13,
                  lineNumbers: 'on',
                  tabSize: 2,
                  insertSpaces: true,
                  formatOnPaste: true,
                  formatOnType: true,
                  scrollBeyondLastLine: false,
                  wordWrap: 'on',
                  smoothScrolling: true,
                  stickyScroll: {
                    enabled: true,
                  },
                }}
              />
            ) : (
              <div className={styles.emptyEditor}>Nessun file disponibile.</div>
            )}
          </div>
        </section>
      </div>
    </section>
  )
}
