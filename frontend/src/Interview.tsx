import { useEffect, useRef, useState } from 'react'
import { api, type CaseBrief, type InterviewScene, type Investigation } from './api'
import { Portrait } from './Portrait'
import './interview.css'

interface Props {
  id: string
  suspects: CaseBrief['suspects']
  person: string
  closed: boolean
  busy: boolean
  pressureUsed: boolean
  examinedFiles?: CaseBrief['evidence']
  onSelect: (id: string) => void
  onUpdate: (state: Investigation) => void
  onBusy: (busy: boolean) => void
}

export function InterviewOptions({ options, closed, disabled, onAsk, examinedFiles = [] }: {
  options: InterviewScene['options']
  closed: boolean
  disabled: boolean
  onAsk: (topic: string, evidence?: string) => void
  examinedFiles?: CaseBrief['evidence']
}) {
  const [citations, setCitations] = useState<Record<string, string>>({})
  const questions = options.filter(option => !option.presentation)
  const confrontations = options.filter(option => option.presentation)
  return <div className="interview-prompts">
    <h3>{closed ? 'Archived questions' : 'Choose your next question'}</h3>
    <div className="interview-options">
      {questions.map(option => <button key={option.id} disabled={closed || disabled || option.status !== 'available'}
        onClick={() => onAsk(option.id)}>
        <span>{option.label}</span>
        <small>{option.status === 'asked' ? 'Asked' : option.status === 'locked' ? option.hint ?? 'Locked' : 'Ask →'}</small>
      </button>)}
    </div>
    {!!confrontations.length && <section className="reasoning-panel">
      <h3>Confront with evidence</h3>
      <p>Establish the account and its related deduction, then present the examined file that challenges it.</p>
      {confrontations.map(option => <div className="confrontation" key={option.id}>
        <strong>{option.label}</strong>
        {option.status === 'asked' && <span>Recorded in transcript</span>}
        {option.status === 'locked' && <span className="muted">{option.hint}</span>}
        {option.status === 'available' && !closed && <>
          <label>File to present<select value={citations[option.id] ?? ''} disabled={disabled}
            onChange={event => setCitations({ ...citations, [option.id]: event.target.value })}>
            <option value="">Choose an examined file</option>
            {examinedFiles.map(file => <option key={file.id} value={file.id}>{file.title}</option>)}
          </select></label>
          <button disabled={disabled || !citations[option.id]}
            onClick={() => onAsk(option.id, citations[option.id])}>Present evidence</button>
        </>}
      </div>)}
    </section>}
  </div>
}

export function Interview({ id, suspects, person, closed, busy, pressureUsed, examinedFiles, onSelect, onUpdate, onBusy }: Props) {
  const [scene, setScene] = useState<InterviewScene>()
  const [pending, setPending] = useState('')
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const transcript = useRef<HTMLDivElement>(null)
  const suspect = suspects.find(item => item.id === person)!
  const path = '/investigations/' + id + '/interviews'

  useEffect(() => {
    let active = true
    api<InterviewScene>(path + '/' + person)
      .then(value => { if (active) setScene(value) })
      .catch(failure => { if (active) setError(failure.message) })
    return () => { active = false }
  }, [path, person, attempt, pressureUsed])

  useEffect(() => {
    if (transcript.current) transcript.current.scrollTop = transcript.current.scrollHeight
  }, [scene?.transcript.length, pending])

  async function ask(topic: string, evidence?: string) {
    onBusy(true)
    setPending(topic)
    setError('')
    try {
      onUpdate(await api<Investigation>(path, 'POST', { suspect: person, topic, evidence }))
      setScene(await api<InterviewScene>(path + '/' + person))
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not update the interview.')
    } finally {
      setPending('')
      onBusy(false)
    }
  }

  return <section className="interview" aria-labelledby="interview-title">
    <div className="label accent">ROOM 02 / AUDIO RECORDING</div>
    <h2 id="interview-title">Interview room</h2>
    <p className="muted">Compare accounts, pursue follow-ups, and bring evidence into the room.</p>
    <div className="interview-roster" aria-label="Choose a suspect">
      {suspects.map((item, index) => <button key={item.id} aria-pressed={item.id === person}
        disabled={busy} onClick={() => onSelect(item.id)}>
        <span className="label">0{index + 1}</span>
        <strong>{item.name}</strong><span className="muted">{item.role}</span>
      </button>)}
    </div>
    <div className="interview-stage">
      <div className="interview-subject">
        <Portrait suspect={person} name={suspect.name} />
        <div className="interview-caption">
          <div className="label accent">ON THE RECORD</div>
          <h3>{suspect.name}</h3><p>{suspect.role}</p>
        </div>
      </div>
      <div className="interview-record">
        <div className="interview-record-header label"><span>Conversation transcript</span><span>{scene?.transcript.length ?? 0} exchanges</span></div>
        <div className="interview-transcript" ref={transcript} role="log" aria-label={suspect.name + ' transcript'} tabIndex={0}>
          {scene && <>
            <div className="interview-line"><span className="label accent">{suspect.name}</span><p>{scene.opening}</p></div>
            {scene.transcript.map(entry => <div className="interview-exchange" key={entry.topic}>
              <div className="interview-line investigator"><span className="label">Detective</span><p>{entry.question}</p>
                {entry.evidence && <small>Presented: {examinedFiles?.find(file => file.id === entry.evidence)?.title ?? entry.evidence}</small>}
              </div>
              <div className="interview-line"><span className="label accent">{suspect.name}</span><p>{entry.answer}</p></div>
              {entry.contradiction && <p className="recorded-contradiction"><strong>Contradiction recorded.</strong> {entry.contradiction}</p>}
            </div>)}
            {pending && !scene.transcript.some(entry => entry.topic === pending) && <div className="interview-line investigator">
              <span className="label">Detective</span><p>{scene.options.find(option => option.id === pending)?.label}</p>
            </div>}
          </>}
          {!scene && !error && <p role="status">Opening interview record…</p>}
          {pending && <p className="muted" role="status">Recording response…</p>}
        </div>
        {error && <div className="interview-error"><p className="error" role="alert">{error}</p>
          <button onClick={() => { setError(''); setAttempt(value => value + 1) }}>Refresh transcript</button></div>}
      </div>
    </div>
    {scene && <InterviewOptions options={scene.options} closed={closed} disabled={busy}
      examinedFiles={examinedFiles} onAsk={(topic, evidence) => void ask(topic, evidence)} />}
  </section>
}
