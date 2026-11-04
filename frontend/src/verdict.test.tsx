import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { Investigation } from './api'
import { Verdict } from './Verdict'

const result: NonNullable<Investigation['result']> = {
  solved: true,
  score: 100,
  explanation: 'The outage was staged.',
  breakdown: { Suspect: 50, Method: 30, Evidence: 20 },
  details: {
    culprit: 'Mara Vale',
    method: 'Triggered the manual relay',
    suspectChoice: 'Mara Vale',
    methodChoice: 'Triggered the manual relay',
    suspectCorrect: true,
    methodCorrect: true,
    evidence: [{ id: 'relay', title: 'Relay event log', correct: true }],
    timeline: [{ time: '00:00', title: 'The lights went out', description: 'The relay cut gallery power.', evidence: 'Relay event log' }],
  },
}

describe('verdict dossier', () => {
  it('reveals the culprit, reconstruction, and assessment on a successful accusation', () => {
    const html = renderToStaticMarkup(<Verdict result={result} busy={false} onRestart={vi.fn()} />)
    expect(html).toContain('Case Closed')
    expect(html).toContain('Mara Vale')
    expect(html).toContain('The lights went out')
    expect(html).toContain('Decisive evidence')
    expect(html).toContain('aria-label="Evidence points" value="20" max="20"')
  })

  it('shows incorrect choices and a pending restart without withholding the solution', () => {
    const failure = {
      ...result,
      solved: false,
      score: 0,
      breakdown: { Suspect: 0, Method: 0, Evidence: 0 },
      details: {
        ...result.details!,
        suspectChoice: 'Ellis Ward',
        methodChoice: 'Waited for a storm',
        suspectCorrect: false,
        methodCorrect: false,
        evidence: [{ id: 'gate', title: 'East gate video', correct: false }],
      },
    }
    const html = renderToStaticMarkup(<Verdict result={failure} busy onRestart={vi.fn()} />)
    expect(html).toContain('Case Unsolved')
    expect(html).toContain('Mara Vale')
    expect(html).toContain('Incorrect suspect')
    expect(html).toContain('Incorrect method')
    expect(html).toContain('No evidence points')
    expect(html).toContain('disabled=""')
  })

  it('still renders the solution and restart for verdicts saved before choice feedback', () => {
    const html = renderToStaticMarkup(<Verdict result={{ ...result, details: undefined }} busy={false} onRestart={vi.fn()} />)
    expect(html).toContain(result.explanation)
    expect(html).toContain('Archived solution')
    expect(html).toContain('Start a new investigation')
  })
})
