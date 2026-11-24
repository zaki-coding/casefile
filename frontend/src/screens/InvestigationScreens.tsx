import { EvidenceConnections, ReasonedAccusation } from './Reasoning'
import { useState } from 'react'
import { canAccuse, type CaseBrief, type Investigation, type PlayerProfile } from '../api'
import { AbilityPanel } from '../AbilityPanel'
import { Equipment } from '../Equipment'
import { Interview } from '../Interview'
import { Verdict } from '../Verdict'
import { CareerReward } from '../Career'
import { paths, type GameScreen } from '../navigation'
import { ScreenHeading } from './SetupScreens'

export type InvestigationProps = { state: Investigation; brief: CaseBrief; busy: boolean; update: (path: string, data?: unknown) => void }

function EvidenceFile({ file, number, detail, busy, closed, examine }: {
  file: CaseBrief['evidence'][number]; number: number; detail?: string; busy: boolean; closed: boolean; examine: () => void
}) {
  const [folded, setFolded] = useState(false)
  const examined = detail !== undefined
  const titleId = 'file-title-' + file.id
  const detailId = 'file-detail-' + file.id
  return <article aria-labelledby={titleId} className={'evidence-file' + (examined ? ' is-examined' : '')}>
    <header><span className="label">File {String(number).padStart(2, '0')}</span>
      <span className="file-status">{examined ? '✓ Pinned' : 'Unexamined'}</span></header>
    <h3 id={titleId}>{file.title}</h3>
    <p className="file-source">{file.source}</p>
    <div id={detailId} hidden={!examined || folded} className="file-detail">{detail}</div>
    {(!closed || examined) && <button type="button" aria-expanded={examined && !folded} aria-controls={detailId}
      disabled={!examined && busy} onClick={() => examined ? setFolded(!folded) : examine()}>
      {examined ? folded ? 'Read pinned file' : 'Fold file' : 'Examine file'} <span aria-hidden="true">{examined && !folded ? '↑' : '↓'}</span>
    </button>}
  </article>
}

export function EvidenceScreen({ state, brief, busy, update }: InvestigationProps) {
  const pinned = Object.keys(state.board).length
  return <><ScreenHeading label="01 / EVIDENCE ROOM" title="Evidence board">
    <p>{state.result ? 'Review the files pinned during this investigation.' : 'Examine a file to pin its contents to the board.'}</p>
  </ScreenHeading>
    <section aria-labelledby="evidence-files-title">
      <div className="file-index-heading"><h2 id="evidence-files-title">Case files</h2>
        <span>{pinned} of {brief.evidence.length} examined</span></div>
      <div className="cards evidence-files">{brief.evidence.map((file, index) =>
        <EvidenceFile key={file.id} file={file} number={index + 1} detail={state.board[file.id]}
          busy={busy} closed={!!state.result} examine={() => update('/evidence/' + file.id)} />
      )}</div>
    </section>
    {state.reasoningVersion && <EvidenceConnections state={state} brief={brief} busy={busy} update={update} />}
    <AbilityPanel state={state} brief={brief} person={brief.suspects[0].id} busy={busy} inInterview={false}
      onUse={(type,target) => update('/ability',{type,target})} />
  </>
}
export function InterviewsScreen({ state, brief, busy, update, detectiveName, onUpdate, onBusy }: InvestigationProps & { detectiveName?: string; onUpdate: (s: Investigation) => void; onBusy: (b: boolean) => void }) {
  const [person,setPerson] = useState(() => {
    const saved = sessionStorage.getItem('casefile-suspect-'+state.id)
    return brief.suspects.some(s => s.id === saved) ? saved! : brief.suspects[0].id
  })
  return <><ScreenHeading label="02 / WITNESS ACCOUNTS" title="Suspect interviews">
    <p>Choose a witness to read their statement and follow up.</p></ScreenHeading>
    <Interview key={state.id+person} id={state.id} person={person} suspects={brief.suspects} detectiveName={detectiveName}
      examinedFiles={brief.evidence.filter(file => Object.hasOwn(state.board, file.id))} closed={!!state.result}
      busy={busy} pressureUsed={state.ability?.type==='pressure'} onSelect={id => {
        sessionStorage.setItem('casefile-suspect-'+state.id,id); setPerson(id)
      }} onUpdate={onUpdate} onBusy={onBusy} />
    <AbilityPanel state={state} brief={brief} person={person} busy={busy} inInterview onUse={(type,target) => update('/ability',{type,target})} />
  </>
}
export function EquipmentScreen({state,brief,busy,onUpdate,onBusy}: Omit<InvestigationProps,'update'> & {onUpdate:(s:Investigation)=>void;onBusy:(busy:boolean)=>void}) {
  return <><ScreenHeading label="03 / FIELD INSTRUMENTS" title="Detective equipment"><p className="muted">Bring the evidence into focus.</p></ScreenHeading><Equipment state={state} brief={brief} busy={busy} onUpdate={onUpdate} onBusy={onBusy} /></>
}
type Theory = {suspect:string;method:string;evidence:string[]}
export function restoreTheory(raw:string|null):Theory {
  try { const value=JSON.parse(raw??'null'); if(value && typeof value.suspect==='string' && typeof value.method==='string' && Array.isArray(value.evidence) && value.evidence.every((s:unknown)=>typeof s==='string')) return value } catch { /* A damaged draft never affects the save. */ }
  return {suspect:'',method:'',evidence:[]}
}
export function AccusationScreen(props: InvestigationProps) {
  return props.state.reasoningVersion ? <ReasonedAccusation {...props} /> : <OriginalAccusation {...props} />
}

