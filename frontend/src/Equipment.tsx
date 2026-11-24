import { useEffect, useState } from 'react'
import { api, type CaseBrief, type EquipmentExamination, type EquipmentInventory, type EquipmentTool, type Investigation } from './api'
import './equipment.css'

export function ToolIcon({ id }: { id: string }) {
  return <svg className="tool-icon" viewBox="0 0 100 80" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    {id === 'lens' ? <><circle cx="40" cy="31" r="22" /><circle cx="40" cy="31" r="16" strokeWidth=".6" /><path d="m55 48 23 23 6-6-23-23M27 30h26M40 18v26" /></> :
      id === 'forensic' ? <><rect x="12" y="23" width="76" height="47" rx="5" /><path d="M33 23V12h34v11M12 38h76M42 44h16v17H42zM50 47v11M46 52h8" /><path d="M23 49v12m5-12v12m44-12v12" strokeWidth="1" /></> :
      id === 'digital' ? <><rect x="13" y="10" width="74" height="49" rx="3" /><path d="M6 69h88l-7-10H13zM23 39h9l5-16 9 26 7-19 6 9h18" /><path d="M22 18h55" strokeWidth=".5" /></> :
        <><rect x="7" y="7" width="86" height="64" rx="3" /><path d="M15 38h70M20 38V23m30 15v15m29-15V23" /><rect x="13" y="14" width="18" height="12" /><rect x="40" y="53" width="20" height="11" /><rect x="69" y="14" width="17" height="12" /></>}
  </svg>
}

export function EquipmentCollection({ tools, points }: { tools: EquipmentTool[]; points: number }) {
  return <section className="equipment-collection" aria-label="Career equipment inventory">
    <p className="label accent">FIELD SUPPLY / PERMANENT ISSUE</p><h2>Equipment locker</h2>
    <p className="muted">Issued as your career grows. Unlocks never spend career points.</p>
    <div className="tool-rack">{tools.map(tool => <article key={tool.id} className={'tool-card ' + (!tool.unlocked ? 'is-locked' : '')}>
      <ToolIcon id={tool.id} /><span className="label">{tool.unlocked ? 'Issued' : 'Locked · ' + tool.threshold + ' points'}</span>
      <h3>{tool.name}</h3><p>{tool.description}</p>
      {!tool.unlocked && <><progress aria-label={tool.name + ' unlock progress'} value={points} max={tool.threshold} /><small>{tool.threshold - points} more career points</small></>}
    </article>)}</div>
  </section>
}

export function moveEvent(order: string[], index: number, direction: -1 | 1) {
  const destination = index + direction
  if (destination < 0 || destination >= order.length) return order
  const result = [...order]
  ;[result[index], result[destination]] = [result[destination], result[index]]
  return result
}

function InspectionArtwork({ target }: { target: string }) {
  if (target === 'relay') return <g stroke="#9eaa8c" fill="none"><rect x="25" y="20" width="250" height="140" rx="5" fill="#343e35" /><circle cx="45" cy="38" r="5" /><circle cx="254" cy="140" r="5" /><rect x="95" y="52" width="110" height="75" fill="#c8c6a6" /><path d="M108 70h78m-78 12h55m-55 12h78m-78 12h62" stroke="#575b47" /><circle cx="58" cy="105" r="11" /><path d="M230 63v50m-12-25h24" /></g>
  if (target === 'seal') return <g stroke="#a5b1a0" fill="none"><rect x="28" y="20" width="244" height="135" fill="#343e36" /><path d="M50 30v105m25-105v105m25-105v105m25-105v105m25-105v105m25-105v105m25-105v105m25-105v105m25-105v105" /><rect x="39" y="57" width="41" height="30" fill="#ac8864" /><path d="M48 66h22m-22 9h22M48 141h204m-204 8h204" strokeWidth="3" /><path d="M251 43h13v26h-13" strokeWidth="4" /></g>
  if (target === 'preview') return <g stroke="#aaa87e" fill="none"><rect x="25" y="17" width="250" height="145" fill="#d0ccb0" /><path d="M45 35h76m-76 8h54" stroke="#605f4d" /><path d="M45 60h207M45 80h207M45 100h207M45 120h207M45 140h207M55 55v90m35-90v90m35-90v90m35-90v90m35-90v90m35-90v90" stroke="#a8a487" strokeWidth=".5" /><path d="m45 78 27 5 20-8 18 4 16 42h39l13-34 25-5 20 6 29-8" stroke="#394d47" strokeWidth="2.5" /><path d="M45 121h207" stroke="#8a493b" strokeDasharray="4 4" /></g>
  return <g stroke="#a99b73" fill="none"><rect x="28" y="20" width="244" height="140" fill="#504a37" /><rect x="43" y="33" width="214" height="114" fill="#c8c3a2" /><rect x="59" y="48" width="180" height="83" stroke="#858366" /><path d="m65 115 31-37 28 17 32-30 35 46 25-22 18 27" fill="#737964" /><path d="M48 34h16v12H48zM236 133h17v12h-17z" fill="#5f6254" /><path d="M217 35 250 66m-27-31 27 27" stroke="#e1dfc6" /><path d="M63 138h26" stroke="#74674b" strokeWidth="2" /></g>
}

