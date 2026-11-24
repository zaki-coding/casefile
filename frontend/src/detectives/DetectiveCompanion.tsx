import { useRef, useState } from 'react'
import type { Investigation, PlayerProfile } from '../api'
import { focusAbility, paths, type GameScreen } from '../navigation'
import { portraits } from './portraits'

interface Props {
  detective: PlayerProfile['detectives'][number]
  saved: Investigation
  screen: GameScreen
  line: string
}

export function DetectiveCompanion({ detective, saved, screen, line }: Props) {
  const [expanded, setExpanded] = useState(false)
  const toggle = useRef<HTMLButtonElement>(null)
  const abilityRoom = saved.abilityOptions.type === 'pressure' ? 'interviews' : 'evidence'
  const shortcuts = [
    { label: 'Evidence board', path: paths.game(saved.id, 'evidence'), current: screen === 'evidence' },
    { label: 'Suspect interviews', path: paths.game(saved.id, 'interviews'), current: screen === 'interviews' },
    saved.result
      ? { label: 'Final report', path: paths.game(saved.id, 'verdict'), current: screen === 'verdict' }
      : { label: 'View ' + detective.ability, path: paths.ability(saved.id, abilityRoom), current: false },
  ]

  return <aside className="companion" aria-label="Detective companion" onKeyDown={event => {
    if (event.key === 'Escape' && expanded) {
      setExpanded(false)
      toggle.current?.focus()
    }
  }}>
    <div className="companion-card">
      <div className="companion-head">
        <img className="companion-portrait" src={portraits[detective.id]} alt={detective.name} width="54" height="58" />
        <div className="companion-copy">
          <strong>{detective.name}</strong>
          <p role="status" aria-atomic="true">{line}</p>
        </div>
        <button type="button" ref={toggle} className="companion-toggle" aria-controls="companion-shortcuts"
          aria-expanded={expanded} aria-label={(expanded ? 'Hide' : 'Show') + ' detective shortcuts'}
          onClick={() => setExpanded(open => !open)}>
          <span>Shortcuts</span><i aria-hidden="true" />
        </button>
      </div>
      <nav className="companion-actions" id="companion-shortcuts" aria-label="Detective shortcuts" hidden={!expanded}>
        {shortcuts.map(link => <a key={link.path} href={'#' + link.path} aria-current={link.current ? 'page' : undefined}
          onClick={event => {
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
            setExpanded(false)
            if (window.location.hash === '#' + link.path) {
              if (link.path.endsWith('/ability')) focusAbility()
              else document.querySelector<HTMLElement>('main h1')?.focus()
            }
          }}>{link.label}<span aria-hidden="true">↗</span></a>)}
      </nav>
    </div>
  </aside>
}
