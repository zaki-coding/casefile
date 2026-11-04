import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { InterviewScene } from './api'
import { InterviewOptions } from './Interview'

const options: InterviewScene['options'] = [
  { id: 'print', label: 'What do you know about the print?', status: 'available' },
  { id: 'alibi', label: 'Where were you at midnight?', status: 'asked' },
  { id: 'badge', label: 'Discuss the badge access report', status: 'locked', hint: 'Examine: Badge access report' },
]

function render(closed = false, disabled = false) {
  return renderToStaticMarkup(<InterviewOptions options={options} closed={closed} disabled={disabled} onAsk={() => {}} />)
}

describe('interview choices', () => {
  it('makes only unasked, unlocked questions actionable and explains evidence gates', () => {
    const html = render()
    expect(html).toContain('<button><span>What do you know about the print?')
    expect(html).toContain('<button disabled=""><span>Where were you at midnight?</span><small>Asked')
    expect(html).toContain('<button disabled=""><span>Discuss the badge access report</span><small>Examine: Badge access report')
  })

  it('makes choices read-only in archives and during a pending response', () => {
    expect(render(true)).toContain('Archived questions')
    expect(render(true)).not.toContain('<button>')
    expect(render(false, true)).not.toContain('<button>')
  })
})