function LensInspection({ examination, selected, disabled, onSelect }: { examination: EquipmentExamination; selected?: string; disabled: boolean; onSelect: (id: string) => void }) {
  const index = examination.choices.findIndex(choice => choice.id === selected)
  const center = index < 0 ? 150 : 60 + index * 90
  return <div className="lens-instrument">
    <p className="label">REFERENCE SCHEMATIC / SELECT AN INSPECTION REGION</p>
    <div className="lens-reference"><svg viewBox="0 0 300 180" aria-label="Evidence inspection diagram" role="img"><InspectionArtwork target={examination.target} />
      {index >= 0 && <g stroke="#ffdb8a" fill="none"><circle cx={center} cy="90" r="28" strokeWidth="1.5" /><path d={'M' + (center - 37) + ' 90h14m46 0h14M' + center + ' 53v14m0 46v14'} /></g>}
    </svg><div className="lens-hotspots">{examination.choices.map((choice, position) => <button key={choice.id} type="button" aria-label={'Inspect ' + choice.label} aria-pressed={selected === choice.id} disabled={disabled} onClick={() => onSelect(choice.id)} style={{ left: (20 + position * 30) + '%' }}>{position + 1}</button>)}</div></div>
    <div className="lens-magnification"><svg viewBox={(center - 32) + ' 58 64 64'} aria-hidden="true"><InspectionArtwork target={examination.target} /></svg>
      <div><span className="label accent">3× OPTICAL VIEW</span><strong>{examination.choices.find(choice => choice.id === selected)?.label ?? 'Choose a numbered region'}</strong><small>{examination.completed ? 'Browse the regions. Your finding is saved in field notes.' : selected ? 'Confirm your inspection below to record a finding.' : 'Use the diagram or region labels below.'}</small></div>
    </div>
  </div>
}

