import type { CaseBrief, Investigation } from '../api'
import type { GameScreen } from '../navigation'

type Note = 'start' | 'resume' | 'answer' | 'ability' | 'deduction' | 'finding' | { file: string }
type Dossier = { saved?: Investigation; note: Note }
type Change = { type: 'begin' | 'restore' | 'update'; saved: Investigation }

export function updateDossier(current: Dossier, { type, saved }: Change): Dossier {
  const previous = current.saved
  if (type === 'begin') return { saved, note: 'start' }
  if (type === 'restore') return { saved, note: previous?.id === saved.id ? current.note : 'resume' }
  // A response can arrive after the player has opened another dossier.
  if (!previous || previous.id !== saved.id) return current

  let note = current.note
  if (saved.ability && !previous.ability) note = 'ability'
  else if (saved.interviews.length > previous.interviews.length) note = 'answer'
  else if ((saved.deductions?.length ?? 0) > (previous.deductions?.length ?? 0)) note = 'deduction'
  else if ((saved.equipmentFindings?.length ?? 0) > (previous.equipmentFindings?.length ?? 0)) note = 'finding'
  else {
    const file = Object.keys(saved.board).find(id => !Object.hasOwn(previous.board, id))
    if (file) note = { file }
  }
  return { saved, note }
}

type Voices = { adrian: string; selena: string; elias: string }

const remarks = {
  start: {
    adrian: 'Let’s start with something we can put a time to.',
    selena: 'I want a fact in hand before I ask anyone for their story.',
    elias: 'I’ll start with the source. Where was the first piece collected?',
  },
  resume: {
    adrian: 'The file is where we left it. Let’s pick up the thread.',
    selena: 'I’ve got the dossier. Whose account shall we check?',
    elias: 'I have our notes here. We can go back to any of the originals.',
  },
  ability: {
    adrian: 'I’ve written down the connection. See if it holds against another source.',
    selena: 'Now I have a follow-up. I’d like their answer on the record.',
    elias: 'I’ve added my reading to the file. Keep it beside the original observation.',
  },
  deduction: {
    adrian: 'Those two records agree on something. Let’s hear a witness account.',
    selena: 'Now we have something specific to put to a witness.',
    elias: 'Two sources for that conclusion. I’ve kept them together.',
  },
  finding: {
    adrian: 'That observation can go beside the original file.',
    selena: 'I can use that finding to ask a more pointed question.',
    elias: 'The examination is in our field notes. We can refer back to it.',
  },
  accusation: {
    adrian: 'Read the accusation back. Can you trace each claim to a file?',
    selena: 'Which part of this account would be easiest to challenge?',
    elias: 'I’d check the citations once more before signing.',
  },
  solved: {
    adrian: 'The sequence holds. I’m comfortable signing this one.',
    selena: 'We can stand behind that accusation. Close the file.',
    elias: 'The reconstruction accounts for the evidence. I’ll sign.',
  },
  unsolved: {
    adrian: 'I’d go back to the first place our account differs from the record.',
    selena: 'Where would our accusation break under questioning? Start there.',
    elias: 'Let’s compare our citations with the reconstruction, one at a time.',
  },
} satisfies Record<string, Voices>

