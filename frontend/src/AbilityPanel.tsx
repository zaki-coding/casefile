import { useState } from 'react'
import type { CaseBrief, Investigation } from './api'

interface Props {
  state: Investigation
  brief: CaseBrief
  busy: boolean
  person: string
  inInterview: boolean
  onUse: (type: Investigation['abilityOptions']['type'], target?: string) => void
}

export function AbilityPanel({ state, brief, busy, person, inInterview, onUse }: Props) {
  const [fileId, setFileId] = useState('')
  const { type, targets, requiredEvidence } = state.abilityOptions
  const names = { insight: 'Insight', pressure: 'Pressure', analysis: 'Deep Analysis' }
  const target = targets[0]
  const pressureSuspect = brief.suspects.find(suspect => suspect.id === target)
  const pressureClue = brief.evidence.find(clue => clue.id === requiredEvidence)
  const analyzed = brief.evidence.find(clue => clue.id === state.ability?.target)
  const hasInterview = state.interviews.some(entry => entry.suspect === target)
  const hasLeverage = requiredEvidence !== undefined && Object.hasOwn(state.board, requiredEvidence)
  const files = brief.evidence.filter(clue => targets.includes(clue.id) && Object.hasOwn(state.board, clue.id))

  return <aside className="field-ability" aria-label="Detective ability">
    <div>
      <div className="label accent">FIELD ABILITY / {state.ability ? 'USED' : 'ONE USE'}</div>
      <h3>{names[type]}</h3>
      {state.ability ? <p role="status">
        {analyzed && <strong>{analyzed.title} · </strong>}{state.ability.message}
      </p> : state.result ? <p className="muted">This investigation is closed.</p> : <>
        {type === 'insight' && <p className="muted">Examine any two files, then compare their leads for an optional hint.</p>}
        {type === 'pressure' && <p className="muted">
          Examine {pressureClue?.title} and question {pressureSuspect?.name}, then apply Pressure in their interview.
        </p>}
        {type === 'analysis' && <p className="muted">Choose an examined file for a closer forensic reading.</p>}
      </>}
    </div>
    {!state.ability && !state.result && <div className="field-ability-actions">
      {type === 'insight' && <button disabled={busy || Object.keys(state.board).length < 2}
        onClick={() => onUse(type)}>Use Insight</button>}
      {type === 'pressure' && <button disabled={busy || !inInterview || person !== target || !hasInterview || !hasLeverage}
        onClick={() => onUse(type, target)}>Apply Pressure</button>}
      {type === 'analysis' && <>
        <label>Evidence for analysis
          <select value={fileId} disabled={busy || !files.length} onChange={event => setFileId(event.target.value)}>
            <option value="">Choose an examined file</option>
            {files.map(file => <option key={file.id} value={file.id}>{file.title}</option>)}
          </select>
        </label>
        <button disabled={busy || !fileId} onClick={() => onUse(type, fileId)}>Run Deep Analysis</button>
      </>}
    </div>}
  </aside>
}