export function ExaminationScene({ examination, detail, busy, closed, onUse }: {
  examination: EquipmentExamination; detail?: string; busy: boolean; closed: boolean
  onUse: (selection: string[]) => void
}) {
  const [selection, setSelection] = useState<string[]>(examination.kind === 'timeline' ? examination.choices.map(item => item.id) : [])
  const isTimeline = examination.kind === 'timeline'
  const isDigital = examination.kind === 'digital'
  const disabled = busy || closed || examination.completed || !examination.available
  const selectionDisabled = examination.kind === 'lens' ? busy || (!examination.available && !examination.completed && !closed) : disabled
  const valid = isTimeline ? selection.length === examination.choices.length : selection.length === (isDigital ? 2 : 1)
  const toggle = (id: string) => setSelection(previous => previous.includes(id) ? previous.filter(value => value !== id) : isDigital ? [...previous.slice(-1), id] : [id])
  return <div className={'examination-scene scene-' + examination.kind}>
    <div className="label accent">{examination.kind === 'lens' ? 'OPTICAL INSPECTION' : examination.kind === 'forensic' ? 'TRACE EXAMINATION' : isDigital ? 'SOURCE CORRELATION' : 'EVENT RECONSTRUCTION'}</div>
    <h3>{examination.title}</h3><p>{examination.prompt}</p>
    {detail && <blockquote className="equipment-source"><span className="label">Examined record</span><p>{detail}</p></blockquote>}
    {examination.kind === 'lens' && <LensInspection examination={examination} selected={selection[0]} disabled={selectionDisabled} onSelect={toggle} />}
    {isTimeline ? <>
      <p className="muted">Arrange these recorded events from earliest to latest. Use the arrows to move each card.</p>
      <ol className="event-track">{selection.map((id, index) => <li key={id}>
        <span className="event-number">{index + 1}</span><span>{examination.choices.find(choice => choice.id === id)?.label}</span>
        <div><button type="button" aria-label={'Move event ' + (index + 1) + ' earlier'} disabled={disabled || index === 0} onClick={() => setSelection(moveEvent(selection, index, -1))}>↑</button>
          <button type="button" aria-label={'Move event ' + (index + 1) + ' later'} disabled={disabled || index === selection.length - 1} onClick={() => setSelection(moveEvent(selection, index, 1))}>↓</button></div>
      </li>)}</ol>
    </> : <>
      {isDigital && <div className="analyzer-display" aria-live="polite"><span>CHANNEL A · {examination.choices.find(choice => choice.id === selection[0])?.label ?? 'Awaiting source'}</span><span className={'signal-trace ' + (selection[0] ? 'is-connected' : '')} aria-hidden="true">━━╱╲━━╱╲━━━╱╲━━━━</span><span>CHANNEL B · {examination.choices.find(choice => choice.id === selection[1])?.label ?? 'Awaiting source'}</span><span className={'signal-trace ' + (selection[1] ? 'is-connected' : '')} aria-hidden="true">━━━━╱╲━━╱╲━━╱╲━━━</span><i>{selection.length}/2 RECORDS LOADED · {selection.length === 2 ? 'READY FOR SERVER ANALYSIS' : 'SELECT TWO EXAMINED RECORDS'}</i></div>}
      <div className="inspection-choices" role="group" aria-label={isDigital ? 'Choose two information sources' : examination.kind === 'lens' ? 'Choose a region to inspect' : 'Choose examination technique'}>
        {examination.choices.map((choice, index) => <button key={choice.id} type="button" aria-pressed={selection.includes(choice.id)} disabled={selectionDisabled || (isDigital && !!examination.examinedSources && !examination.examinedSources.includes(choice.id))} onClick={() => toggle(choice.id)}>
          <span className="inspection-marker" aria-hidden="true">{examination.kind === 'lens' ? '⌕' : isDigital ? '▤' : '✛'} {String(index + 1).padStart(2, '0')}</span>{choice.label}{isDigital && examination.examinedSources && !examination.examinedSources.includes(choice.id) && <small> · Examine file first</small>}
        </button>)}
      </div>
    </>}
    {!examination.available && <p className="equipment-requirement">{examination.requirement}</p>}
    {examination.completed ? <p className="equipment-complete">✓ Finding recorded in your field notes.</p> : closed ? <p className="muted">This case is closed. Recorded findings remain available below.</p> : <button className="primary" type="button" disabled={disabled || !valid} onClick={() => onUse(selection)}>
      {busy ? 'Examining…' : isTimeline ? 'Check reconstruction' : isDigital ? 'Correlate selected records' : examination.kind === 'lens' ? 'Inspect selected region' : 'Run selected examination'}
    </button>}
  </div>
}

