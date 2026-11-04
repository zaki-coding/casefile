import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { api, canAccuse, resume, start, type CaseBrief, type Investigation } from './api'
import './style.css'

const tabs = ['Evidence board', 'Interviews', 'Accusation'] as const

function App() {
  const [brief, setBrief] = useState<CaseBrief>()
  const [state, setState] = useState<Investigation>()
  const [tab, setTab] = useState<typeof tabs[number]>('Evidence board')
  const [person, setPerson] = useState('mara')
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

  function load() {
    void run(async () => {
      setBrief(await api<CaseBrief>('/case'))
      const saved = await resume()
      setState(saved)
      if (saved.result) setTab('Accusation')
    })
  }

  useEffect(load, [])

  function update(path: string, data?: unknown) {
    if (!state) return
    void run(async () => setState(await api<Investigation>('/investigations/' + state.id + path, 'POST', data)))
  }

  const count = Object.keys(state?.board ?? {}).length
  return <div className="shell">
    <header className="mast"><div className="brand"><span aria-hidden="true">◈</span> CASEFILE<span className="accent"> AI</span></div><div className="label">INVESTIGATION TERMINAL</div></header>
    <main>
      <section className="hero">
        <div className="label accent">CASE 001 / ART THEFT</div>
        <h1>{brief?.title ?? 'Casefile AI'}</h1>
        <div className="label location">{brief?.location}</div>
        <p>{brief?.brief}</p>
      </section>
      {error && <p className="error" role="alert">{error}</p>}
      {(!brief || !state) && (busy ? <p role="status">Opening dossier…</p> : <button onClick={load}>Retry</button>)}
      {brief && state && <>
        <div className="strip">
          <span><i /> {state.result ? 'CASE CLOSED' : 'INVESTIGATION OPEN'}</span>
          <span>{count}/{brief.evidence.length} EVIDENCE FILES</span>
          <span>{state.interviews.length} RECORDED ANSWERS</span>
        </div>
        <nav aria-label="Investigation sections">{tabs.map((item, index) =>
          <button key={item} aria-pressed={tab === item} onClick={() => setTab(item)}><small>0{index + 1}</small> {item}</button>
        )}</nav>
        {tab === 'Evidence board' && <section>
          <h2>Evidence board</h2><p className="muted">Examine files to pin them to your board. Compare them with the interview record.</p>
          <div className="cards">{brief.evidence.map((clue, index) => <article key={clue.id}>
            <div className="label accent">FILE 0{index + 1} {state.board[clue.id] && ' / PINNED'}</div>
            <h3>{clue.title}</h3><p className="muted">{clue.source}</p>
            {state.board[clue.id] ? <p>{state.board[clue.id]}</p> :
              <button disabled={busy || !!state.result} onClick={() => update('/evidence/' + clue.id)}>Examine file →</button>}
          </article>)}</div>
        </section>}
        {tab === 'Interviews' && <section>
          <h2>Interview room</h2><p className="muted">Question each suspect and compare their statements with the evidence.</p>
          <div className="cards">{brief.suspects.map(item => <button className="person" key={item.id} aria-pressed={person === item.id} onClick={() => setPerson(item.id)}>
            <strong>{item.name}</strong><span>{item.role}</span>
          </button>)}</div>
          <div className="questions">{Object.entries(brief.topics).map(([topic, label]) => {
            const answer = state.interviews.find(entry => entry.suspect === person && entry.topic === topic)
            return <article key={topic}><h3>{label}</h3>{answer ?
              <blockquote>{answer.answer}</blockquote> :
              <button disabled={busy || !!state.result} onClick={() => update('/interviews', { suspect: person, topic })}>Ask question →</button>}</article>
          })}</div>
        </section>}
        {tab === 'Accusation' && <section>
          {state.result ? <article className="verdict">
            <div className="label accent">{state.result.solved ? 'CASE SOLVED' : 'CASE UNSOLVED'}</div>
            <h2>{state.result.score} / 100</h2><p>{state.result.explanation}</p>
            <dl>{Object.entries(state.result.breakdown).map(([name, score]) => <div key={name}><dt>{name}</dt><dd>{score}</dd></div>)}</dl>
            <button disabled={busy} onClick={() => void run(async () => {
              setState(await start())
              setSelected([])
              setSuspect('')
              setMethod('')
              setTab('Evidence board')
            })}>Start a new investigation</button>
          </article> : <>
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
