import { useId } from 'react'

/** Illustrated case locations; namespaced SVG definitions allow several cards per page. */
export function CaseArtwork({ caseId, className = '' }: { caseId: string; className?: string }) {
  const id = useId().replace(/:/g, '')
  const tide = caseId === '002'
  const gradient = (name: string) => `url(#${id}-${name})`
  return <svg className={'case-artwork ' + className} viewBox="0 0 900 600" role="img" aria-label={tide ? 'Kestrel Tide Observatory above a stormy sea, with a brass recording instrument in the foreground' : 'The dark gallery corridor at Bellweather Printworks, a framed lithograph lit by a single lamp'}>
    <defs>
      <linearGradient id={id + '-sky'} x2="0" y2="1"><stop stopColor={tide ? '#152a31' : '#202b27'} /><stop offset="1" stopColor="#080f11" /></linearGradient>
      <linearGradient id={id + '-floor'} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#28322e" /><stop offset="1" stopColor="#0b1112" /></linearGradient>
      <linearGradient id={id + '-brass'} x2="1" y2="1"><stop stopColor="#e1c48b" /><stop offset=".4" stopColor="#8d7449" /><stop offset=".7" stopColor="#c7a86f" /><stop offset="1" stopColor="#5c4c32" /></linearGradient>
      <radialGradient id={id + '-light'}><stop stopColor="#e8ce903b" /><stop offset="1" stopColor="#e8ce9000" /></radialGradient>
      <radialGradient id={id + '-vignette'}><stop offset=".35" stopColor="#00000000" /><stop offset="1" stopColor="#000000a3" /></radialGradient>
      <pattern id={id + '-rain'} width="50" height="70" patternUnits="userSpaceOnUse" patternTransform="rotate(17)"><path d="M12 0v20M41 35v12" stroke="#94b4ad" strokeOpacity=".16" strokeWidth="1" /></pattern>
      <pattern id={id + '-grain'} width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="1" cy="2" r=".6" fill="#ece7dd" opacity=".06" /><circle cx="5" cy="5" r=".7" fill="#000" opacity=".11" /></pattern>
    </defs>
    <rect width="900" height="600" fill={gradient('sky')} />
    {tide ? <>
      <path d="M0 158q100-54 215-5 94-58 224-2 131-72 267-4 85-48 194-11v115H0z" fill="#263a3b" opacity=".65" />
      <path d="m0 280 175-17 124 22 164-31 150 15 141-11 146 24v318H0z" fill="#1b3439" />
      <path d="m0 339 175-21 121 26 125-31 184 26 113-19 182 18M0 380l101 14 139-20 99 28 188-27 174 19 199-18M0 445l125-26 139 20 137-11 191 27 148-20 160 14" fill="none" stroke="#608580" strokeOpacity=".4" strokeWidth="2" />
      <path d="m0 423 108-31 74-84 51 13 69-75 106 82 105 68 61 119 326 85H0z" fill="#101c1c" />
      <path d="m201 332 77-61 83 51m-119 5 40-40 51 36" fill="none" stroke="#47605a" strokeWidth="3" />
      <path d="M255 288V180h179v112z" fill="#39443b" /><path d="M247 185h196l-30-32H278z" fill="#182321" />
      <path d="M282 154v-39q61-62 126 0v39" fill="#47554b" /><path d="M346 81v72m-45-20h89" fill="none" stroke="#91a18b" strokeOpacity=".5" strokeWidth="2" />
      <path d="M274 201h26v51h-26zm49 0h26v51h-26zm49 0h26v51h-26z" fill="#b9a576" opacity=".75" /><path d="M287 201v51m49-51v51m49-51v51" stroke="#46523e" strokeWidth="3" />
      <path d="M238 293h215M345 81V56m-8 0h16" stroke="#819283" strokeWidth="2" />
      <path d="m476 302 68 7 42 120" fill="none" stroke="#57695c" strokeWidth="4" /><path d="m472 287 80 11" stroke="#b1a276" strokeWidth="2" />
      <rect width="900" height="600" fill={gradient('rain')} />
      <path d="m0 519 900-75v156H0z" fill="#17211d" /><path d="m0 529 900-75m-624 60 11 86m318-117 22 117" stroke="#5a6350" strokeOpacity=".6" />
      <g transform="translate(570 328) rotate(-8 120 140)">
        <path d="M16 110h199l32 125-44 29H0z" fill="#111917" stroke="#7b795b" strokeWidth="2" />
        <path d="m19 111 185 4 19 102-195 9z" fill="#39453a" stroke="#9a8a60" />
        <ellipse cx="120" cy="111" rx="67" ry="22" fill={gradient('brass')} /><path d="M53 110v94q67 38 134-4v-90" fill={gradient('brass')} /><ellipse cx="120" cy="201" rx="67" ry="22" fill="#64553a" />
        <path d="M66 125q52 21 108-1M66 141q52 21 108-1M66 157q52 21 108-1M66 173q52 21 108-1" stroke="#534a34" opacity=".6" fill="none" />
        <path d="m207 81-8 108-80-12" stroke="#a8ad8c" strokeWidth="3" fill="none" /><circle cx="199" cy="189" r="6" fill="#2a3430" stroke="#b9aa7c" />
        <rect x="34" y="236" width="91" height="13" fill="#b4a67e" opacity=".8" /><path d="M43 242h74" stroke="#333b2d" />
      </g>
      <ellipse cx="345" cy="233" rx="190" ry="185" fill={gradient('light')} />
    </> : <>
      <path d="M0 0h335v402L0 600zm900 0H565v402l335 198z" fill="#26312a" />
      <path d="M335 0h230v402H335z" fill="#111c19" /><path d="m0 600 335-198h230l335 198z" fill={gradient('floor')} />
      <path d="m0 75 335 88m-335 45 335 22M0 543l335-141M900 75 565 88m335 120-335 22m335 313L565 402" stroke="#4a5546" strokeWidth="2" fill="none" opacity=".6" />
      <path d="M389 200h118v202H389z" fill="#081110" stroke="#66705a" strokeWidth="5" /><path d="M406 217h84v185h-84z" fill="#15231d" stroke="#343f32" /><circle cx="479" cy="318" r="3" fill="#bba574" />
      <path d="M335 402h230M283 436h335M208 482h488M108 542h689M384 402 219 600m282-198 176 198" stroke="#59624d" strokeWidth="1" opacity=".4" />
      <g transform="matrix(.95 .11 0 1 57 99)">
        <rect width="203" height="256" fill="#171f18" stroke={gradient('brass')} strokeWidth="10" /><rect x="9" y="10" width="185" height="236" fill="#b2b197" /><rect x="28" y="32" width="147" height="181" fill="#6f7d68" />
        <path d="m28 181 40-88 28 36 22-51 57 100v35H28z" fill="#3e5749" /><path d="m28 178 48-30 23 29 48-42 28 26v52H28z" fill="#263e35" /><circle cx="140" cy="65" r="13" fill="#c7c2a0" /><path d="M44 232h52m19 0h44" stroke="#6e735e" strokeWidth="2" />
        <path d="m174 26 13 16m-13-11 13 16" stroke="#f0e7c5" strokeOpacity=".5" />
      </g>
      <path d="m665 119 107-23v214l-107-10z" fill="#101c17" stroke="#655e44" strokeWidth="6" /><path d="m678 136 79-13v165l-79-5z" fill="#586452" /><path d="m689 244 21-62 18 26 19-45v115l-58-4z" fill="#2b4437" />
      <path d="m803 91 63-21v263l-63-17z" fill="#0d1713" stroke="#4e4d36" strokeWidth="5" />
      <ellipse cx="160" cy="209" rx="215" ry="240" fill={gradient('light')} /><path d="M127 71h66l14 14h-94z" fill={gradient('brass')} /><path d="M160 0v71" stroke="#71694b" strokeWidth="3" />
      <path d="m113 86-71 282h239L207 86z" fill="#e8ce90" opacity=".035" />
      <g transform="translate(612 435) rotate(9)"><path d="M0 17 136 0l56 113L22 139z" fill="#847b58" /><path d="m16 28 112-12 43 89-133 23z" fill="#b4ad8e" /><path d="m36 46 72-8m-67 22 80-8m-75 22 83-8m-78 22 58-6" stroke="#535f4e" strokeWidth="3" /><circle cx="129" cy="95" r="19" fill="none" stroke="#8b5c4a" strokeWidth="2" /></g>
    </>}
    <rect width="900" height="600" fill={gradient('grain')} /><rect width="900" height="600" fill={gradient('vignette')} />
    <path d="M20 50V20h30m800 0h30v30M20 550v30h30m800 0h30v-30" stroke="#c9a96a" opacity=".3" fill="none" />
  </svg>
}