export function Equipment({ state, brief, busy, onUpdate, onBusy }: { state: Investigation; brief: CaseBrief; busy: boolean; onUpdate: (state: Investigation) => void; onBusy: (busy: boolean) => void }) {
  const [inventory, setInventory] = useState<EquipmentInventory>()
  const [toolId, setToolId] = useState('lens')
  const [examinationId, setExaminationId] = useState('')
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    let active = true
    setError('')
    api<EquipmentInventory>('/investigations/' + state.id + '/equipment').then(value => {
      if (active) setInventory(value)
    }).catch(failure => { if (active) setError(failure instanceof Error ? failure.message : 'Could not open the equipment locker.') })
    return () => { active = false }
  }, [state, revision])
  const tool = inventory?.tools.find(item => item.id === toolId)
  const examination = tool?.examinations.find(item => item.id === examinationId) ?? tool?.examinations[0]
  async function use(selection: string[]) {
    if (!examination || busy) return
    onBusy(true); setError('')
    try {
      const updated = await api<Investigation>('/investigations/' + state.id + '/equipment', 'POST', { toolId, examinationId: examination.id, selection })
      onUpdate(updated)
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Examination failed. Try again.') }
    finally { onBusy(false) }
  }
  return <section className="equipment-workbench" aria-labelledby="equipment-title">
    <header className="equipment-header"><div><p className="label accent">INVESTIGATIONS DIVISION / FIELD EQUIPMENT</p><h2 id="equipment-title">The workbench</h2>
      <p className="muted">Examine a file on the evidence board, then bring it here for a closer look.</p></div><span className="equipment-points">{inventory?.points ?? '—'}<small>CAREER POINTS</small></span></header>
    {!inventory && !error && <p role="status">Opening equipment locker…</p>}
    {inventory && <>
      <div className="tool-rack" role="group" aria-label="Select investigation tool">{inventory.tools.map(item => <button type="button" className={'tool-card ' + (!item.unlocked ? 'is-locked' : '')} key={item.id} disabled={busy} aria-pressed={item.id === toolId}
        onClick={() => { setToolId(item.id); setExaminationId(''); setError('') }}>
        <ToolIcon id={item.id} /><span className="label">{item.unlocked ? 'Issued / Ready' : 'Locked / ' + item.threshold + ' points'}</span><strong>{item.name}</strong>
        <small>{item.unlocked ? item.examinations.filter(exam => exam.completed).length + ' findings recorded' : item.remaining + ' more career points'}</small>
      </button>)}</div>
      {tool && <div className="equipment-station"><aside className="equipment-manual"><p className="label accent">FIELD MANUAL</p><h3>{tool.name}</h3><p>{tool.description}</p>
        <p className="muted">Equipment complements your detective ability. Findings support deductions; your accusation is still your decision.</p>
        {!tool.unlocked && <p className="equipment-requirement">Unlocks permanently at {tool.threshold} career points. Earn {tool.remaining} more by solving unique cases. Your points are never spent.</p>}
        {tool.unlocked && <label>Compatible examination<select value={examination?.id ?? ''} disabled={busy} onChange={event => { setExaminationId(event.target.value); setError('') }}>
          {tool.examinations.map(item => <option value={item.id} key={item.id}>{item.title}{item.completed ? ' · Recorded' : item.available ? '' : ' · Examine sources first'}</option>)}
        </select></label>}
        {examination && tool.unlocked && <ul className="equipment-sources">{examination.sources.map(id => <li key={id}>{state.board[id] ? '✓ ' : '○ '}{brief.evidence.find(item => item.id === id)?.title ?? id}</li>)}</ul>}
      </aside>
        {tool.unlocked && examination ? <ExaminationScene key={state.id + examination.id} examination={examination} detail={state.board[examination.target]} busy={busy} closed={!!state.result} onUse={selection => void use(selection)} /> : <div className="sealed-equipment"><ToolIcon id={tool.id} /><p>{tool.unlocked ? 'No compatible examinations in this case.' : 'Reserved for your next career milestone'}</p></div>}
      </div>}
      <section className="equipment-notes" aria-labelledby="equipment-notes-title"><p className="label accent">PERSISTENT INVESTIGATION RECORD</p><h3 id="equipment-notes-title">Field notes</h3>
        {inventory.findings.length ? inventory.findings.map(finding => <article key={finding.id}><span className="label">{inventory.tools.find(item => item.id === finding.toolId)?.name}</span><h4>{finding.title}</h4><p>{finding.message}</p></article>) : <p className="muted">New observations will be saved here with this investigation.</p>}
      </section>
    </>}
    {error && <div className="equipment-error" role="alert"><p>{error}</p>{!inventory && <button onClick={() => setRevision(value => value + 1)}>Retry equipment locker</button>}</div>}
  </section>
}
