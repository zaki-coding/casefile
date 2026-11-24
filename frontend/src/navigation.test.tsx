import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CaseBrief, Investigation, PlayerProfile } from './api'
import { clearConfirmation, confirmDetective, createBeginGate, hasConfirmedDetective, navigate, parseRoute, paths } from './navigation'
import { CaseBriefing, CaseSelection, CareerScreen, ContinueScreen, DetectiveConfirmation, DetectiveSelection, MainMenu } from './screens/SetupScreens'
import { AccusationScreen, GameNavigation, ResultsScreen, restoreTheory } from './screens/InvestigationScreens'

const profile: PlayerProfile = {
  points: 0, selectedDetective: 'adrian', solvedCases: [],
  detectives: [
    { id: 'adrian', name: 'Adrian Cross', role: 'Investigator', bio: 'Studies patterns.', ability: 'Insight', description: 'Connect two facts.', threshold: 0, unlocked: true },
    { id: 'selena', name: 'Selena Voss', role: 'Interrogator', bio: 'Reads the room.', ability: 'Pressure', description: 'Open a follow-up.', threshold: 60, unlocked: false },
  ],
  equipment: [{ id: 'lens', name: 'Investigation Lens', threshold: 0, description: 'Examine visual traces.', remaining: 0, unlocked: true }],
}
const brief: CaseBrief = {
  id: '001', number: '001', title: 'The Midnight Proof', location: 'Bellweather Printworks', brief: 'Investigate a missing lithograph.',
  suspectCount: 3, evidenceCount: 2, suspects: [{ id: 'mara', name: 'Mara Vale', role: 'Conservator' }],
  evidence: [{ id: 'badge', title: 'Badge report', source: 'Security desk' }, { id: 'relay', title: 'Relay log', source: 'Corridor' }],
  topics: { alibi: 'Where were you?' }, methods: { switch: 'Manual relay' },
}
const saved: Investigation = {
  id: 'saved-123', caseId: '001', detectiveId: 'adrian', board: { badge: 'Examined access report', relay: 'Examined relay log' },
  interviews: [{ suspect: 'mara', topic: 'alibi', answer: 'I was elsewhere.' }], ability: null,
  abilityOptions: { type: 'insight', targets: [] }, result: null,
}

function storage(initial: Record<string, string> = {}) {
  const records = new Map(Object.entries(initial))
  return { getItem: vi.fn((key: string) => records.get(key) ?? null), setItem: vi.fn((key: string, value: string) => { records.set(key, value) }), removeItem: vi.fn((key: string) => { records.delete(key) }) }
}
afterEach(() => vi.unstubAllGlobals())

