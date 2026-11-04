export interface CaseSummary {
  id: string
  number: string
  title: string
  location: string
  brief: string
  suspectCount: number
  evidenceCount: number
}

export interface CaseBrief extends CaseSummary {
  suspects: { id: string; name: string; role: string }[]
  evidence: { id: string; title: string; source: string }[]
  topics: Record<string, string>
  methods: Record<string, string>
}

export interface PlayerProfile {
  points: number
  solvedCases: { caseId: string; score: number }[]
  selectedDetective: string
  detectives: {
    id: string; name: string; role: string; bio: string; ability: string
    description: string; threshold: number; unlocked: boolean
  }[]
}

export interface CareerRewardData {
  earned: number
  points: number
  newUnlocks: string[]
  nextUnlock: { id: string; name: string; threshold: number } | null
}

type AbilityType = 'insight' | 'pressure' | 'analysis'

export interface SavedInvestigation {
  id: string
  caseId: string
  detectiveId: string
  closed: boolean
}

export interface Investigation {
  id: string
  caseId: string
  detectiveId: string
  ability: { type: AbilityType; target: string | null; message: string } | null
  abilityOptions: { type: AbilityType; targets: string[]; requiredEvidence?: string }
  board: Record<string, string>
  interviews: InterviewEntry[]
  result: {
    score: number
    solved: boolean
    explanation: string
    breakdown: Record<string, number>
    career?: CareerRewardData
    details?: {
      culprit: string
      method: string
      suspectChoice: string
      methodChoice: string
      suspectCorrect: boolean
      methodCorrect: boolean
      evidence: { id: string; title: string; correct: boolean }[]
      timeline: { time: string; title: string; description: string; evidence: string }[]
    }
  } | null
}

interface InterviewEntry {
  suspect: string
  topic: string
  question?: string
  answer: string
}

export interface InterviewScene {
  suspect: string
  opening: string
  options: { id: string; label: string; status: 'available' | 'asked' | 'locked'; hint?: string }[]
  transcript: (InterviewEntry & { question: string })[]
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
export async function resume(): Promise<Investigation | null> {
  const saved = localStorage.getItem(storageKey)
  if (saved) {
    try {
      return await api<Investigation>('/investigations/' + saved)
    } catch (error) {
      if (!(error instanceof ApiError) || ![404, 422].includes(error.status)) throw error
      localStorage.removeItem(storageKey)
    }
  }
  return null
}

export function rememberInvestigation(id: string) {
  localStorage.setItem(storageKey, id)
}

export function start(caseId: string, detectiveId: string) {
  return api<Investigation>('/investigations', 'POST', { caseId, detectiveId })
}

export function canAccuse(suspect: string, method: string, evidence: string[], board: Record<string, string>) {
  return Boolean(suspect && method && evidence.length === 2 &&
    new Set(evidence).size === 2 && evidence.every(id => Object.hasOwn(board, id)))
}
