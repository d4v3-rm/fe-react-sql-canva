import clsx from 'clsx'
import Editor, { useMonaco } from '@monaco-editor/react'
import JSZip from 'jszip'
import {
  ChevronDown,
  ChevronRight,
  Download,
  FileCode2,
  FileJson2,
  FilePlus2,
  Folder,
  FolderOpen,
  FolderPlus,
  Maximize2,
  Minimize2,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import { Button } from '@/components/ui/Button'
import { useDialog } from '@/components/ui/dialog/useDialog'
import { generateSequelizeScaffold } from '@/lib/codegen/generateSequelizeScaffold'
import { parseSequelizeWorkspace } from '@/lib/codegen/parseSequelizeWorkspace'
import { downloadBlobFile } from '@/lib/file/textFile'
import { useCodeWorkspaceStore } from '@/store/codeWorkspaceStore'
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

type TreeNodeType = 'folder' | 'file'
type FileSyncState = 'generated' | 'dirty' | 'custom'

interface FileTreeNode {
  type: TreeNodeType
  name: string
  path: string
  children: FileTreeNode[]
}

interface WorkspaceFile {
  path: string
  content: string
}

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

function normalizeIdentifier(raw: string): string {
  return (
    raw
      .trim()
      .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
      .replace(/[^a-zA-Z0-9_]/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_+|_+$/g, '')
      .toLowerCase() || 'entity'
  )
}

function toPascalCase(raw: string): string {
  const chunks = normalizeIdentifier(raw).split('_').filter(Boolean)
  return chunks.map((chunk) => `${chunk.charAt(0).toUpperCase()}${chunk.slice(1)}`).join('') || 'Entity'
}

function normalizeWorkspacePath(raw: string): string {
  const normalized = raw
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\.\/+/g, '')
    .replace(/^\/+/g, '')
    .replace(/\/{2,}/g, '/')
    .replace(/\/+$/g, '')

  if (!normalized) {
    return ''
  }

  const segments = normalized
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean)

  if (segments.length === 0) {
    return ''
  }

  const hasInvalidSegment = segments.some((segment) => segment === '.' || segment === '..' || /[<>:"|?*]/.test(segment))
  if (hasInvalidSegment) {
    return ''
  }

  return segments.join('/')
}

function getParentFolderPath(path: string): string {
  const segments = path.split('/').filter(Boolean)
  if (segments.length <= 1) {
    return ''
  }

  return segments.slice(0, -1).join('/')
}

function collectFolderChain(path: string): string[] {
  const segments = normalizeWorkspacePath(path).split('/').filter(Boolean)
  const folders: string[] = []
  let running = ''

  segments.forEach((segment) => {
    running = running ? `${running}/${segment}` : segment
    folders.push(running)
  })

  return folders
}

function buildDefaultFileContent(path: string): string {
  if (!path.endsWith('.model.ts')) {
    return ''
  }

  const fileName = path.split('/').pop() ?? 'new_model.model.ts'
  const baseName = fileName.replace(/\.model\.ts$/i, '')
  const tableName = normalizeIdentifier(baseName)
  const className = `${toPascalCase(baseName)}Model`

  return `import { AutoIncrement, Column, DataType, Model, PrimaryKey, Table } from 'sequelize-typescript'
import { IsInt, IsNotEmpty } from 'class-validator'

@Table({
  tableName: '${tableName}',
  schema: 'public',
  timestamps: false,
})
export class ${className} extends Model<${className}> {
  @PrimaryKey
  @AutoIncrement
  @Column({
    field: 'id',
    type: DataType.INTEGER,
    allowNull: false,
  })
  @IsNotEmpty()
  @IsInt()
  declare id: number
}
`
}

function sortTree(node: FileTreeNode): void {
  node.children.sort((left, right) => {
    if (left.type !== right.type) {
      return left.type === 'folder' ? -1 : 1
    }

    return left.name.localeCompare(right.name)
  })

  node.children.forEach((child) => {
    if (child.type === 'folder') {
      sortTree(child)
    }
  })
}

function buildFileTree(filePaths: string[], folderPaths: string[]): FileTreeNode {
  const root: FileTreeNode = {
    type: 'folder',
    name: '',
    path: '',
    children: [],
  }

  const folderMap = new Map<string, FileTreeNode>([['', root]])

  const ensureFolder = (path: string) => {
    const segments = path.split('/').filter(Boolean)
    let currentParent = root
    let currentPath = ''

    segments.forEach((segment) => {
      const nextPath = currentPath ? `${currentPath}/${segment}` : segment
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
  }

  folderPaths
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right))
    .forEach((folderPath) => {
      ensureFolder(folderPath)
    })

  filePaths.forEach((filePath) => {
    const normalizedPath = normalizeWorkspacePath(filePath)
    if (!normalizedPath) {
      return
    }

    const parentPath = getParentFolderPath(normalizedPath)
    ensureFolder(parentPath)

    const fileName = normalizedPath.split('/').pop() ?? normalizedPath
    const parentFolder = folderMap.get(parentPath) ?? root

    const alreadyExists = parentFolder.children.some((child) => child.type === 'file' && child.path === normalizedPath)
    if (alreadyExists) {
      return
    }

    parentFolder.children.push({
      type: 'file',
      name: fileName,
      path: normalizedPath,
      children: [],
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

function detectEditorLanguage(path: string): string {
  if (path.endsWith('.json')) {
    return 'json'
  }

  if (path.endsWith('.md')) {
    return 'markdown'
  }

  if (path.endsWith('.sql')) {
    return 'sql'
  }

  if (path.endsWith('.scss')) {
    return 'scss'
  }

  if (path.endsWith('.css')) {
    return 'css'
  }

  if (path.endsWith('.js') || path.endsWith('.jsx')) {
    return 'javascript'
  }

  return 'typescript'
}

function fileUri(path: string): string {
  return `file:///workspace/${path}`
}

function resolveFileSyncState(path: string, files: Record<string, string>, generatedSnapshot: Record<string, string>): FileSyncState {
  if (!Object.prototype.hasOwnProperty.call(generatedSnapshot, path)) {
    return 'custom'
  }

  return files[path] === generatedSnapshot[path] ? 'generated' : 'dirty'
}

function fingerprintModelFiles(files: WorkspaceFile[]): string {
  return files
    .filter((file) => file.path.endsWith('.model.ts'))
    .map((file) => `${file.path}\u0000${file.content}`)
    .join('\u0001')
}

export function CodeStudio() {
  const monaco = useMonaco()
  const didSetupMonacoRef = useRef(false)
  const lastParsedWorkspaceRef = useRef('')

  const dialog = useDialog()

  const database = useSchemaStore((state) => state.database)
  const tables = useSchemaStore((state) => state.tables)
  const relations = useSchemaStore((state) => state.relations)
  const replaceProject = useSchemaStore((state) => state.replaceProject)
  const theme = useThemeStore((state) => state.theme)

  const workspaceFilesRecord = useCodeWorkspaceStore((state) => state.files)
  const workspaceFolders = useCodeWorkspaceStore((state) => state.folders)
  const generatedSnapshot = useCodeWorkspaceStore((state) => state.generatedSnapshot)
  const selectedFile = useCodeWorkspaceStore((state) => state.selectedFile)
  const expandedFolders = useCodeWorkspaceStore((state) => state.expandedFolders)
  const syncGeneratedFiles = useCodeWorkspaceStore((state) => state.syncGeneratedFiles)
  const createFile = useCodeWorkspaceStore((state) => state.createFile)
  const updateFileContent = useCodeWorkspaceStore((state) => state.updateFileContent)
  const addFolder = useCodeWorkspaceStore((state) => state.addFolder)
  const setSelectedFile = useCodeWorkspaceStore((state) => state.setSelectedFile)
  const setExpandedFolder = useCodeWorkspaceStore((state) => state.setExpandedFolder)
  const syncExpandedFolders = useCodeWorkspaceStore((state) => state.syncExpandedFolders)

  const generatedFiles = useMemo(
    () =>
      generateSequelizeScaffold({
        database,
        tables,
        relations,
      }),
    [database, relations, tables],
  )

  const workspaceFiles = useMemo<WorkspaceFile[]>(
    () =>
      Object.entries(workspaceFilesRecord)
        .map(([path, content]) => ({ path, content }))
        .sort((left, right) => left.path.localeCompare(right.path)),
    [workspaceFilesRecord],
  )

  const workspaceFileMap = useMemo(() => new Map(workspaceFiles.map((file) => [file.path, file.content])), [workspaceFiles])
  const treeRoot = useMemo(() => buildFileTree(workspaceFiles.map((file) => file.path), workspaceFolders), [workspaceFiles, workspaceFolders])
  const folderPaths = useMemo(() => collectFolderPaths(treeRoot), [treeRoot])
  const folderPathSet = useMemo(() => new Set(folderPaths.filter(Boolean)), [folderPaths])
  const modelWorkspaceFingerprint = useMemo(() => fingerprintModelFiles(workspaceFiles), [workspaceFiles])
  const modelFileCount = useMemo(() => workspaceFiles.filter((file) => file.path.endsWith('.model.ts')).length, [workspaceFiles])
  const selectedFileState = selectedFile ? resolveFileSyncState(selectedFile, workspaceFilesRecord, generatedSnapshot) : null

  const [isFullscreen, setIsFullscreen] = useState(false)
  const [exportingArchive, setExportingArchive] = useState(false)

  useEffect(() => {
    syncGeneratedFiles(generatedFiles)
  }, [generatedFiles, syncGeneratedFiles])

  useEffect(() => {
    if (!selectedFile || !workspaceFileMap.has(selectedFile)) {
      setSelectedFile(workspaceFiles[0]?.path ?? '')
    }
  }, [selectedFile, setSelectedFile, workspaceFileMap, workspaceFiles])

  useEffect(() => {
    syncExpandedFolders(folderPaths)
  }, [folderPaths, syncExpandedFolders])

  useEffect(() => {
    if (!modelWorkspaceFingerprint || modelWorkspaceFingerprint === lastParsedWorkspaceRef.current) {
      return
    }

    const timer = window.setTimeout(() => {
      lastParsedWorkspaceRef.current = modelWorkspaceFingerprint

      const result = parseSequelizeWorkspace({
        files: workspaceFiles,
        currentDatabase: database,
        currentTables: tables,
        currentRelations: relations,
      })

      if (result.parsedModels === 0) {
        return
      }

      if (result.parsedModels < modelFileCount) {
        return
      }

      if (result.database === database && result.tables === tables && result.relations === relations) {
        return
      }

      replaceProject(result.database, result.tables, result.relations)
    }, 440)

    return () => {
      window.clearTimeout(timer)
    }
  }, [database, modelFileCount, modelWorkspaceFingerprint, relations, replaceProject, tables, workspaceFiles])

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
    if (!monaco) {
      return
    }

    const validUris = new Set(workspaceFiles.map((file) => fileUri(file.path)))

    workspaceFiles.forEach((file) => {
      const uri = monaco.Uri.parse(fileUri(file.path))
      const language = detectEditorLanguage(file.path)
      const model = monaco.editor.getModel(uri)

      if (!model) {
        monaco.editor.createModel(file.content, language, uri)
        return
      }

      if (model.getValue() !== file.content) {
        model.setValue(file.content)
      }
    })

    monaco.editor.getModels().forEach((model) => {
      const modelUri = model.uri.toString()

      if (modelUri.startsWith('file:///workspace/') && !validUris.has(modelUri)) {
        model.dispose()
      }
    })
  }, [monaco, workspaceFiles])

  function expandFolderPath(folderPath: string) {
    setExpandedFolder('', true)

    collectFolderChain(folderPath).forEach((path) => {
      setExpandedFolder(path, true)
    })
  }

  function expandPathToFile(filePath: string) {
    expandFolderPath(getParentFolderPath(filePath))
  }

  function handleSelectFile(path: string) {
    expandPathToFile(path)
    setSelectedFile(path)
  }

  function toggleFolder(path: string) {
    setExpandedFolder(path, !(expandedFolders[path] ?? true))
  }

  async function handleCreateFile() {
    const defaultFolder = selectedFile ? getParentFolderPath(selectedFile) : 'src'
    const suggestedPath = defaultFolder ? `${defaultFolder}/new-file.ts` : 'new-file.ts'
    const typedPath = await dialog.prompt({
      title: 'Nuovo file',
      message: 'Inserisci il percorso relativo del file (es. src/models/user.model.ts).',
      placeholder: 'src/models/new-file.ts',
      defaultValue: suggestedPath,
      confirmLabel: 'Crea file',
    })

    if (typedPath === null) {
      return
    }

    const normalizedPath = normalizeWorkspacePath(typedPath)
    if (!normalizedPath) {
      await dialog.alert({
        title: 'Percorso non valido',
        message: 'Usa un percorso relativo valido senza segmenti "." o "..".',
        confirmLabel: 'Chiudi',
      })
      return
    }

    if (workspaceFileMap.has(normalizedPath)) {
      await dialog.alert({
        title: 'File gia presente',
        message: `Il file ${normalizedPath} esiste gia nel workspace.`,
        confirmLabel: 'Chiudi',
      })
      return
    }

    if (folderPathSet.has(normalizedPath)) {
      await dialog.alert({
        title: 'Percorso occupato',
        message: `Esiste gia una cartella con il nome ${normalizedPath}.`,
        confirmLabel: 'Chiudi',
      })
      return
    }

    collectFolderChain(getParentFolderPath(normalizedPath)).forEach((folderPath) => addFolder(folderPath))
    createFile(normalizedPath, buildDefaultFileContent(normalizedPath))
    expandPathToFile(normalizedPath)
    setSelectedFile(normalizedPath)
  }

  async function handleCreateFolder() {
    const defaultFolder = selectedFile ? getParentFolderPath(selectedFile) : 'src'
    const typedPath = await dialog.prompt({
      title: 'Nuova cartella',
      message: 'Inserisci il percorso relativo della cartella (es. src/modules/auth).',
      placeholder: 'src/new-folder',
      defaultValue: defaultFolder || 'src',
      confirmLabel: 'Crea cartella',
    })

    if (typedPath === null) {
      return
    }

    const normalizedPath = normalizeWorkspacePath(typedPath)
    if (!normalizedPath) {
      await dialog.alert({
        title: 'Percorso non valido',
        message: 'Usa un percorso relativo valido senza caratteri riservati.',
        confirmLabel: 'Chiudi',
      })
      return
    }

    if (workspaceFileMap.has(normalizedPath)) {
      await dialog.alert({
        title: 'Percorso occupato',
        message: `Esiste gia un file con il nome ${normalizedPath}.`,
        confirmLabel: 'Chiudi',
      })
      return
    }

    if (folderPathSet.has(normalizedPath)) {
      return
    }

    collectFolderChain(normalizedPath).forEach((folderPath) => addFolder(folderPath))
    expandFolderPath(normalizedPath)
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

      const fileState = resolveFileSyncState(node.path, workspaceFilesRecord, generatedSnapshot)
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
          {fileState === 'dirty' ? <span className={styles.treeDirtyDot} /> : null}
          {fileState === 'custom' ? <span className={styles.treeCustomMark}>C</span> : null}
        </button>
      )
    })
  }

  const editorValue = selectedFile ? workspaceFilesRecord[selectedFile] ?? '' : ''
  const editorLanguage = selectedFile ? detectEditorLanguage(selectedFile) : 'typescript'
  const rootFolderName = `${normalizeArchiveName(database.name)}-workspace`
  const rootExpanded = expandedFolders[''] ?? true

  async function handleExportArchive() {
    setExportingArchive(true)

    try {
      const zip = new JSZip()

      workspaceFiles.forEach((file) => {
        zip.file(file.path, file.content)
      })

      const blob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
      })

      downloadBlobFile(`${normalizeArchiveName(database.name)}-workspace.zip`, blob)
    } finally {
      setExportingArchive(false)
    }
  }

  return (
    <section className={clsx(styles.codeStudio, isFullscreen && styles.fullscreenMode)}>
      <header className={styles.header}>
        <div className={styles.meta}>
          <h4>Code Studio ORM</h4>
          <p>Sync real-time editor/canvas tramite parser Sequelize.</p>
        </div>

        <div className={styles.actions}>
          <Button compact variant="ghost" onClick={() => setIsFullscreen((current) => !current)}>
            {isFullscreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
            {isFullscreen ? 'Esci full screen' : 'Full screen'}
          </Button>

          <Button compact onClick={() => void handleExportArchive()} disabled={workspaceFiles.length === 0 || exportingArchive}>
            <Download size={12} />
            {exportingArchive ? 'Esportazione...' : 'Esporta archivio'}
          </Button>
        </div>
      </header>

      <div className={styles.workspace}>
        <aside className={styles.filePanel}>
          <div className={styles.panelHeader}>
            <p className={styles.panelTitle}>Explorer</p>

            <div className={styles.panelActions}>
              <Button compact variant="ghost" onClick={() => void handleCreateFolder()}>
                <FolderPlus size={12} />
                Cartella
              </Button>

              <Button compact variant="ghost" onClick={() => void handleCreateFile()}>
                <FilePlus2 size={12} />
                File
              </Button>
            </div>
          </div>

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
              <span className={styles.treeMeta}>{workspaceFiles.length}</span>
            </button>

            {rootExpanded ? <div className={styles.treeChildren}>{renderTreeNodes(treeRoot.children, 1)}</div> : null}
          </div>
        </aside>

        <section className={styles.editorPanel}>
          <header className={styles.editorHeader}>
            <span className={styles.editorPath}>{selectedFile || 'Nessun file selezionato'}</span>
            {selectedFile ? (
              <span
                className={clsx(
                  styles.editorState,
                  selectedFileState === 'dirty' && styles.editorStateDirty,
                  selectedFileState === 'custom' && styles.editorStateCustom,
                )}
              >
                {selectedFileState === 'generated' ? 'Allineato' : selectedFileState === 'dirty' ? 'Modificato' : 'Custom'}
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

                  updateFileContent(selectedFile, value ?? '')
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
