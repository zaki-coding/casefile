import './portrait.css'

const artwork: Readonly<Record<string, string>> = {
  mara: new URL('./portraits/mara.svg', import.meta.url).href,
  ellis: new URL('./portraits/ellis.svg', import.meta.url).href,
  june: new URL('./portraits/june.svg', import.meta.url).href,
}

interface PortraitProps {
  suspect: string
  name: string
  className?: string
}

export function Portrait({ suspect, name, className }: PortraitProps) {
  const source = Object.hasOwn(artwork, suspect) ? artwork[suspect] : undefined
  if (!source) return null

  return (
    <figure className={['suspect-portrait', className].filter(Boolean).join(' ')} data-suspect={suspect}>
      <img src={source} alt={`Illustrated portrait of ${name}`} width="320" height="400" />
    </figure>
  )
}
