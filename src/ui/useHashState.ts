import { useCallback, useEffect, useState } from 'react'
import { decodeState, encodeState, type AppState } from './urlState.ts'

/** App state mirrored into location.hash so the URL is shareable. */
export function useHashState(): [AppState, (update: (prev: AppState) => AppState) => void] {
  const [state, setState] = useState<AppState>(() => decodeState(window.location.hash))

  useEffect(() => {
    const onHashChange = () => {
      const next = decodeState(window.location.hash)
      setState((prev) => (encodeState(prev) === encodeState(next) ? prev : next))
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const update = useCallback((fn: (prev: AppState) => AppState) => {
    setState((prev) => {
      const next = fn(prev)
      window.history.replaceState(null, '', '#' + encodeState(next))
      return next
    })
  }, [])

  return [state, update]
}
