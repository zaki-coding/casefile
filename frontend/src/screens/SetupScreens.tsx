import type { ReactNode } from 'react'
import type { CaseSummary, PlayerProfile, SavedInvestigation } from '../api'
import { paths } from '../navigation'
import { CaseArtwork } from '../CaseArtwork'
import { EquipmentCollection } from '../Equipment'
import '../career.css'

export const portraits: Record<string, string> = {
  adrian: new URL('../detectives/adrian.svg', import.meta.url).href,
  selena: new URL('../detectives/selena.svg', import.meta.url).href,
  elias: new URL('../detectives/elias.svg', import.meta.url).href,
}
export type Detective = PlayerProfile['detectives'][number]
export function ScreenHeading({ label, title, children }: { label: string; title: string; children?: ReactNode }) {
  return <header className="screen-heading"><p className="label accent">{label}</p><h1 tabIndex={-1}>{title}</h1>{children}</header>
}
export function Back({ to, children = 'Back' }: { to: string; children?: ReactNode }) {
  return <a className="menu-back" href={'#' + to}>← {children}</a>
}
export function MainMenu({ latest }: { latest?: SavedInvestigation }) {
  return <section className="main-menu">
    <div className="menu-art" aria-hidden="true"><CaseArtwork caseId="001" /></div>
    <div className="menu-copy"><p className="label accent">THE BUREAU IS OPEN</p><h1 tabIndex={-1}>Every detail.<br /><em>Every doubt.</em></h1><p className="muted">Behind every account, a contradiction.<br />Behind every closed door, a case.</p>
      <nav className="menu-actions" aria-label="Main menu">
        <a className="menu-option" href={'#' + paths.detectives}><span>New Investigation</span><small>01 / OPEN A NEW CASE</small></a>
        <a className="menu-option" href="#/continue"><span>Continue Investigation</span><small>{latest ? '02 / RETURN TO THE RECORD' : '02 / YOUR DOSSIER ARCHIVE'}</small></a>
        <a className="menu-option" href="#/career"><span>Detective Career</span><small>03 / PERSONNEL & PROGRESSION</small></a>
        <a className="menu-option" href="#/settings"><span>Settings</span><small>04 / PRESENTATION & ACCESSIBILITY</small></a>
      </nav>
    </div>
  </section>
}
export function DetectiveSelection({ profile, onSelect }: { profile: PlayerProfile; onSelect: (id: string) => void }) {
  return <><Back to="/">Main Menu</Back><ScreenHeading label="01 / ASSIGN PERSONNEL" title="Choose your detective"><p className="muted">Different instincts. The same pursuit of the truth.</p></ScreenHeading>
    <div className="selection-grid">{profile.detectives.map(item => <article className="detective-choice" key={item.id}>
      <div className="career-portrait"><img src={portraits[item.id]} alt={item.name} width="280" height="300" /><span>{item.unlocked ? 'Available for assignment' : 'Locked'}</span></div>
      <div className="career-card-body"><p className="label accent">{item.role}</p><h2>{item.name}</h2><p className="muted">{item.bio}</p><div className="career-ability"><strong>{item.ability}</strong><p>{item.description}</p></div>
        <button className={item.unlocked ? 'primary' : ''} disabled={!item.unlocked} onClick={() => onSelect(item.id)}>{item.unlocked ? 'Select ' + item.name : `Unlock at ${item.threshold} career points`}</button>
      </div></article>)}</div>
  </>
}
export function DetectiveConfirmation({ detective, busy, onConfirm }: { detective: Detective; busy: boolean; onConfirm: () => void }) {
  return <><Back to={paths.detectives}>Choose Another Detective</Back><section className="detective-confirmation">
    <div className="portrait-large"><img src={portraits[detective.id]} alt={detective.name} width="280" height="300" /></div>
    <div><ScreenHeading label="PERSONNEL / CONFIRM ASSIGNMENT" title={detective.name}><p className="label accent">{detective.role}</p></ScreenHeading><p className="muted">{detective.bio}</p><h2>Are you sure you want to play as {detective.name}?</h2><p><strong>{detective.ability}</strong> · {detective.description}</p>
      <div className="screen-actions"><button className="primary" disabled={busy} onClick={onConfirm}>YES — Confirm Detective</button><a className="button-link" href={'#' + paths.detectives}>NO — Choose Another</a></div>
      <p className="muted">Your assignment begins after you choose and brief a case.</p>
    </div></section></>
}
export function caseDifficulty(id: string) { return id === '001' ? 'Foundational · 3 suspects' : 'Intermediate · 4 suspects' }
export function CaseSelection({ detective, cases, profile }: { detective: Detective; cases: CaseSummary[]; profile: PlayerProfile }) {
  return <><Back to={paths.detectives}>Change Detective</Back><ScreenHeading label={'02 / ASSIGNED TO ' + detective.name.toUpperCase()} title="Choose a case"><p className="muted">Select a dossier to read the briefing. Your investigation has not started yet.</p></ScreenHeading>
    <div className="case-grid">{cases.map(item => { const solved = profile.solvedCases.find(s => s.caseId === item.id); return <article className="case-choice" key={item.id}>
      <CaseArtwork caseId={item.id} /><div className="case-copy"><p className="label accent">CASE {item.number} / {item.location}</p><h2>{item.title}</h2><p className="muted">{item.brief}</p><dl className="case-meta"><div><dt>Difficulty</dt><dd>{caseDifficulty(item.id)}</dd></div><div><dt>Status</dt><dd>{solved ? `Solved · ${solved.score} points` : 'Unsolved'}</dd></div><div><dt>Career reward</dt><dd>{solved ? 'Replay · 0 additional career points' : 'Up to 100 points · first successful solution'}</dd></div></dl>
        <a className="button-link primary" href={'#' + paths.briefing(detective.id, item.id)}>Read Case {item.number} Briefing →</a></div></article> })}</div></>
}
export function CaseBriefing({ detective, dossier, solved, busy, onBegin }: { detective: Detective; dossier: CaseSummary; solved: boolean; busy: boolean; onBegin: () => void }) {
  return <><Back to={paths.cases(detective.id)}>Select a Different Case</Back><section className="briefing-layout"><CaseArtwork caseId={dossier.id} /><div className="briefing-copy"><ScreenHeading label={'CASE ' + dossier.number + ' / CLASSIFIED BRIEFING'} title={dossier.title}><p className="label accent">{dossier.location}</p></ScreenHeading><p>{dossier.brief}</p><p className="muted">Assigned detective: <strong>{detective.name}</strong> · {detective.ability}</p>
      <div className="briefing-objectives"><h2>Investigation objectives</h2><ol><li>Examine and compare the evidence.</li><li>Interview suspects and test their accounts.</li><li>Identify the culprit and method; cite two supporting files.</li></ol></div>
      <p className="muted">{solved ? 'Replay: your career points and permanent unlocks are preserved. No additional career reward.' : 'Your first successful solution earns its score in career points, up to 100.'}</p><button className="primary" disabled={busy} onClick={onBegin}>{busy ? 'Opening investigation…' : 'Begin Investigation'}</button>
    </div></section></>
}
export function ContinueScreen({ saves, cases, profile, latest }: { saves: SavedInvestigation[]; cases: CaseSummary[]; profile: PlayerProfile; latest?: string }) {
  return <><Back to="/">Main Menu</Back><ScreenHeading label="BUREAU ARCHIVE / PERSISTENT RECORDS" title="Continue investigation"><p className="muted">Every file, interview and finding is kept with its investigation.</p></ScreenHeading><section className="save-archive"><h2>Saved investigations</h2>{!saves.length ? <p>No investigations yet. <a href={'#' + paths.detectives}>Open your first case.</a></p> : <ul>{[...saves].sort((a,b) => Number(b.id === latest) - Number(a.id === latest)).map((save,index) => <li key={save.id}><a className="archive-link" href={'#' + paths.game(save.id, save.closed ? 'verdict' : 'evidence')}><span className="label">DOSSIER {String(index+1).padStart(2,'0')}{save.id === latest ? ' / LAST OPENED' : ''}</span><strong>{cases.find(c => c.id === save.caseId)?.title ?? save.caseId}</strong><span className="muted">{profile.detectives.find(d => d.id === save.detectiveId)?.name} · {save.closed ? 'Read final verdict →' : 'Resume investigation →'}</span><small className="muted">Record {save.id.slice(0,8)}</small></a></li>)}</ul>}</section></>
}
export function CareerScreen({ profile }: { profile: PlayerProfile }) {
  return <><Back to="/">Main Menu</Back><ScreenHeading label="PERSONNEL / CAREER RECORD" title="Detective career"><p className="muted">Each unique solved case advances your career. Unlocks are permanent; points are never spent.</p></ScreenHeading><div className="career-statline"><div><strong>{profile.points}</strong><span>Career points</span></div><div><strong>{profile.solvedCases.length}</strong><span>Unique cases solved</span></div><div><strong>{profile.detectives.filter(d => d.unlocked).length}</strong><span>Detectives available</span></div></div>
    <div className="career-overview">{profile.detectives.map(d => <article key={d.id}><img src={portraits[d.id]} alt={d.name} width="100" height="110" /><div><h2>{d.name}</h2><p>{d.ability}</p><span className="label accent">{d.unlocked ? 'Permanently available' : `Unlock at ${d.threshold} points`}</span></div></article>)}</div>{profile.equipment && <EquipmentCollection tools={profile.equipment} points={profile.points} />}</>
}
