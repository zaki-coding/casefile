import { useEffect, useRef } from 'react'
import type { Investigation } from './api'
import './verdict.css'

type Result = NonNullable<Investigation['result']>

interface VerdictProps {
  result: Result
  busy: boolean
  onRestart: () => void
}

const scoring = [
  { label: 'Suspect', maximum: 50 },
  { label: 'Method', maximum: 30 },
  { label: 'Evidence', maximum: 20 },
]

function performance(result: Result) {
  if (!result.solved) return 'Review the reconstruction to see where your theory diverged from the record.'
  if (result.score === 100) return 'Every part of your accusation is supported by the decisive evidence.'
  return 'You identified the culprit and method. The cited files show where your case could be stronger.'
}

function Finding({ label, correct }: { label: string; correct: boolean }) {
  return <span className={'closing-finding ' + (correct ? 'is-correct' : 'is-mismatch')}>
    <span aria-hidden="true">{correct ? '✓' : '×'}</span> {label}
  </span>
}

export function Verdict({ result, busy, onRestart }: VerdictProps) {
  const { details } = result
  const heading = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    heading.current?.focus()
  }, [])

  return <section className={'closing-dossier ' + (result.solved ? 'is-solved' : 'is-unsolved')} aria-labelledby="closing-title">
    <header className="closing-header">
      <div>
        <p className="closing-kicker">Final report / The Midnight Proof</p>
        <h2 id="closing-title" ref={heading} tabIndex={-1}>{result.solved ? 'Case Closed' : 'Case Unsolved'}</h2>
        <p>{performance(result)}</p>
      </div>
      <div className="closing-score"><strong>{result.score}</strong><span>/ 100 points</span></div>
    </header>

    <section className="closing-reveal" aria-labelledby="closing-reveal-title">
      <p className="closing-kicker">{details ? 'Confirmed culprit' : 'Archived solution'}</p>
      <h3 id="closing-reveal-title">{details?.culprit ?? 'The case reconstruction'}</h3>
      {details && <p className="closing-method">{details.method}</p>}
      <p>{result.explanation}</p>
    </section>

    {details && <section className="closing-section" aria-labelledby="closing-timeline-title">
      <p className="closing-kicker">Sequence of events</p>
      <h3 id="closing-timeline-title">Reconstructing midnight</h3>
      <ol className="closing-timeline">
        {details.timeline.map((event, index) => <li key={event.title + index}>
          <span className="closing-time">{event.time}</span>
          <div>
            <h4>{event.title}</h4>
            <p>{event.description}</p>
            <span className="closing-file">{event.evidence}</span>
          </div>
        </li>)}
      </ol>
    </section>}

    <section className="closing-section" aria-labelledby="closing-assessment-title">
      <p className="closing-kicker">Assessment</p>
      <h3 id="closing-assessment-title">How your accusation held up</h3>
      <div className="closing-assessment">
        <dl className="closing-breakdown">
          {scoring.map(({ label, maximum }) => {
            const points = result.breakdown[label] ?? 0
            return <div key={label}>
              <dt>{label}</dt>
              <dd><span>{points} / {maximum}</span>
                <progress aria-label={label + ' points'} value={points} max={maximum} />
              </dd>
            </div>
          })}
        </dl>
        {details ? <ul className="closing-choices">
          <li><strong>{details.suspectChoice}</strong><Finding label={details.suspectCorrect ? 'Correct suspect' : 'Incorrect suspect'} correct={details.suspectCorrect} /></li>
          <li><strong>{details.methodChoice}</strong><Finding label={details.methodCorrect ? 'Correct method' : 'Incorrect method'} correct={details.methodCorrect} /></li>
          {details.evidence.map(file => <li key={file.id}>
            <strong>{file.title}</strong>
            <Finding label={file.correct ? 'Decisive evidence' : 'No evidence points'} correct={file.correct} />
          </li>)}
        </ul> : <p className="closing-archive-note">This saved verdict includes the original score and solution. Choice-by-choice feedback is available in new investigations.</p>}
      </div>
    </section>

    <div className="closing-actions">
      <button type="button" className="primary" disabled={busy} onClick={onRestart}>{busy ? 'Opening investigation…' : 'Start a new investigation →'}</button>
    </div>
  </section>
}
