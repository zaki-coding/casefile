import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { EquipmentCollection, ExaminationScene, moveEvent } from './Equipment'
import { CareerReward } from './Career'
import type { EquipmentExamination, EquipmentTool } from './api'

const tools: EquipmentTool[] = [
  { id: 'lens', name: 'Investigation Lens', threshold: 0, description: 'Inspect marks.', unlocked: true, remaining: 0 },
  { id: 'forensic', name: 'Forensic Kit', threshold: 50, description: 'Preserve physical traces.', unlocked: false, remaining: 10 },
]
const examination: EquipmentExamination = {
  id: 'clock-comparison', target: 'badge', title: 'Independent clocks', prompt: 'Choose two records.', kind: 'digital',
  choices: [{ id: 'badge', label: 'Badge report' }, { id: 'relay', label: 'Relay log' }],
  sources: ['badge', 'relay'], examinedSources: ['badge'], available: true, requirement: '', completed: false,
}
const renderScene = (changes: Partial<EquipmentExamination> = {}, closed = false) => renderToStaticMarkup(<ExaminationScene examination={{ ...examination, ...changes }} busy={false} closed={closed} onUse={() => {}} />)

describe('equipment workbench', () => {
  it('shows permanent issue, locked previews and point requirements without purchase actions', () => {
    const markup = renderToStaticMarkup(<EquipmentCollection tools={tools} points={40} />)
    expect(markup).toContain('Investigation Lens')
    expect(markup).toContain('Locked · 50 points')
    expect(markup).toContain('10 more career points')
    expect(markup).toContain('Unlocks never spend career points')
    expect(markup).not.toContain('Buy')
  })
  it('requires two examined digital sources before correlation', () => {
    const markup = renderScene()
    expect(markup).toContain('Choose two information sources')
    expect(markup).toContain('Examine file first')
    expect(markup).toContain('disabled="">Correlate selected records')
  })
  it('offers a visual lens inspection with accessible region controls and a magnifier', () => {
    const markup = renderScene({ kind: 'lens' })
    expect(markup).toContain('Evidence inspection diagram')
    expect(markup).toContain('Inspect Badge report')
    expect(markup).toContain('3× OPTICAL VIEW')
    expect(markup).toContain('Inspect selected region')
  })
  it('preserves all events when moving them and keeps boundary movements unchanged', () => {
    const order = ['late', 'early', 'middle']
    expect(moveEvent(order, 1, -1)).toEqual(['early', 'late', 'middle'])
    expect(moveEvent(order, 0, -1)).toBe(order)
    expect(order).toEqual(['late', 'early', 'middle'])
    const markup = renderScene({ kind: 'timeline' })
    expect(markup).toContain('Move event 1 later')
    expect(markup).toContain('Check reconstruction')
  })
  it('blocks closed cases and completed examinations while retaining recorded status', () => {
    expect(renderScene({}, true)).not.toContain('Correlate selected records')
    expect(renderScene({ completed: true })).toContain('Finding recorded in your field notes')
    expect(renderScene({ available: false, requirement: 'Examine source files: relay' })).toContain('Examine source files: relay')
  })
  it('lets players browse lens regions after recording a finding without repeating the examination', () => {
    const markup = renderScene({ kind: 'lens', completed: true })
    expect(markup).toContain('aria-label="Inspect Badge report" aria-pressed="false"')
    expect(markup).not.toContain('aria-label="Inspect Badge report" aria-pressed="false" disabled')
    expect(markup).not.toContain('Inspect selected region')
    expect(markup).toContain('Finding recorded in your field notes')
  })
  it('reports new equipment unlocks separately from detective unlocks', () => {
    const markup = renderToStaticMarkup(<CareerReward reward={{ earned: 100, points: 100, newUnlocks: [], newEquipmentUnlocks: ['forensic'], nextUnlock: null }}
      profile={{ points: 100, selectedDetective: 'adrian', solvedCases: [], detectives: [], equipment: tools }} />)
    expect(markup).toContain('Equipment unlocked · Permanent issue')
    expect(markup).toContain('Forensic Kit')
  })
})
