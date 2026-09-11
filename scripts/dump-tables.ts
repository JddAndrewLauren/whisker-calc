import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { readIndex, table } from './tables/readIndex.ts'
import { compareVersions } from './tables/versions.ts'

/**
 * Export the game's DataTables with TableGraph.exe (from github.com/Whiskerwood-Modding/Whiskerwood-Project,
 * Automation/DTDumps) into data/dumps/<game version>/DataTableIndex.json. Runs the Windows exe through
 * WSL interop; the tools folder is gitignored.
 */
const gameDir = process.env.WHISKERWOOD_DIR ?? '/mnt/c/Program Files (x86)/Steam/steamapps/common/Whiskerwood'
const toolsDir = fileURLToPath(new URL('../tools/tablegraph/', import.meta.url))
const dumpsDir = fileURLToPath(new URL('../data/dumps/', import.meta.url))
const REPO = 'https://raw.githubusercontent.com/Whiskerwood-Modding/Whiskerwood-Project/main/Automation'
const NEEDED = ['GridactorDefs_Sync', 'AssetLookups/IndustryRecipes', 'AssetLookups/ResourceLookup', 'AssetLookups/Crops', 'TextDB/Loc_En', 'SystemTunes']

const fail = (...lines: string[]): never => {
  for (const l of lines) console.error(l)
  process.exit(1)
}
const winPath = (p: string) => execFileSync('wslpath', ['-w', p], { encoding: 'utf8' }).trim()
/** "Whiskerwood-0.7.206.0.usmap" -> "0.7.206.0". */
const usmapVersion = (f: string) => /^Whiskerwood-(\d+(?:\.\d+)+)\.usmap$/.exec(f)?.[1] ?? '0'

if (!existsSync('/proc/sys/fs/binfmt_misc/WSLInterop')) fail('npm run dump must run inside WSL: it starts the Windows TableGraph.exe through interop')

const versionFile = `${gameDir}/Whiskerwood/Content/Movies/Version.txt`
if (!existsSync(versionFile)) fail(`no game at ${gameDir} (set WHISKERWOOD_DIR)`)
const gameVersion = readFileSync(versionFile, 'utf8').trim()

const usmaps = existsSync(toolsDir) ? readdirSync(toolsDir).filter((f) => f.endsWith('.usmap')) : []
if (!existsSync(`${toolsDir}TableGraph.exe`) || !usmaps.length) {
  fail(
    `Put these in ${toolsDir}:`,
    ...['DTDumps/TableGraph.exe', 'DTDumps/CUE4Parse-Natives.dll', 'DTDumps/blake3_dotnet.dll', 'DTDumps/libSkiaSharp.dll'].map((f) => `  ${REPO}/${f}`),
    `  ${REPO}/Whiskerwood-<version>.usmap (the newest one; regenerate with jmap_dumper.exe if the game is newer)`,
  )
}
const usmap = usmaps.sort((a, b) => compareVersions(usmapVersion(a), usmapVersion(b))).at(-1)!
if (!usmap.includes(gameVersion)) console.log(`warning: mappings ${usmap} were made for another build than ${gameVersion}`)

const outDir = `${dumpsDir}${gameVersion}/`
mkdirSync(outDir, { recursive: true })
const outFile = `${outDir}DataTableIndex.json`
execFileSync(
  `${toolsDir}TableGraph.exe`,
  ['--pak-dir', winPath(`${gameDir}/Whiskerwood/Content/Paks`), '--mappings', winPath(`${toolsDir}${usmap}`), '--version', 'GAME_UE5_6', '--export', winPath(outFile)],
  { stdio: ['ignore', 'ignore', 'inherit'], cwd: toolsDir },
)

const index = readIndex(outFile)
for (const name of NEEDED) table(index, name)
console.log(`game version ${gameVersion}: ${index.TotalTables} tables exported ${index.ExportDate}`)
console.log(`wrote ${outFile}`)
