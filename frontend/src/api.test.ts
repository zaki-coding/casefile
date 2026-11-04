import { afterEach, describe, expect, it, vi } from 'vitest'
import { canAccuse, resume, start } from './api'

afterEach(() => vi.unstubAllGlobals())

describe('accusation eligibility', () => {
  const board = { badge: 'Access log', relay: 'Relay log' }

  it('accepts exactly two distinct examined files with a suspect and method', () => {
    expect(canAccuse('mara', 'switch', ['badge', 'relay'], board)).toBe(true)
    expect(canAccuse('', 'switch', ['badge', 'relay'], board)).toBe(false)
    expect(canAccuse('mara', 'switch', ['badge', 'badge'], board)).toBe(false)
    expect(canAccuse('mara', 'switch', ['badge', 'proof'], board)).toBe(false)
  })
})

describe('resuming an investigation', () => {
  const saved = { id: 'saved', board: { badge: 'Access log' }, interviews: [], result: null }

  function mockBrowser(response: Response) {
    const storage = { getItem: vi.fn(() => 'saved'), setItem: vi.fn(), removeItem: vi.fn() }
    const fetch = vi.fn().mockResolvedValueOnce(response)
    vi.stubGlobal('localStorage', storage)
    vi.stubGlobal('fetch', fetch)
    return { storage, fetch }
  }

  it('loads saved progress without starting over', async () => {
    const { storage, fetch } = mockBrowser(Response.json(saved))
    expect(await resume()).toEqual(saved)
    expect(fetch).toHaveBeenCalledExactlyOnceWith('/api/investigations/saved', { method: 'GET' })
    expect(storage.setItem).not.toHaveBeenCalled()
  })

  it('returns to selection for a missing save and preserves the pointer during an outage', async () => {
    const missing = mockBrowser(new Response(null, { status: 404 }))
    expect(await resume()).toBeNull()
    expect(missing.storage.removeItem).toHaveBeenCalledWith('casefile-investigation')
    expect(missing.fetch).toHaveBeenCalledTimes(1)

    const outage = mockBrowser(new Response(null, { status: 503 }))
    await expect(resume()).rejects.toThrow()
    expect(outage.fetch).toHaveBeenCalledTimes(1)
    expect(outage.storage.setItem).not.toHaveBeenCalled()
    expect(outage.storage.removeItem).not.toHaveBeenCalled()
  })

  it('starts the explicitly chosen case and detective after confirmation', async () => {
    const { fetch } = mockBrowser(Response.json({ ...saved, caseId: '002', detectiveId: 'selena' }))
    await start('002', 'selena')
    expect(fetch).toHaveBeenCalledExactlyOnceWith('/api/investigations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseId: '002', detectiveId: 'selena' }),
    })
  })
})
