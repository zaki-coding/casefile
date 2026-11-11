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
export function EvidenceScreen({ state, brief, busy, update }: InvestigationProps) {
  return <><ScreenHeading label="01 / EVIDENCE ROOM" title="Evidence board"><p className="muted">Pin the facts. Find the gaps between them.</p></ScreenHeading><AbilityPanel state={state} brief={brief} person={brief.suspects[0].id} busy={busy} inInterview={false} onUse={(type,target) => update('/ability',{type,target})} />
    {state.reasoningVersion && <EvidenceConnections state={state} brief={brief} busy={busy} update={update} />}
    <div className="cards evidence-files">{brief.evidence.map((clue,index) => <article key={clue.id}><div className="label accent">FILE {String(index+1).padStart(2,'0')}{state.board[clue.id] ? ' / PINNED' : ''}</div><h3>{clue.title}</h3><p className="muted">{clue.source}</p>{state.board[clue.id] ? <p>{state.board[clue.id]}</p> : <button disabled={busy || !!state.result} onClick={() => update('/evidence/'+clue.id)}>Examine file →</button>}</article>)}</div></>
}
export function InterviewsScreen({ state, brief, busy, update, onUpdate, onBusy }: InvestigationProps & { onUpdate: (s: Investigation) => void; onBusy: (b: boolean) => void }) {
  const [person,setPerson] = useState(() => {
    const saved = sessionStorage.getItem('casefile-suspect-'+state.id)
    return brief.suspects.some(s => s.id === saved) ? saved! : brief.suspects[0].id
  })
  return <><ScreenHeading label="02 / WITNESS ACCOUNTS" title="Suspect interviews"><p className="muted">One room. Competing versions of the truth.</p></ScreenHeading><AbilityPanel state={state} brief={brief} person={person} busy={busy} inInterview onUse={(type,target) => update('/ability',{type,target})} /><Interview key={state.id+person} id={state.id} person={person} suspects={brief.suspects} examinedFiles={brief.evidence.filter(file => Object.hasOwn(state.board, file.id))} closed={!!state.result} busy={busy} pressureUsed={state.ability?.type==='pressure'} onSelect={id => { sessionStorage.setItem('casefile-suspect-'+state.id,id); setPerson(id) }} onUpdate={onUpdate} onBusy={onBusy} /></>
}
export function EquipmentScreen({state,brief,busy,onUpdate}: Omit<InvestigationProps,'update'> & {onUpdate:(s:Investigation)=>void}) {
  return <><ScreenHeading label="03 / FIELD INSTRUMENTS" title="Detective equipment"><p className="muted">Bring the evidence into focus.</p></ScreenHeading><Equipment state={state} brief={brief} busy={busy} onUpdate={onUpdate} /></>
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
  return <><ScreenHeading label="FINAL VERDICT / BUREAU RECORD" title={state.result.solved?'Case Solved':'Case Unsolved'}><p className="muted">{brief.title} · {brief.location}</p></ScreenHeading><Verdict result={state.result} title={brief.title} busy={false} onRestart={()=>{window.location.hash='#/'}} actions={<div className="results-actions"><a className="button-link primary" href="#/">Return to Main Menu</a><button onClick={onReplay}>Replay Case</button><a className="button-link" href={'#'+paths.game(state.id,'evidence')}>Review Evidence</a></div>} careerReward={state.result.career?<CareerReward reward={state.result.career} profile={profile}/>:<p className="closing-section muted">This legacy verdict predates career reward reports. Your permanent career record remains available from the main menu.</p>}/></>
}
export const rooms: {id:GameScreen;label:string;note:string}[] = [
  {id:'evidence',label:'Evidence Board',note:'EXAMINE THE RECORD'},
  {id:'interviews',label:'Suspect Interviews',note:'COMPARE ACCOUNTS'},
  {id:'equipment',label:'Detective Equipment',note:'FOLLOW THE TRACES'},
  {id:'accusation',label:'Accusation',note:'BUILD YOUR CASE'},
]
export function GameNavigation({state,brief,screen,detective}:{state:Investigation;brief:CaseBrief;screen:GameScreen;detective:string}) {
  const links=state.result?[...rooms.filter(r=>r.id!=='accusation'),{id:'verdict' as const,label:'Final Verdict',note:'CLOSED DOSSIER'}]:rooms
  return <aside className="game-rail"><a href="#/" className="menu-back">← Main Menu</a><div className="game-context"><p className="label accent">CASE {brief.number}</p><h2>{brief.title}</h2><p className="muted">{detective}</p><p className="label">{state.result?'CASE CLOSED':'INVESTIGATION OPEN'}</p></div><nav className="game-nav" aria-label="Investigation rooms">{links.map((room,index)=><a key={room.id} className={screen===room.id?'is-active':''} aria-current={screen===room.id?'page':undefined} href={'#'+paths.game(state.id,room.id)}><small>0{index+1} / {room.note}</small><span>{room.label}</span></a>)}</nav><p className="label muted">{Object.keys(state.board).length}/{brief.evidence.length} FILES EXAMINED<br/>{state.interviews.length} RECORDED ANSWERS</p><a href="#/continue" className="menu-back">Dossier Archive →</a></aside>
}
