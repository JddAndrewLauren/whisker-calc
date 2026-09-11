import { mkdirSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { compareVersions, latestVersionDir } from './versions.ts'

describe('compareVersions', () => {
  it('compares parts as numbers, not strings', () => {
    expect(compareVersions('0.7.206', '0.7.99')).toBeGreaterThan(0)
    expect(compareVersions('0.7.99', '0.7.206')).toBeLessThan(0)
  })

  it('treats a missing trailing part as zero', () => {
    expect(compareVersions('0.7.206.0', '0.7.206')).toBe(0)
  })
})

describe('latestVersionDir', () => {
  it('picks the numerically highest version directory and ignores other names', () => {
    const dir = mkdtempSync(join(tmpdir(), 'versions-'))
    for (const d of ['0.7.99', '0.7.206', 'notes']) mkdirSync(join(dir, d))
    expect(latestVersionDir(dir)).toBe('0.7.206')
  })

  it('returns undefined when no version directory exists', () => {
    expect(latestVersionDir(mkdtempSync(join(tmpdir(), 'versions-')))).toBeUndefined()
  })
})
