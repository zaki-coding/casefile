import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { AbilityPanel } from './AbilityPanel'
import type { CaseBrief, Investigation } from './api'

const brief: CaseBrief = {
  id: '002', number: '002', title: 'Test case', location: 'Observatory', brief: '',
  suspectCount: 1, evidenceCount: 2, topics: {}, methods: {},
  suspects: [{ id: 'ivo', name: 'Ivo Rusk', role: 'Chief' }],
  evidence: [
    { id: 'route', title: 'Carrier route', source: 'Recorder' },
    { id: 'latch', title: 'Latch mark', source: 'Bay' },
  ],
}

function render(changes: Partial<Investigation>, inInterview = false, person = 'ivo') {
  const state: Investigation = {
    id: 'save', caseId: '002', detectiveId: 'adrian', board: {},
    interviews: [], result: null, ability: null, abilityOptions: { type: 'insight', targets: [] },
    ...changes,
  }
  return renderToStaticMarkup(<AbilityPanel state={state} brief={brief} busy={false} person={person}
    inInterview={inInterview} onUse={() => {}} />)
}

describe('field abilities', () => {
  it('enables Insight after two files and shows the persisted hint in place of the button', () => {
    expect(render({ board: { route: 'trace' } })).toContain('<button disabled="">Use Insight')
    expect(render({ board: { route: 'trace', latch: 'mark' } })).toContain('<button>Use Insight')
    const used = render({ ability: { type: 'insight', target: null, message: 'Look at the sequence.' } })
    expect(used).toContain('Look at the sequence.')
    expect(used).not.toContain('<button')
  })

  it('offers Pressure only in the target interview with both an exchange and leverage', () => {
    const state = {
      detectiveId: 'selena',
      abilityOptions: { type: 'pressure' as const, targets: ['ivo'], requiredEvidence: 'route' },
      interviews: [{ suspect: 'ivo', topic: 'alibi', answer: 'My shift started at six.' }],
      board: { route: 'trace' },
    }
    expect(render(state)).toContain('<button disabled="">Apply Pressure')
    expect(render(state, true, 'noa')).toContain('<button disabled="">Apply Pressure')
    expect(render({ ...state, board: {} }, true)).toContain('<button disabled="">Apply Pressure')
    expect(render(state, true)).toContain('<button>Apply Pressure')
  })

  it('lists examined evidence for Deep Analysis and displays the chosen file when used', () => {
    const state = {
      detectiveId: 'elias', board: { latch: 'mark' },
      abilityOptions: { type: 'analysis' as const, targets: ['route', 'latch'] },
    }
    expect(render(state)).toContain('<option value="latch">Latch mark')
    expect(render(state)).not.toContain('<option value="route">')
    expect(render({ ...state, ability: { type: 'analysis', target: 'latch', message: 'Tool mark confirmed.' } }))
      .toContain('Latch mark · </strong>Tool mark confirmed.')
  })
})
