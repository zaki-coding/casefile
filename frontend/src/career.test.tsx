import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { CaseSummary, PlayerProfile } from './api'
import { Career, CareerReward } from './Career'

const cases: CaseSummary[] = [{
  id: '001', number: '001', title: 'The Midnight Proof', location: 'Bellweather Printworks',
  brief: 'Investigate the missing lithograph.', suspectCount: 3, evidenceCount: 5,
}]
const profile: PlayerProfile = {
  points: 0, selectedDetective: 'adrian', solvedCases: [],
  detectives: [
    { id: 'adrian', name: 'Adrian Cross', role: 'The Investigator', bio: 'Studies patterns.',
      ability: 'Insight', description: 'Connect two facts.', threshold: 0, unlocked: true },
    { id: 'selena', name: 'Selena Voss', role: 'The Interrogator', bio: 'Reads the room.',
      ability: 'Pressure', description: 'Unlock a question.', threshold: 60, unlocked: false },
  ],
}

function bureau(player = profile, busy = false) {
  return renderToStaticMarkup(<Career profile={player} cases={cases} busy={busy}
    onStart={() => {}} onSelect={() => {}} />)
}

describe('detective bureau', () => {
  it('previews locked detectives while allowing the selected investigator to start', () => {
    const html = bureau()
    expect(html).toContain('Selena Voss')
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Unlock at 60 points<\/button>/)
    expect(html).toMatch(/<button class="primary" type="button">Confirm assignment/)
    expect(html).toContain('Adrian Cross / The Midnight Proof')
  })

  it('shows unlocked selection and a replay marker after a first solve', () => {
    const html = bureau({
      ...profile, points: 60, selectedDetective: 'selena', solvedCases: [{ caseId: '001', score: 60 }],
      detectives: profile.detectives.map(item => ({ ...item, unlocked: true })),
    })
    expect(html).toContain('Selena Voss / The Midnight Proof')
    expect(html).toContain('Solved (60 points) · Replay available')
    expect(html).not.toContain('Unlock at 60 points')
  })

  it('blocks assignment when no unlocked detective is selected or a request is pending', () => {
    expect(bureau({ ...profile, selectedDetective: 'selena' })).toContain('type="button" disabled="">Confirm assignment')
    expect(bureau(profile, true)).toContain('type="button" disabled="">Confirm assignment')
  })
})

describe('career report', () => {
  it('shows the points earned, unlocked detective, and next threshold', () => {
    const html = renderToStaticMarkup(<CareerReward profile={profile}
      reward={{ earned: 75, points: 75, newUnlocks: ['selena'], nextUnlock: { id: 'elias', name: 'Elias Mercer', threshold: 150 } }} />)
    expect(html).toContain('+75')
    expect(html).toContain('Detective unlocked')
    expect(html).toContain('Selena Voss')
    expect(html).toContain('Next unlock · Elias Mercer')
  })

  it('explains why a replay earns no career points', () => {
    const html = renderToStaticMarkup(<CareerReward reward={{ earned: 0, points: 155, newUnlocks: [], nextUnlock: null }} />)
    expect(html).toContain('first successful solution')
    expect(html).not.toContain('Detective unlocked')
  })
})
