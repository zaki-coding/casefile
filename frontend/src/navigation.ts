import { useSyncExternalStore } from 'react'

export type GameScreen = 'evidence' | 'interviews' | 'equipment' | 'accusation' | 'verdict'
export type Route = { name: 'menu' | 'detectives' | 'career' | 'continue' | 'settings' | 'missing' }
  | { name: 'confirm' | 'cases'; detectiveId: string }
  | { name: 'briefing'; detectiveId: string; caseId: string }
  | { name: 'game'; id: string; screen: GameScreen; focus?: 'ability' }

export function parseRoute(hash: string): Route {
  const path = hash.replace(/^#/, '') || '/'
  if (path === '/') return { name: 'menu' }
  if (path === '/new/detectives') return { name: 'detectives' }
  if (['/career', '/continue', '/settings'].includes(path)) return { name: path.slice(1) as 'career' | 'continue' | 'settings' }
  let match = path.match(/^\/new\/([a-z]+)\/(confirm|cases)$/)
  if (match) return { name: match[2] as 'confirm' | 'cases', detectiveId: match[1] }
  match = path.match(/^\/new\/([a-z]+)\/cases\/([0-9]+)\/briefing$/)
  if (match) return { name: 'briefing', detectiveId: match[1], caseId: match[2] }
  match = path.match(/^\/investigations\/([a-zA-Z0-9-]+)\/(evidence|interviews)\/ability$/)
  if (match) return { name: 'game', id: match[1], screen: match[2] as GameScreen, focus: 'ability' }
  match = path.match(/^\/investigations\/([a-zA-Z0-9-]+)\/(evidence|interviews|equipment|accusation|verdict)$/)
  if (match) return { name: 'game', id: match[1], screen: match[2] as GameScreen }
  return { name: 'missing' }
}

export const paths = {
  menu: '/', detectives: '/new/detectives',
  confirm: (id: string) => `/new/${id}/confirm`,
  cases: (id: string) => `/new/${id}/cases`,
  briefing: (detective: string, caseId: string) => `/new/${detective}/cases/${caseId}/briefing`,
  game: (id: string, screen: GameScreen) => `/investigations/${id}/${screen}`,
  ability: (id: string, room: 'evidence' | 'interviews') => `/investigations/${id}/${room}/ability`,
}

export function focusAbility() {
  const panel = document.getElementById('detective-ability')
  panel?.focus({ preventScroll: true })
  panel?.scrollIntoView({ block: 'start' })
}

export function navigate(path: string, replace = false) {
  if (window.location.hash === '#' + path) return
  window.history[replace ? 'replaceState' : 'pushState'](null, '', '#' + path)
  window.dispatchEvent(new Event('hashchange'))
}
function subscribe(listener: () => void) {
  window.addEventListener('hashchange', listener)
  window.addEventListener('popstate', listener)
  return () => { window.removeEventListener('hashchange', listener); window.removeEventListener('popstate', listener) }
}
export function useRoute() {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash, () => '#/')
  return { route: parseRoute(hash), key: hash || '#/' }
}

const confirmationKey = 'casefile-confirmed-detective'
export function confirmDetective(id: string) { sessionStorage.setItem(confirmationKey, id) }
export function clearConfirmation() { sessionStorage.removeItem(confirmationKey) }
export function hasConfirmedDetective(id: string) { return sessionStorage.getItem(confirmationKey) === id }

/** A single begin action owns creation; routing and restoration are read-only. */
export function createBeginGate<T>() {
  let pending: Promise<T> | undefined
  return (action: () => Promise<T>) => {
    if (pending) return pending
    pending = Promise.resolve().then(action).finally(() => { pending = undefined })
    return pending
  }
}
