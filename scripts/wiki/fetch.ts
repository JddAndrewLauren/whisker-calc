import { execFileSync } from 'node:child_process'

export const WIKI_BASE = 'https://wiki.hoodedhorse.com/Whiskerwood'
const API = `${WIKI_BASE}/api.php`
// Cloudflare in front of the wiki serves a challenge page to Node's fetch (TLS fingerprint),
// but lets curl through when it sends a browser user agent, so requests go via curl.
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'

interface QueryResponse {
  query?: {
    normalized?: { from: string; to: string }[]
    pages?: {
      title: string
      missing?: boolean
      revisions?: { slots: { main: { content: string } } }[]
      imageinfo?: { thumburl?: string }[]
    }[]
  }
}

function curlJson(url: string): unknown {
  const args = ['--silent', '--show-error', '--fail', '--location', '-A', USER_AGENT, '-H', 'Accept: application/json', url]
  let body: string
  try {
    body = execFileSync('curl', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  } catch (e) {
    throw new Error(`curl failed for ${url}: ${(e as Error).message}`)
  }
  return JSON.parse(body)
}

/** Fetch the current wikitext of each page title. Throws if any page is missing. */
export async function fetchWikitext(titles: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  for (let i = 0; i < titles.length; i += 50) {
    const batch = titles.slice(i, i + 50)
    const params = new URLSearchParams({
      action: 'query',
      prop: 'revisions',
      rvprop: 'content',
      rvslots: 'main',
      format: 'json',
      formatversion: '2',
      titles: batch.join('|'),
    })
    const body = curlJson(`${API}?${params}`) as QueryResponse
    for (const page of body.query?.pages ?? []) {
      const content = page.revisions?.[0]?.slots.main.content
      if (page.missing || content === undefined) throw new Error(`wiki page missing: ${page.title}`)
      out.set(page.title, content)
    }
  }
  const missing = titles.filter((t) => !out.has(t))
  if (missing.length) throw new Error(`wiki pages not returned: ${missing.join(', ')}`)
  return out
}

/** Resolve wiki file names ("Tex wood 07.png") to thumbnail URLs of the given width. Throws if any file is missing. */
export function fetchImageThumbs(files: string[], width: number): Map<string, string> {
  const out = new Map<string, string>()
  for (let i = 0; i < files.length; i += 50) {
    const batch = files.slice(i, i + 50)
    const params = new URLSearchParams({
      action: 'query',
      prop: 'imageinfo',
      iiprop: 'url',
      iiurlwidth: String(width),
      format: 'json',
      formatversion: '2',
      titles: batch.map((f) => `File:${f}`).join('|'),
    })
    const body = curlJson(`${API}?${params}`) as QueryResponse
    // The API answers with canonical titles; map them back to the names we asked for.
    const asked = new Map(batch.map((f) => [`File:${f}`, f]))
    for (const n of body.query?.normalized ?? []) asked.set(n.to, asked.get(n.from) ?? n.from)
    for (const page of body.query?.pages ?? []) {
      const url = page.imageinfo?.[0]?.thumburl
      const file = asked.get(page.title)
      if (file && url && !page.missing) out.set(file, url)
    }
  }
  const missing = files.filter((f) => !out.has(f))
  if (missing.length) throw new Error(`wiki files not found: ${missing.join(', ')}`)
  return out
}

/** Download a URL to a file through curl (same Cloudflare caveat as above). */
export function curlDownload(url: string, dest: string): void {
  try {
    execFileSync('curl', ['--silent', '--show-error', '--fail', '--location', '-A', USER_AGENT, '-o', dest, url])
  } catch (e) {
    throw new Error(`curl failed for ${url}: ${(e as Error).message}`)
  }
}