function OriginalAccusation({state,brief,busy,update}:InvestigationProps) {
  const key='casefile-theory-'+state.id
  const [theory,setTheory]=useState(()=>restoreTheory(sessionStorage.getItem(key)))
  function change(next:Theory) { setTheory(next);sessionStorage.setItem(key,JSON.stringify(next)) }
  return <><ScreenHeading label="04 / FORMAL ACCUSATION" title="Build your final case"><p className="muted">Name the suspect. Establish the method. Let the evidence support your conclusion.</p></ScreenHeading><p className="equipment-requirement">Submitting an accusation closes this investigation. Your draft stays here while you review other rooms.</p><form onSubmit={e=>{e.preventDefault();if(canAccuse(theory.suspect,theory.method,theory.evidence,state.board))update('/accusation',theory)}}>
    <label>Suspect<select aria-label="Suspect" value={theory.suspect} onChange={e=>change({...theory,suspect:e.target.value})}><option value="">Select suspect</option>{brief.suspects.map(s=><option value={s.id} key={s.id}>{s.name}</option>)}</select></label><label>Method<select aria-label="Method" value={theory.method} onChange={e=>change({...theory,method:e.target.value})}><option value="">Select method</option>{Object.entries(brief.methods).map(([id,label])=><option value={id} key={id}>{label}</option>)}</select></label><fieldset><legend>Supporting evidence ({theory.evidence.length}/2)</legend>{!Object.keys(state.board).length && <p className="muted">Examine files in the evidence room first.</p>}{brief.evidence.filter(c=>state.board[c.id]).map(c=><label className="check" key={c.id}><input type="checkbox" checked={theory.evidence.includes(c.id)} disabled={theory.evidence.length===2&&!theory.evidence.includes(c.id)} onChange={e=>change({...theory,evidence:e.target.checked?[...theory.evidence,c.id]:theory.evidence.filter(id=>id!==c.id)})}/>{c.title}</label>)}</fieldset><button className="primary" disabled={busy||!canAccuse(theory.suspect,theory.method,theory.evidence,state.board)}>Submit accusation →</button></form></>
}
export function ResultsScreen({state,brief,profile,onReplay}:{state:Investigation;brief:CaseBrief;profile:PlayerProfile;onReplay:()=>void}) {
  if(!state.result)return null
  return <Verdict result={state.result} title={brief.title} location={brief.location} busy={false} onRestart={()=>{window.location.hash='#/'}} actions={<div className="results-actions"><a className="button-link primary" href="#/">Return to Main Menu</a><button onClick={onReplay}>Replay Case</button><a className="button-link" href={'#'+paths.game(state.id,'evidence')}>Review Evidence</a></div>} careerReward={state.result.career?<CareerReward reward={state.result.career} profile={profile}/>:<p className="closing-section muted">This legacy verdict predates career reward reports. Your permanent career record remains available from the main menu.</p>}/>
}
export const rooms: {id:GameScreen;label:string}[] = [
  {id:'evidence',label:'Evidence Board'},
  {id:'interviews',label:'Suspect Interviews'},
  {id:'equipment',label:'Detective Equipment'},
  {id:'accusation',label:'Accusation'},
]
export function GameNavigation({state,brief,screen,detective}:{state:Investigation;brief:CaseBrief;screen:GameScreen;detective:string}) {
  const links=state.result?[...rooms.filter(r=>r.id!=='accusation'),{id:'verdict' as const,label:'Final Verdict'}]:rooms
  return <aside className="game-rail">
    <a href="#/" className="menu-back">← Main Menu</a>
    <div className="game-context"><p className="label accent">Case {brief.number}</p><h2>{brief.title}</h2>
      <p className="muted">{detective} · {state.result?'Closed':'Open'}</p></div>
    <nav className="game-nav" aria-label="Investigation rooms">{links.map(room =>
      <a key={room.id} className={screen===room.id?'is-active':''} aria-current={screen===room.id?'page':undefined} href={'#'+paths.game(state.id,room.id)}>
        <span>{room.label}</span></a>)}</nav>
    <p className="rail-counts">{Object.keys(state.board).length}/{brief.evidence.length} files examined<br/>{state.interviews.length} recorded {state.interviews.length === 1 ? 'answer' : 'answers'}</p>
    <a href="#/continue" className="menu-back">Dossier Archive →</a>
  </aside>
}
