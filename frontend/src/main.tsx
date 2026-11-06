import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  api, canAccuse, rememberInvestigation, resume, start,
  type CaseBrief, type CaseSummary, type Investigation, type PlayerProfile, type SavedInvestigation,
} from './api'
import { AbilityPanel } from './AbilityPanel'
import { Equipment } from './Equipment'
import { Career, CareerReward } from './Career'
import { Interview } from './Interview'
import { Verdict } from './Verdict'
import './style.css'
import './progression.css'
import './tokens.css'
import './noir.css'

const tabs = ['Evidence board', 'Equipment', 'Interviews', 'Accusation'] as const

function App() {
  const [brief, setBrief] = useState<CaseBrief>()
  const [state, setState] = useState<Investigation>()
  const [tab, setTab] = useState<typeof tabs[number]>('Evidence board')
  const [person, setPerson] = useState('')
  const [profile, setProfile] = useState<PlayerProfile>()
  const [cases, setCases] = useState<CaseSummary[]>([])
  const [archive, setArchive] = useState<SavedInvestigation[]>([])
  const [roster, setRoster] = useState(false)
  const [suspect, setSuspect] = useState('')
  const [method, setMethod] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError('')
    try { await action() }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Something went wrong.') }
    finally { setBusy(false) }
  }

  function enter(saved: Investigation, dossier: CaseBrief) {
    rememberInvestigation(saved.id)
    setBrief(dossier)
    setState(saved)
    setPerson(dossier.suspects[0].id)
    setSelected([])
    setSuspect('')
    setMethod('')
    setTab(saved.result ? 'Accusation' : 'Evidence board')
    setRoster(false)
  }

  function load() {
    void run(async () => {
      const [career, catalog, saves, saved] = await Promise.all([
        api<PlayerProfile>('/profile'), api<CaseSummary[]>('/cases'),
        api<SavedInvestigation[]>('/investigations'), resume(),
      ])
      if (saved) enter(saved, await api<CaseBrief>('/case/' + saved.caseId))
      setProfile(career)
      setCases(catalog)
      setArchive(saves)
      setRoster(!saved)
    })
  }

  useEffect(load, [])

  function showRoster() {
    setRoster(true)
    void run(async () => {
      const [career, saves] = await Promise.all([
        api<PlayerProfile>('/profile'), api<SavedInvestigation[]>('/investigations'),
      ])
      setProfile(career)
      setArchive(saves)
    })
  }

  function begin(caseId: string, detectiveId: string) {
    void run(async () => {
      const dossier = await api<CaseBrief>('/case/' + caseId)
      enter(await start(caseId, detectiveId), dossier)
      setProfile(previous => previous && { ...previous, selectedDetective: detectiveId })
    })
  }

  function reopen(save: SavedInvestigation) {
    void run(async () => {
      const [saved, dossier] = await Promise.all([
        api<Investigation>('/investigations/' + save.id),
        api<CaseBrief>('/case/' + save.caseId),
      ])
      enter(saved, dossier)
    })
  }

  function update(path: string, data?: unknown) {
    if (!state) return
    void run(async () => {
      const updated = await api<Investigation>('/investigations/' + state.id + path, 'POST', data)
      setState(updated)
      if (updated.result) setProfile(await api<PlayerProfile>('/profile'))
    })
  }

  const count = Object.keys(state?.board ?? {}).length
  const detective = profile?.detectives.find(item => item.id === state?.detectiveId)
  return <div className="shell">
    <header className="mast"><div className="brand"><svg className="bureau-mark" viewBox="0 0 40 48" fill="none" stroke="currentColor" aria-hidden="true"><path d="M20 2 37 9v17c0 9-9 16-17 20C12 42 3 35 3 26V9Z"/><path d="M20 7 32 12v14c0 6-6 12-12 15-6-3-12-9-12-15V12Z" opacity=".4"/><circle cx="18" cy="21" r="7"/><path d="m23 27 6 7M14 21h8M18 17v8"/></svg>CASEFILE<span className="accent"> AI</span></div><div className="label">DETECTIVE BUREAU / INVESTIGATIONS DIVISION</div></header>
    <main>
      {error && <p className="error" role="alert">{error}</p>}
      {!profile && (busy ? <p role="status">Opening dossier…</p> : <button onClick={load}>Retry</button>)}
      {profile && roster && <>
        <Career profile={profile} cases={cases} busy={busy} onStart={begin}
          onSelect={detectiveId => void run(async () => setProfile(await api<PlayerProfile>(
            '/profile/detective', 'PUT', { detectiveId },
          )))}
          onBack={state ? () => setRoster(false) : undefined} />
        {archive.length > 0 && <section className="save-archive" aria-labelledby="archive-title">
          <div className="label accent">DOSSIER ARCHIVE</div>
          <h2 id="archive-title">Saved investigations</h2>
          <ul>{archive.map(save => <li key={save.id}><button disabled={busy} onClick={() => reopen(save)}>
            <strong>{cases.find(item => item.id === save.caseId)?.title ?? save.caseId}</strong>
            <span className="muted">{profile.detectives.find(item => item.id === save.detectiveId)?.name} · {save.closed ? 'Read verdict' : 'Resume investigation'}</span>
          </button></li>)}</ul>
        </section>}
      </>}
      {!roster && brief && state && <>
        {!(state.result && tab === 'Accusation') && <section className={tab === 'Interviews' ? 'hero compact' : 'hero'}>
          <div className="label accent">CASE {brief.number} / FIELD DOSSIER</div>
          <h1>{brief.title}</h1>
          <div className="label location">{brief.location}</div>
          {tab !== 'Interviews' && <p>{brief.brief}</p>}
        </section>}

        <div className="strip">
          <span><i /> {state.result ? 'CASE CLOSED' : 'INVESTIGATION OPEN'}</span>
          <span>{count}/{brief.evidence.length} EVIDENCE FILES</span>
          <span>{state.interviews.length} RECORDED ANSWERS</span><span>{detective?.name}</span>
        </div>
        <nav aria-label="Investigation sections">{tabs.map((item, index) =>
          <button key={item} disabled={busy} aria-pressed={tab === item} onClick={() => setTab(item)}><small>0{index + 1}</small> {item}</button>
        )}
          <button className="investigation-profile" disabled={busy} onClick={showRoster}>Career &amp; cases</button>
        </nav>
        {(tab === 'Evidence board' || tab === 'Interviews') && <AbilityPanel key={state.id} state={state} brief={brief} person={person}
          busy={busy} inInterview={tab === 'Interviews'} onUse={(type, target) => update('/ability', { type, target })} />}
        {tab === 'Evidence board' && <section>
          <h2>Evidence board</h2><p className="muted">Examine files to pin them to your board. Compare them with the interview record.</p>
          <div className="cards evidence-files">{brief.evidence.map((clue, index) => <article key={clue.id}>
            <div className="label accent">FILE 0{index + 1} {state.board[clue.id] && ' / PINNED'}</div>
            <h3>{clue.title}</h3><p className="muted">{clue.source}</p>
            {state.board[clue.id] ? <p>{state.board[clue.id]}</p> :
              <button disabled={busy || !!state.result} onClick={() => update('/evidence/' + clue.id)}>Examine file →</button>}
          </article>)}</div>
        </section>}
        {tab === 'Equipment' && <Equipment key={state.id} state={state} brief={brief} busy={busy} onUpdate={setState} />}
        {tab === 'Interviews' && <Interview key={state.id + person} id={state.id} person={person}
          suspects={brief.suspects} closed={!!state.result} busy={busy} pressureUsed={state.ability?.type === 'pressure'} onSelect={setPerson} onUpdate={setState} onBusy={setBusy} />}
        {tab === 'Accusation' && <section>
          {state.result ? <Verdict result={state.result} title={brief.title} busy={busy} onRestart={showRoster}
            careerReward={state.result.career && <CareerReward reward={state.result.career} profile={profile} />} /> : <>
            <h2>File your accusation</h2><p className="muted">Choose a suspect, a method, and two examined files. Submitting closes this investigation.</p>
            <form onSubmit={event => {
              event.preventDefault()
              if (canAccuse(suspect, method, selected, state.board)) update('/accusation', { suspect, method, evidence: selected })
            }}>
              <label>Suspect<select value={suspect} onChange={event => setSuspect(event.target.value)}><option value="">Select suspect</option>{brief.suspects.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
              <label>Method<select value={method} onChange={event => setMethod(event.target.value)}><option value="">Select method</option>{Object.entries(brief.methods).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
              <fieldset><legend>Supporting evidence ({selected.length}/2)</legend>
                {!count && <p className="muted">Examine files on the evidence board first.</p>}
                {brief.evidence.filter(item => state.board[item.id]).map(item => <label className="check" key={item.id}>
                  <input type="checkbox" checked={selected.includes(item.id)} disabled={selected.length === 2 && !selected.includes(item.id)} onChange={event =>
                    setSelected(event.target.checked ? [...selected, item.id] : selected.filter(id => id !== item.id))
                  } />{item.title}
                </label>)}
              </fieldset>
              <button className="primary" disabled={busy || !canAccuse(suspect, method, selected, state.board)}>Submit accusation →</button>
            </form>
          </>}
        </section>}
      </>}
    </main>
    <footer>CASEFILE AI <span>•</span> FICTIONAL INVESTIGATIONS DIVISION</footer>
  </div>
}

createRoot(document.getElementById('root')!).render(<App />)