// Any file can be examined first, so its observation has to stand on its own.
const fileNotes: Record<string, Voices> = {
  relay: { adrian: 'That interval gives us a clock to work from.', selena: 'I’d like to hear how long the witnesses think the lights were out.', elias: 'I’ll mark the start and end of the interruption separately.' },
  badge: { adrian: 'A reader records a card. Who was carrying it?', selena: 'I want to ask who had that card in hand.', elias: 'Keep the reader location beside each timestamp.' },
  proof: { adrian: 'I’d read the back of the print as carefully as the front.', selena: 'Who can explain that mark on the reverse?', elias: 'The print and its frame are two separate observations.' },
  gate: { adrian: 'I’d mark both ends of the time we can account for.', selena: 'Let’s see whether the gate account matches the footage.', elias: 'I’ll note the stretch the camera actually covers.' },
  stream: { adrian: 'A live question and answer is a useful time check.', selena: 'We have the recording. We can check the account word for word.', elias: 'Keep the broadcast time with the recording.' },
  condition: { adrian: 'Those photographs give us a before and an after.', selena: 'Who saw this survey before the preview?', elias: 'I’d compare the same part of the print in both photographs.' },
  treatment: { adrian: 'The request and the reply belong together on the timeline.', selena: 'I’d ask each signer what they understood at the time.', elias: 'Keep the proposed treatment separate from what was approved.' },
  seal: { adrian: 'What does this tell us about the door itself?', selena: 'If someone says the door was opened, ask them about the seal.', elias: 'I’d record the wire and the stamp before handling either.' },
  route: { adrian: 'Now we have a journey we can put on the clock.', selena: 'Let’s ask who can account for that transfer.', elias: 'Read the carrier code alongside the load trace.' },
  latch: { adrian: 'Can we account for the tool as well as the mark?', selena: 'I want the tool’s whereabouts on the record.', elias: 'I’d line up the jaw profile with the impression.' },
  drawer: { adrian: 'I’d work back from where these traces were found.', selena: 'Who can account for what was in the drawer?', elias: 'Log the fibers and the residue as separate traces.' },
  certification: { adrian: 'The condition attached to the signature is worth another read.', selena: 'I’d ask the signer what could hold up that approval.', elias: 'I’ll keep the condition with the approval in our notes.' },
  register: { adrian: 'A signature puts someone there for a moment. For how long?', selena: 'I’d ask what happened after the pen went down.', elias: 'That entry gives us one time we can verify.' },
  pumps: { adrian: 'The footage gives us a span of time to check.', selena: 'Let’s see how the pump-deck account holds up on camera.', elias: 'I’d follow the tools through the whole recording.' },
  lab: { adrian: 'Listen to the room as well as the conversation.', selena: 'What did the person on the link hear? I’d ask in their own words.', elias: 'Keep the sound aligned with its frame of video.' },
  deck: { adrian: 'I’d line up the deck footage with the lockdown.', selena: 'Anyone describing a transfer should be able to place it in this footage.', elias: 'I’ll check the hatch record against the camera time.' },
  preview: { adrian: 'Where does the reading end and the display limit begin?', selena: 'I’d ask what anyone could really tell from this preview.', elias: 'The edge of the display matters when reading that trace.' },
}

export function fieldNote(saved: Investigation, brief: CaseBrief, screen: GameScreen, note: Note): string {
  const id = saved.detectiveId
  if (id !== 'adrian' && id !== 'selena' && id !== 'elias') return ''
  if (saved.result) return remarks[saved.result.solved ? 'solved' : 'unsolved'][id]
  if (screen === 'accusation') return remarks.accusation[id]
  if (typeof note === 'object') {
    return (Object.hasOwn(saved.board, note.file) && fileNotes[note.file]?.[id]) || remarks.resume[id]
  }
  if (note !== 'answer') return remarks[note][id]

  const entry = saved.interviews.at(-1)
  const name = brief.suspects.find(person => person.id === entry?.suspect)?.name
  if (!entry || !name) return remarks.resume[id]
  if (entry.contradiction) return {
    adrian: 'Keep the original answer beside the correction.',
    selena: 'That changes the statement. I want both versions on the record.',
    elias: 'I’ll cross-reference the correction with the file we presented.',
  }[id]
  if (entry.topic === 'alibi') return {
    adrian: `Can we place ${name} there independently?`,
    selena: `Who else could verify where ${name} was?`,
    elias: `I’d check the times in ${name}’s account against a record.`,
  }[id]
  const followUp = saved.interviews.filter(answer => answer.suspect === entry.suspect).length > 1
  return {
    adrian: followUp ? 'Read those answers together. Does the sequence hold?' : `I’ll keep ${name}’s wording in the notes.`,
    selena: followUp ? 'I’d put that beside the earlier answer.' : `Which part of ${name}’s statement can we check first?`,
    elias: followUp ? 'I’ll note what this answer adds to the first.' : `Let’s find an independent source for ${name}’s statement.`,
  }[id]
}
