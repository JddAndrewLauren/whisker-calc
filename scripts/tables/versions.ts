import { readdirSync } from 'node:fs'

/** Compare dotted version strings numerically; a missing trailing part counts as 0 ("0.7.206" equals "0.7.206.0"). */
export function compareVersions(a: string, b: string): number {
  const [x, y] = [a.split('.').map(Number), b.split('.').map(Number)]
  for (let i = 0; i < Math.max(x.length, y.length); i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) - (y[i] ?? 0)
  return 0
}

/** Highest version-named subdirectory (like "0.7.206.0") of dir, or undefined if there is none. */
export function latestVersionDir(dir: string | URL): string | undefined {
  return readdirSync(dir)
    .filter((d) => /^\d+(\.\d+)+$/.test(d))
    .sort(compareVersions)
    .at(-1)
}
