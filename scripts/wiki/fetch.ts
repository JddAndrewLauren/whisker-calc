import { execFileSync } from 'node:child_process'

export const WIKI_BASE = 'https://wiki.hoodedhorse.com/Whiskerwood'
const API = `${WIKI_BASE}/api.php`
// Cloudflare in front of the wiki serves a challenge page to Node's fetch (TLS fingerprint),
// but lets curl through when it sends a browser user agent, so requests go via curl.
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'

interface QueryResponse {
  query?: {
    pages?: { title: string; missing?: boolean; revisions?: { slots: { main: { content: string } } }[] }[]
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
