export interface CaseBrief {
  title: string
  location: string
  brief: string
  suspects: { id: string; name: string; role: string }[]
  evidence: { id: string; title: string; source: string }[]
  topics: Record<string, string>
  methods: Record<string, string>
}

export interface Investigation {
  id: string
  board: Record<string, string>
  interviews: { suspect: string; topic: string; answer: string }[]
  result: { score: number; solved: boolean; explanation: string; breakdown: Record<string, number> } | null
}

export class ApiError extends Error {
  constructor(readonly status: number, message: string) { super(message) }
}

export async function api<T>(path: string, method = 'GET', data?: unknown): Promise<T> {
  const response = await fetch('/api' + path, {
    method,
    ...(data === undefined ? {} : {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new ApiError(response.status, typeof body.detail === 'string' ? body.detail : 'The request failed. Try again.')
  }
  return response.json()
}

const storageKey = 'casefile-investigation'
export async function resume(): Promise<Investigation> {
  const saved = localStorage.getItem(storageKey)
  if (saved) {
    try {
      return await api<Investigation>('/investigations/' + saved)
    } catch (error) {
      if (!(error instanceof ApiError) || ![404, 422].includes(error.status)) throw error
    }
  }
  return start()
}

export async function start(): Promise<Investigation> {
  const state = await api<Investigation>('/investigations', 'POST')
  localStorage.setItem(storageKey, state.id)
  return state
}

export function canAccuse(suspect: string, method: string, evidence: string[], board: Record<string, string>) {
  return Boolean(suspect && method && evidence.length === 2 &&
    new Set(evidence).size === 2 && evidence.every(id => Object.hasOwn(board, id)))
}