describe('screen URLs and browser history', () => {
  it.each([
    ['', { name: 'menu' }], ['#/', { name: 'menu' }],
    ['#/new/detectives', { name: 'detectives' }], ['#/career', { name: 'career' }],
    ['#/continue', { name: 'continue' }], ['#/settings', { name: 'settings' }],
    ['#/new/adrian/confirm', { name: 'confirm', detectiveId: 'adrian' }],
    ['#/new/selena/cases', { name: 'cases', detectiveId: 'selena' }],
    ['#/new/adrian/cases/002/briefing', { name: 'briefing', detectiveId: 'adrian', caseId: '002' }],
    ['#/investigations/saved-123/equipment', { name: 'game', id: 'saved-123', screen: 'equipment' }],
    ['#/investigations/saved-123/verdict', { name: 'game', id: 'saved-123', screen: 'verdict' }],
    ['#/new/adrian/cases/002/start', { name: 'missing' }],
    ['#/investigations/saved-123/delete', { name: 'missing' }],
    ['#/unknown', { name: 'missing' }],
  ])('resolves %s to the intended screen', (hash, expected) => expect(parseRoute(hash as string)).toEqual(expected))

  it('preserves saved progress through Back, Forward and replacement without creating a case', () => {
    const events = new EventTarget()
    const location = { hash: '#/' }
    const entries = ['#/']
    let cursor = 0
    const history = {
      pushState: vi.fn((_state: unknown, _unused: string, url: string) => { entries.splice(++cursor); entries.push(url); location.hash = url }),
      replaceState: vi.fn((_state: unknown, _unused: string, url: string) => { entries[cursor] = url; location.hash = url }),
      back: () => { if (cursor > 0) { location.hash = entries[--cursor]; events.dispatchEvent(new Event('popstate')) } },
      forward: () => { if (cursor < entries.length - 1) { location.hash = entries[++cursor]; events.dispatchEvent(new Event('popstate')) } },
    }
    const persisted = storage({ 'casefile-investigation': saved.id })
    const fetch = vi.fn()
    const hashchange = vi.fn()
    const popstate = vi.fn()
    events.addEventListener('hashchange', hashchange)
    events.addEventListener('popstate', popstate)
    vi.stubGlobal('window', { location, history, dispatchEvent: events.dispatchEvent.bind(events) })
    vi.stubGlobal('localStorage', persisted)
    vi.stubGlobal('fetch', fetch)
    const original = JSON.stringify(saved)
    navigate(paths.game(saved.id, 'evidence'))
    navigate(paths.game(saved.id, 'equipment'))
    history.back()
    expect(parseRoute(location.hash)).toEqual({ name: 'game', id: saved.id, screen: 'evidence' })
    history.forward()
    expect(parseRoute(location.hash)).toEqual({ name: 'game', id: saved.id, screen: 'equipment' })
    navigate(paths.game(saved.id, 'equipment'))
    expect(history.pushState).toHaveBeenCalledTimes(2)
    navigate(paths.game(saved.id, 'interviews'), true)
    expect(history.replaceState).toHaveBeenCalledTimes(1)
    expect(hashchange).toHaveBeenCalledTimes(3)
    expect(popstate).toHaveBeenCalledTimes(2)
    expect(persisted.getItem('casefile-investigation')).toBe(saved.id)
    expect(persisted.setItem).not.toHaveBeenCalled()
    expect(JSON.stringify(saved)).toBe(original)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('renders separate menu, archive and room destinations without mutation', () => {
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    const html = renderToStaticMarkup(<><MainMenu /><ContinueScreen profile={profile} cases={[brief]} saves={[
      { id: saved.id, caseId: '001', detectiveId: 'adrian', closed: false },
      { id: 'closed-456', caseId: '001', detectiveId: 'adrian', closed: true },
    ]} /><GameNavigation state={saved} brief={brief} detective="Adrian Cross" screen="equipment" /></>)
    for (const href of ['#/new/detectives', '#/continue', '#/career', '#/settings', '#/investigations/saved-123/evidence', '#/investigations/closed-456/verdict']) expect(html).toContain(`href="${href}"`)
    expect(html).toContain('aria-current="page" href="#/investigations/saved-123/equipment"')
    expect(fetch).not.toHaveBeenCalled()
  })
})

describe('explicit assignment before beginning an investigation', () => {
  it('keeps locked detectives disabled and shows their unlock threshold in career', () => {
    const select = vi.fn()
    const html = renderToStaticMarkup(<DetectiveSelection profile={profile} onSelect={select} />)
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Unlock at 60 career points<\/button>/)
    expect(html).toContain('Select Adrian Cross')
    expect(select).not.toHaveBeenCalled()
    const career = renderToStaticMarkup(<CareerScreen profile={profile} />)
    expect(career).toContain('Unlock at 60 points')
    expect(career).toContain('Investigation Lens')
  })

  it('requires an explicit YES and offers NO before selecting a case', () => {
    const onConfirm = vi.fn()
    const html = renderToStaticMarkup(<DetectiveConfirmation detective={profile.detectives[0]} busy={false} onConfirm={onConfirm} />)
    expect(html).toContain('Are you sure you want to play as Adrian Cross?')
    expect(html).toMatch(/<button[^>]*>YES — Confirm Detective<\/button>/)
    expect(html).toContain('href="#/new/detectives">NO — Choose Another')
    expect(onConfirm).not.toHaveBeenCalled()
    expect(renderToStaticMarkup(<DetectiveConfirmation detective={profile.detectives[0]} busy onConfirm={onConfirm} />)).toMatch(/<button[^>]*disabled=""[^>]*>YES — Confirm Detective/)
    const session = storage()
    vi.stubGlobal('sessionStorage', session)
    expect(hasConfirmedDetective('adrian')).toBe(false)
    confirmDetective('adrian')
    expect(hasConfirmedDetective('adrian')).toBe(true)
    expect(hasConfirmedDetective('selena')).toBe(false)
    clearConfirmation()
    expect(hasConfirmedDetective('adrian')).toBe(false)
  })

  it('opens a briefing instead of creating a save and reserves creation for Begin', () => {
    const fetch = vi.fn()
    const onBegin = vi.fn()
    vi.stubGlobal('fetch', fetch)
    const original = JSON.stringify(profile)
    const selection = renderToStaticMarkup(<CaseSelection profile={profile} detective={profile.detectives[0]} cases={[brief]} />)
    expect(selection).toContain('href="#/new/adrian/cases/001/briefing"')
    expect(selection).toContain('Unsolved')
    expect(selection).not.toContain('Begin Investigation')
    const briefing = renderToStaticMarkup(<CaseBriefing detective={profile.detectives[0]} dossier={brief} solved={false} busy={false} onBegin={onBegin} />)
    expect(briefing).toContain('Investigation objectives')
    expect(briefing).toMatch(/<button[^>]*>Begin Investigation<\/button>/)
    expect(briefing).toContain('href="#/new/adrian/cases"')
    expect(renderToStaticMarkup(<CaseBriefing detective={profile.detectives[0]} dossier={brief} solved busy onBegin={onBegin} />)).toContain('disabled="">Opening investigation…')
    expect(JSON.stringify(profile)).toBe(original)
    expect(onBegin).not.toHaveBeenCalled()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('coalesces concurrent Begin calls to one creation and permits a retry after failure', async () => {
    const gate = createBeginGate<Investigation>()
    let resolve!: (value: Investigation) => void
    const create = vi.fn(() => new Promise<Investigation>(done => { resolve = done }))
    const first = gate(create)
    const duplicate = gate(create)
    expect(duplicate).toBe(first)
    await Promise.resolve()
    expect(create).toHaveBeenCalledTimes(1)
    resolve(saved)
    await expect(first).resolves.toBe(saved)
    const failure = gate(vi.fn().mockRejectedValue(new Error('API unavailable')))
    await expect(failure).rejects.toThrow('API unavailable')
    const retry = vi.fn().mockResolvedValue({ ...saved, id: 'retry-save' })
    await expect(gate(retry)).resolves.toMatchObject({ id: 'retry-save' })
    expect(retry).toHaveBeenCalledTimes(1)
  })
})

describe('draft and final report screen persistence', () => {
  it.each([null, '', '{broken', 'null', '[]', '{"suspect":1,"method":"switch","evidence":[]}', '{"suspect":"mara","method":"switch","evidence":[1]}'])('recovers malformed draft %s safely', raw => {
    expect(restoreTheory(raw)).toEqual({ suspect: '', method: '', evidence: [] })
  })

  it('restores the accusation draft on a later visit without modifying server progress', () => {
    const theory = { suspect: 'mara', method: 'switch', evidence: ['badge', 'relay'] }
    const raw = JSON.stringify(theory)
    const session = storage({ ['casefile-theory-' + saved.id]: raw })
    vi.stubGlobal('sessionStorage', session)
    const update = vi.fn()
    const original = JSON.stringify(saved)
    expect(restoreTheory(raw)).toEqual(theory)
    const render = () => renderToStaticMarkup(<AccusationScreen state={saved} brief={brief} busy={false} update={update} />)
    const first = render()
    expect(render()).toBe(first)
    expect(first).toContain('value="mara" selected=""')
    expect(first).toContain('value="switch" selected=""')
    expect(first.match(/checked=""/g)).toHaveLength(2)
    expect(first).toContain('Supporting evidence (2/2)')
    expect(update).not.toHaveBeenCalled()
    expect(session.setItem).not.toHaveBeenCalled()
    expect(session.getItem('casefile-theory-' + saved.id)).toBe(raw)
    expect(JSON.stringify(saved)).toBe(original)
  })

  it.each([true, false])('presents the %s solved result with navigation and the saved reward', solved => {
    const onReplay = vi.fn()
    const result: Investigation['result'] = { solved, score: solved ? 100 : 30, explanation: 'The saved case reconstruction.', breakdown: { Suspect: solved ? 50 : 0, Method: 30, Evidence: solved ? 20 : 0 }, career: { earned: solved ? 100 : 0, points: solved ? 100 : 0, newUnlocks: [], newEquipmentUnlocks: [], nextUnlock: null } }
    const html = renderToStaticMarkup(<ResultsScreen state={{ ...saved, result }} brief={brief} profile={profile} onReplay={onReplay} />)
    expect(html).toContain(solved ? 'Case Solved' : 'Case Unsolved')
    expect(html).toContain('href="#/">Return to Main Menu')
    expect(html).toContain('>Replay Case</button>')
    expect(html).toContain('Career points earned')
    expect(html).toContain('The saved case reconstruction.')
    expect(onReplay).not.toHaveBeenCalled()
  })

  it('supports legacy verdicts and offers saved evidence review without reopening an accusation', () => {
    const legacy = { ...saved, result: { solved: true, score: 80, breakdown: {}, explanation: 'Original archived explanation.' } }
    const html = renderToStaticMarkup(<ResultsScreen state={legacy} brief={brief} profile={profile} onReplay={() => {}} />)
    expect(html).toContain('Original archived explanation.')
    expect(html).toContain('legacy verdict predates career reward reports')
    expect(html).toContain('href="#/investigations/saved-123/evidence">Review Evidence')
    const nav = renderToStaticMarkup(<GameNavigation state={legacy} brief={brief} detective="Adrian Cross" screen="verdict" />)
    expect(nav).toContain('Final Verdict')
    expect(nav).not.toContain('/accusation')
    expect(renderToStaticMarkup(<ResultsScreen state={saved} brief={brief} profile={profile} onReplay={() => {}} />)).toBe('')
  })
})
