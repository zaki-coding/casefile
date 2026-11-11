import { useEffect, useRef, useState } from 'react'
import type { InvestigationProps } from './InvestigationScreens'
import { ScreenHeading } from './SetupScreens'
import './reasoning.css'

export function EvidenceConnections({ state, brief, busy, update }: InvestigationProps) {
  const [first, setFirst] = useState('')
  const [second, setSecond] = useState('')
  const [relationship, setRelationship] = useState('')
  const files = brief.evidence.filter(file => Object.hasOwn(state.board, file.id))
  const deductions = state.deductions ?? []

  return <section className="reasoning-panel" aria-labelledby="connection-title">
    <h2 id="connection-title">Connect evidence</h2>
    <p>Choose two examined files and the conclusion they support together. Established deductions open new interview lines.</p>
    {!!deductions.length && <ul className="deduction-list" aria-live="polite">{deductions.map(item => <li key={item.id}>
      <strong>{item.title}</strong><p>{item.explanation}</p>
      <small>{item.evidence.map(id => files.find(file => file.id === id)?.title ?? id).join(' + ')}</small>
    </li>)}</ul>}
    {!state.result && (files.length < 2 ? <p className="muted">Examine at least two files to compare them.</p> :
      <form onSubmit={event => {
        event.preventDefault()
        if (!busy && first && second && first !== second && relationship) {
          update('/connections', { evidence: [first, second], relationship })
        }
      }}>
        <div className="reasoning-fields">
          <label>First file<select aria-label="First file" value={first} onChange={event => setFirst(event.target.value)}>
            <option value="">Choose a file</option>
            {files.map(file => <option key={file.id} value={file.id} disabled={file.id === second}>{file.title}</option>)}
          </select></label>
          <label>Second file<select aria-label="Second file" value={second} onChange={event => setSecond(event.target.value)}>
            <option value="">Choose a file</option>
            {files.map(file => <option key={file.id} value={file.id} disabled={file.id === first}>{file.title}</option>)}
          </select></label>
        </div>
        <label>What do they establish?<select aria-label="Relationship" value={relationship} onChange={event => setRelationship(event.target.value)}>
          <option value="">Choose a relationship</option>
          {Object.entries(brief.relationships ?? {}).map(([id, title]) => <option key={id} value={id}
            disabled={deductions.some(item => item.id === id)}>{title}</option>)}
        </select></label>
        <button className="primary" disabled={busy || !first || !second || first === second || !relationship ||
          deductions.some(item => item.id === relationship)}>Test connection</button>
      </form>)}
  </section>
}

const claims = ['Identity', 'Motive', 'Method'] as const
type Claim = typeof claims[number]
type Draft = { suspect: string; motive: string; method: string; citations: Record<Claim, string> }
const emptyDraft: Draft = { suspect: '', motive: '', method: '', citations: { Identity: '', Motive: '', Method: '' } }

function readDraft(key: string): Draft {
  try {
    const saved = JSON.parse(sessionStorage.getItem(key) ?? 'null')
    if (saved && [saved.suspect, saved.motive, saved.method,
      ...claims.map(claim => saved.citations?.[claim])].every(value => typeof value === 'string')) {
      return saved
    }
  } catch {
    // A corrupt browser draft does not affect the investigation.
  }
  return emptyDraft
}

export function ReasonedAccusation({ state, brief, busy, update }: InvestigationProps) {
  const key = 'casefile-reasoning-draft-' + state.id
  const [draft, setDraft] = useState(() => readDraft(key))
  const [review, setReview] = useState(false)
  const reviewHeading = useRef<HTMLHeadingElement>(null)
  const suspects = Object.fromEntries(brief.suspects.map(person => [person.id, person.name]))
  const motives = brief.motives ?? {}
  const files = brief.evidence.filter(file => Object.hasOwn(state.board, file.id))
  const evidence = claims.map(claim => draft.citations[claim])
  const complete = Object.hasOwn(suspects, draft.suspect) && Object.hasOwn(motives, draft.motive) &&
    Object.hasOwn(brief.methods, draft.method) && new Set(evidence).size === claims.length &&
    evidence.every(id => Object.hasOwn(state.board, id))

  useEffect(() => {
    if (review) reviewHeading.current?.focus()
  }, [review])

  function change(next: Draft) {
    setDraft(next)
    sessionStorage.setItem(key, JSON.stringify(next))
  }

  const choices = [
    { field: 'suspect', label: 'Culprit', options: suspects },
    { field: 'motive', label: 'Motive', options: motives },
    { field: 'method', label: 'Method', options: brief.methods },
  ] as const

  if (review) return <section className="reasoning-panel">
    <h1 ref={reviewHeading} tabIndex={-1}>Review your accusation</h1>
    <dl className="accusation-review">{choices.map(({ field, label, options }, index) => {
      const claim = claims[index]
      const id = draft.citations[claim]
      return <div key={field}>
        <dt>{label}</dt><dd><strong>{options[draft[field]]}</strong>
          <p>{claim} evidence: {files.find(file => file.id === id)?.title}</p>
          <blockquote>{state.board[id]}</blockquote>
        </dd>
      </div>
    })}</dl>
    <p>Submitting closes this investigation and reveals the reconstruction.</p>
    <div className="screen-actions">
      <button disabled={busy} onClick={() => setReview(false)}>Edit accusation</button>
      <button className="primary" disabled={!complete || busy}
        onClick={() => update('/accusation', { suspect: draft.suspect, motive: draft.motive, method: draft.method, evidence })}>
        Submit accusation
      </button>
    </div>
  </section>

  return <>
    <ScreenHeading label="FORMAL ACCUSATION" title="Build your final case">
      <p>Choose a culprit, motive, and method. Cite a different examined file for each claim.</p>
    </ScreenHeading>
    <form onSubmit={event => { event.preventDefault(); if (complete && !busy) setReview(true) }}>
      {choices.map(({ field, label, options }) => <label key={field}>{label}
        <select aria-label={label} value={draft[field]} onChange={event => change({ ...draft, [field]: event.target.value })}>
          <option value="">Choose {label.toLowerCase()}</option>
          {Object.entries(options).map(([id, title]) => <option key={id} value={id}>{title}</option>)}
        </select>
      </label>)}
      <fieldset className="reasoning-fields">
        <legend>Supporting evidence</legend>
        {files.length < claims.length && <p>Examine at least three files before filing an accusation.</p>}
        {claims.map(claim => <label key={claim}>{claim} evidence
          <select aria-label={claim + ' evidence'} value={draft.citations[claim]}
            onChange={event => change({ ...draft, citations: { ...draft.citations, [claim]: event.target.value } })}>
            <option value="">Choose an examined file</option>
            {files.map(file => <option key={file.id} value={file.id}
              disabled={claims.some(other => other !== claim && draft.citations[other] === file.id)}>{file.title}</option>)}
          </select>
          {state.board[draft.citations[claim]] && <small className="muted">{state.board[draft.citations[claim]]}</small>}
        </label>)}
      </fieldset>
      <button className="primary" disabled={!complete || busy}>Review accusation</button>
    </form>
  </>
}
