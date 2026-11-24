import { describe, expect, it } from 'vitest'
import type { CaseBrief, Investigation } from '../api'
import { fieldNote, updateDossier } from './fieldNotes'

const brief: CaseBrief = {
  id: '001', number: '001', title: 'Test case', location: 'Gallery', brief: '', topics: {}, methods: {},
  suspects: [{ id: 'witness', name: 'Test Witness', role: 'Caretaker' }], suspectCount: 1,
  evidence: [{ id: 'badge', title: 'Access log', source: 'Desk' }], evidenceCount: 1,
}
const saved: Investigation = {
  id: 'first', caseId: brief.id, detectiveId: 'adrian', board: {}, interviews: [], result: null,
  ability: null, abilityOptions: { type: 'insight', targets: [] },
}

describe('detective field notes', () => {
  it.each(['adrian', 'selena', 'elias'])('keeps undiscovered evidence and unrecorded testimony out of %s’s notes', detectiveId => {
    const empty = { ...saved, detectiveId }
    const pinned = { ...empty, board: { badge: 'Examined.' } }
    const fallback = fieldNote(empty, brief, 'evidence', 'resume')
    expect(fieldNote(empty, brief, 'evidence', { file: 'badge' })).toBe(fallback)
    expect(fieldNote(empty, brief, 'interviews', 'answer')).toBe(fallback)
    expect(fieldNote(pinned, brief, 'evidence', { file: 'badge' })).not.toBe(fallback)
    expect(fieldNote(empty, brief, 'accusation', 'start')).not.toMatch(/test witness|access log/i)
  })

  it('keeps a confirmed note through repeated responses and ignores a late update for another save', () => {
    const begun = updateDossier({ note: 'resume' }, { type: 'begin', saved })
    const restored = updateDossier(begun, { type: 'restore', saved })
    expect(restored.note).toBe('start')
    const pinned = { ...saved, board: { badge: 'Examined.' } }
    const first = updateDossier(restored, { type: 'update', saved: pinned })
    expect(first.note).toEqual({ file: 'badge' })
    expect(updateDossier(first, { type: 'update', saved: pinned })).toEqual(first)
    const next = updateDossier(first, { type: 'restore', saved: { ...saved, id: 'second', detectiveId: 'elias' } })
    expect(next.note).toBe('resume')
    expect(updateDossier(next, { type: 'update', saved: pinned })).toBe(next)
  })

  it('comments on a contradiction only when it is part of the saved answer', () => {
    const answer = { suspect: 'witness', topic: 'access', answer: 'I signed in.' }
    const first = { ...saved, detectiveId: 'selena', interviews: [answer] }
    expect(fieldNote(first, brief, 'interviews', 'answer')).toContain('Test Witness')
    const corrected = { ...first, interviews: [answer, { ...answer, topic: 'correction', contradiction: 'Account changed.' }] }
    expect(fieldNote(corrected, brief, 'interviews', 'answer')).toContain('both versions')
  })
})
