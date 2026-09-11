export const APP_ID = 2489330

/** One post from the Steam news API. `contents` is Steam BBCode when fetched with maxlength=0. */
export interface NewsItem {
  gid: string
  title: string
  url: string
  /** Unix seconds. */
  date: number
  feedname: string
  contents: string
  tags?: string[]
}

/** Community announcements for Whiskerwood, newest first. api.steampowered.com has no Cloudflare challenge, unlike the wiki. */
export async function fetchNews(count = 100): Promise<NewsItem[]> {
  const url = `https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=${APP_ID}&count=${count}&maxlength=0&format=json&feeds=steam_community_announcements`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Steam news API returned ${res.status} for ${url}`)
  const body = (await res.json()) as { appnews: { newsitems: NewsItem[] } }
  const items = body.appnews.newsitems
  if (items.length === count) console.log(`warning: Steam returned the maximum of ${count} posts; older posts may be missing`)
  return items
}
