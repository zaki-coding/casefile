import { useEffect, useRef, useState } from 'react'
import { api, type CaseBrief, type InterviewScene, type Investigation } from './api'
import { Portrait } from './Portrait'
import './interview.css'

interface Props {
  id: string
  suspects: CaseBrief['suspects']
  person: string
  closed: boolean
  onSelect: (id: string) => void
  onUpdate: (state: Investigation) => void
  onBusy: (busy: boolean) => void
}

export function InterviewOptions({ options, closed, disabled, onAsk }: {
  options: InterviewScene['options']
  closed: boolean
  disabled: boolean
  onAsk: (topic: string) => void
}) {
  return <div className="interview-prompts">
    <h3>{closed ? 'Archived questions' : 'Choose your next question'}</h3>
    <div className="interview-options">
      {options.map(option => <button key={option.id} disabled={closed || disabled || option.status !== 'available'}
        onClick={() => onAsk(option.id)}>
        <span>{option.label}</span>
        <small>{option.status === 'asked' ? 'Asked' : option.status === 'locked' ? option.hint ?? 'Locked' : 'Ask →'}</small>
      </button>)}
    </div>
  </div>
}

export function Interview({ id, suspects, person, closed, onSelect, onUpdate, onBusy }: Props) {
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
  }, [path, person, attempt])

  useEffect(() => {
    if (transcript.current) transcript.current.scrollTop = transcript.current.scrollHeight
  }, [scene?.transcript.length, pending])

  async function ask(topic: string) {
    onBusy(true)
    setPending(topic)
    setError('')
    try {
      onUpdate(await api<Investigation>(path, 'POST', { suspect: person, topic }))
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
        disabled={!!pending} onClick={() => onSelect(item.id)}>
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
              <div className="interview-line investigator"><span className="label">Detective</span><p>{entry.question}</p></div>
              <div className="interview-line"><span className="label accent">{suspect.name}</span><p>{entry.answer}</p></div>
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
    {scene && <InterviewOptions options={scene.options} closed={closed} disabled={!!pending || !!error}
      onAsk={topic => void ask(topic)} />}
  </section>
}
