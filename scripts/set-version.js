#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const cliArgs = process.argv.slice(2)

if (cliArgs.length > 0) {
  console.error('Usage: npm run set:version')
  console.error('This command is automatic and does not accept arguments or flags.')
  process.exit(1)
}

const semverRegex = /^\d+\.\d+\.\d+$/

const bumpType = (commitSubject) => {
  const match = commitSubject.match(/^([a-z]+)(\(.+\))?(!)?:/)
  const isConventional = Boolean(match)
  const type = isConventional ? match[1] : null
  const hasBang = isConventional && Boolean(match[3])
  const hasBreakingMarker = /BREAKING CHANGE/.test(commitSubject)
  return {
    type,
    isConventional,
    breaking: hasBang || hasBreakingMarker,
  }
}

const getRootCommit = () =>
  execSync('git rev-list --max-parents=0 HEAD', {
    cwd: ROOT_DIR,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
    .trim()
    .split(/\s+/)[0]

const getCommitSubjectLog = (baseRef) => {
  const range = `${baseRef}..HEAD`
  const output = execSync(`git log --no-merges --format=%s --reverse ${range}`, {
    cwd: ROOT_DIR,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim()

  if (!output) {
    return []
  }

  return output.split(/\r?\n/)
}

const resolveBaseRef = () => {
  return getRootCommit()
}

const computeNextVersion = () => {
  const baseRef = resolveBaseRef()
  const commitSubjects = getCommitSubjectLog(baseRef)
  let major = 0
  let minor = 0
  let patch = 0
  let hasBreaking = false

  for (const subject of commitSubjects) {
    const message = subject.trim()
    if (!message) {
      continue
    }

    const { type, isConventional, breaking } = bumpType(message)

    if (!isConventional) {
      if (/Revert "(feat|fix|perf|docs|style|refactor|test|chore|build|ci)/.test(message)) {
        const fallback = message.match(/Revert "(feat|fix|perf|docs|style|refactor|test|chore|build|ci)/)?.[1]
        if (fallback) {
          if (fallback === 'feat') {
            minor += 1
            patch = 0
          } else if (['fix', 'perf'].includes(fallback)) {
            patch += 1
          }
        }
      }
      continue
    }

    if (breaking) {
      major += 1
      minor = 0
      patch = 0
      hasBreaking = true
      continue
    }

    switch (type) {
      case 'feat': {
        minor += 1
        patch = 0
        break
      }
      case 'fix':
      case 'perf':
      case 'docs':
      case 'style':
      case 'refactor':
      case 'test':
      case 'chore':
      case 'build':
      case 'ci': {
        patch += 1
        break
      }
      default:
        break
    }
  }

  if (hasBreaking) {
    major = Math.max(1, major)
  }

  return `${major}.${minor}.${patch}`
}

const nextVersion = computeNextVersion()

if (!nextVersion || !semverRegex.test(nextVersion)) {
  console.error(`Invalid version '${nextVersion}'. Expected semver x.y.z`)
  process.exit(1)
}

const PACKAGE_JSON_PATH = path.join(ROOT_DIR, 'package.json')
const PACKAGE_JSON = JSON.parse(readFileSync(PACKAGE_JSON_PATH, 'utf8').replace(/^\uFEFF/, ''))
PACKAGE_JSON.version = nextVersion
writeFileSync(PACKAGE_JSON_PATH, `${JSON.stringify(PACKAGE_JSON, null, 2)}\n`)

const ENV_DIR = path.join(ROOT_DIR, 'env')
if (existsSync(ENV_DIR)) {
  const ENV_FILES = readdirSync(ENV_DIR)
    .filter((file) => file.startsWith('.env'))
    .map((file) => path.join(ENV_DIR, file))

  for (const filePath of ENV_FILES) {
    const contents = readFileSync(filePath, 'utf8')
    if (!contents.includes('APP_VERSION=')) {
      continue
    }

    const updated = contents.replace(/APP_VERSION=.*$/gm, `APP_VERSION=${nextVersion}`)
    writeFileSync(filePath, updated)
  }
}

const README_PATH = path.join(ROOT_DIR, 'README.md')
let readme = readFileSync(README_PATH, 'utf8')
readme = readme.replace(
  /(https:\/\/img\.shields\.io\/badge\/version-)([\d.]+)(-blue\.svg)/,
  `$1${nextVersion}$3`,
)
readme = readme.replace(/APP_VERSION=\d+\.\d+\.\d+/g, `APP_VERSION=${nextVersion}`)
writeFileSync(README_PATH, readme)

console.log(`Version candidate set to ${nextVersion}`)

const runGit = (command) => {
  try {
    execSync(command, { stdio: 'inherit', cwd: ROOT_DIR })
  } catch (error) {
    console.warn(`[set:version] Failed to run "${command}": ${error?.message ?? error}`)
  }
}

runGit('git add .')
runGit(`git commit -m "build(release): v${nextVersion}"`)
