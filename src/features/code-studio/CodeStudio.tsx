import clsx from 'clsx'
import Editor, { useMonaco } from '@monaco-editor/react'
import JSZip from 'jszip'
import { Download, FolderTree, Maximize2, Minimize2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { generateSequelizeScaffold } from '@/lib/codegen/generateSequelizeScaffold'
import { downloadBlobFile } from '@/lib/file/textFile'
import { useSchemaStore } from '@/store/schemaStore'
import { useThemeStore } from '@/store/themeStore'

import styles from './CodeStudio.module.scss'

const MONACO_EXTRA_LIBS = `
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
  export const Table: (...args: unknown[]) => ClassDecorator
  export const Column: (...args: unknown[]) => PropertyDecorator
  export const DataType: Record<string, (...args: unknown[]) => unknown> & Record<string, unknown>
  export const PrimaryKey: (...args: unknown[]) => PropertyDecorator
  export const AutoIncrement: (...args: unknown[]) => PropertyDecorator
  export const AllowNull: (...args: unknown[]) => PropertyDecorator
  export const Unique: (...args: unknown[]) => PropertyDecorator
  export const ForeignKey: (...args: unknown[]) => PropertyDecorator
  export const BelongsTo: (...args: unknown[]) => PropertyDecorator
  export const HasMany: (...args: unknown[]) => PropertyDecorator
  export const HasOne: (...args: unknown[]) => PropertyDecorator
}

declare module 'class-validator' {
  export const IsOptional: (...args: unknown[]) => PropertyDecorator
  export const IsNotEmpty: (...args: unknown[]) => PropertyDecorator
  export const IsString: (...args: unknown[]) => PropertyDecorator
  export const MaxLength: (...args: unknown[]) => PropertyDecorator
  export const IsUUID: (...args: unknown[]) => PropertyDecorator
  export const IsInt: (...args: unknown[]) => PropertyDecorator
  export const IsNumber: (...args: unknown[]) => PropertyDecorator
  export const IsBoolean: (...args: unknown[]) => PropertyDecorator
  export const IsDate: (...args: unknown[]) => PropertyDecorator
  export const IsObject: (...args: unknown[]) => PropertyDecorator
}
`

function getFileName(path: string): string {
  const chunks = path.split('/')
  return chunks[chunks.length - 1] ?? path
}

function getFileDirectory(path: string): string {
  const chunks = path.split('/')
  return chunks.slice(0, -1).join('/') || '.'
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

  const scaffoldPreview = useMemo(() => {
    const groups = new Map<string, string[]>()

    files.forEach((file) => {
      const directory = getFileDirectory(file.path)
      const list = groups.get(directory) ?? []
      list.push(getFileName(file.path))
      groups.set(directory, list)
    })

    return [...groups.entries()]
      .map(([directory, entries]) => ({
        directory,
        entries: entries.sort((a, b) => a.localeCompare(b)),
      }))
      .sort((a, b) => a.directory.localeCompare(b.directory))
  }, [files])

  const [selectedFile, setSelectedFile] = useState('')
  const [overrides, setOverrides] = useState<Record<string, string>>({})
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
    setOverrides((current) => {
      const next = Object.fromEntries(Object.entries(current).filter(([path]) => fileMap.has(path)))

      return Object.keys(next).length === Object.keys(current).length ? current : next
    })
  }, [fileMap])

  const editorValue = selectedFile ? overrides[selectedFile] ?? fileMap.get(selectedFile) ?? '' : ''
  const editorLanguage = selectedFile.endsWith('.json') ? 'json' : 'typescript'

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
          <p className={styles.panelTitle}>File generati</p>
          <div className={styles.fileList}>
            {files.map((file) => (
              <button
                key={file.path}
                className={clsx(styles.fileButton, selectedFile === file.path && styles.fileButtonActive)}
                onClick={() => setSelectedFile(file.path)}
                type="button"
              >
                <strong>{getFileName(file.path)}</strong>
                <span>{getFileDirectory(file.path)}</span>
              </button>
            ))}
          </div>
        </aside>

        <section className={styles.editorPanel}>
          {selectedFile ? (
            <Editor
              path={`file:///${selectedFile}`}
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
        </section>

        <aside className={styles.previewPanel}>
          <p className={styles.panelTitle}>
            <FolderTree size={13} />
            Preview scaffolding
          </p>

          <div className={styles.previewTree}>
            {scaffoldPreview.map((group) => (
              <section key={group.directory} className={styles.previewFolder}>
                <h5>{group.directory}</h5>
                <div>
                  {group.entries.map((entry) => (
                    <span key={`${group.directory}/${entry}`}>{entry}</span>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </aside>
      </div>
    </section>
  )
}
