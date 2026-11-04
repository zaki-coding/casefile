import { useState } from 'react'
import type { CareerRewardData, CaseSummary, PlayerProfile } from './api'
import './career.css'

const portraits: Record<string, string> = {
  adrian: new URL('./detectives/adrian.svg', import.meta.url).href,
  selena: new URL('./detectives/selena.svg', import.meta.url).href,
  elias: new URL('./detectives/elias.svg', import.meta.url).href,
}
const detectiveNames: Record<string, string> = {
  adrian: 'Adrian Cross',
  selena: 'Selena Voss',
  elias: 'Elias Mercer',
}

export function Career({ profile, cases, busy, onStart, onSelect, onBack }: {
  profile: PlayerProfile
  cases: CaseSummary[]
  busy: boolean
  onStart: (caseId: string, detective: string) => void
  onSelect: (detective: string) => void
  onBack?: () => void
}) {
  const [caseId, setCaseId] = useState(cases[0]?.id ?? '')
  const activeCase = cases.find(item => item.id === caseId)
  const detective = profile.detectives.find(item => item.id === profile.selectedDetective && item.unlocked)
  const next = profile.detectives.filter(item => !item.unlocked).sort((a, b) => a.threshold - b.threshold)[0]

  return <section className="career" aria-labelledby="career-title">
    <header className="career-banner">
      <div>
        <p className="career-kicker">Investigations division / Personnel records</p>
        <h1 id="career-title">Detective bureau</h1>
        <p>Choose your investigator and open a case file.</p>
      </div>
      {onBack && <button disabled={busy} onClick={onBack}>Return to investigation</button>}
    </header>

    <div className="career-statline" aria-label="Player career profile">
      <div><strong>{profile.points}</strong><span>Career points</span></div>
      <div><strong>{profile.solvedCases.length}</strong><span>Unique cases solved</span></div>
      <div><strong>{profile.detectives.filter(item => item.unlocked).length} / {profile.detectives.length}</strong><span>Detectives unlocked</span></div>
    </div>
    {next ? <div className="career-progress">
      <label htmlFor="bureau-progress">Next unlock · {next.name}</label>
      <span>{profile.points} / {next.threshold} points</span>
      <progress id="bureau-progress" value={profile.points} max={next.threshold} />
    </div> : <p className="career-kicker career-complete">All detectives unlocked</p>}

    <section aria-labelledby="roster-title">
      <p className="career-kicker">01 / Assign personnel</p>
      <h2 id="roster-title">Detective roster</h2>
      <div className="career-roster">
        {profile.detectives.map(item => {
          const selected = detective?.id === item.id
          return <article key={item.id} className={'career-detective' + (selected ? ' is-selected' : '')}>
            <div className="career-portrait">
              {portraits[item.id] && <img src={portraits[item.id]} alt={item.name} width="280" height="300" />}
              <span>{item.unlocked ? selected ? 'Assigned' : 'Available' : 'Locked'}</span>
            </div>
            <div className="career-card-body">
              <p className="career-kicker">{item.role}</p>
              <h3>{item.name}</h3>
              <p>{item.bio}</p>
              <div className="career-ability"><strong>{item.ability}</strong><p>{item.description}</p></div>
              <button type="button" disabled={busy || !item.unlocked} aria-pressed={selected}
                onClick={() => onSelect(item.id)}>
                {item.unlocked ? selected ? 'Selected' : 'Select detective' : 'Unlock at ' + item.threshold + ' points'}
              </button>
            </div>
          </article>
        })}
      </div>
    </section>

    <section className="career-case-section" aria-labelledby="case-selection-title">
      <p className="career-kicker">02 / Choose assignment</p>
      <h2 id="case-selection-title">Case archive</h2>
      <div className="career-cases">
        {cases.map(item => {
          const previous = profile.solvedCases.find(solved => solved.caseId === item.id)
          return <button type="button" key={item.id} aria-pressed={activeCase?.id === item.id}
            disabled={busy} onClick={() => setCaseId(item.id)}>
            <span className="career-kicker">Case {item.number} / {item.location}</span>
            <strong>{item.title}</strong>
            <span>{item.brief}</span>
            <small>{item.suspectCount} suspects · {item.evidenceCount} evidence files
              {previous && ' · Solved (' + previous.score + ' points) · Replay available'}
            </small>
          </button>
        })}
      </div>
      <div className="career-confirm">
        <p>{detective && activeCase ? detective.name + ' / ' + activeCase.title : 'Select a detective and a case.'}</p>
        <button className="primary" type="button" disabled={busy || !detective || !activeCase}
          onClick={() => { if (detective && activeCase) onStart(activeCase.id, detective.id) }}>
          Confirm assignment →
        </button>
      </div>
    </section>
  </section>
}

export function CareerReward({ reward, profile }: { reward: CareerRewardData; profile?: PlayerProfile }) {
  return <aside className="career-reward" aria-label="Career progression">
    <p className="career-kicker">Bureau records / Career progression</p>
    <h2>Career report</h2>
    <div className="career-statline">
      <div><strong>+{reward.earned}</strong><span>Career points earned</span></div>
      <div><strong>{reward.points}</strong><span>Career total at close</span></div>
    </div>
    {reward.earned === 0 && <p>Career points are earned on the first successful solution of each case.</p>}
    {reward.newUnlocks.map(id => {
      const detective = profile?.detectives.find(item => item.id === id)
      const name = detective?.name ?? detectiveNames[id]
      return <div className="career-unlock" key={id}>
        {portraits[id] && <img src={portraits[id]} alt="" width="70" height="75" />}
        <div><span className="career-kicker">Detective unlocked</span><h3>{name ?? id}</h3>
          {detective && <p>{detective.ability} · {detective.role}</p>}
        </div>
      </div>
    })}
    {reward.nextUnlock ? <div className="career-progress">
      <label htmlFor="reward-progress">Next unlock · {reward.nextUnlock.name}</label>
      <span>{reward.points} / {reward.nextUnlock.threshold} points</span>
      <progress id="reward-progress" value={reward.points} max={reward.nextUnlock.threshold} />
    </div> : <p className="career-kicker career-complete">All detectives unlocked at case close</p>}
  </aside>
}
