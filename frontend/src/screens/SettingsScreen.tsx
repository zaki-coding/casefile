import {Back,ScreenHeading} from './SetupScreens'
export type Settings={motion:'system'|'reduce';text:'standard'|'large'}
export function readSettings():Settings {
  try {const s=JSON.parse(localStorage.getItem('casefile-settings')??'null');return {motion:s?.motion==='reduce'?'reduce':'system',text:s?.text==='large'?'large':'standard'}} catch {return {motion:'system',text:'standard'}}
}
export function SettingsScreen({settings,onChange}:{settings:Settings;onChange:(s:Settings)=>void}) {
  return <><Back to="/">Main Menu</Back><ScreenHeading label="BUREAU / PRESENTATION" title="Settings"><p className="muted">Make the bureau comfortable to investigate.</p></ScreenHeading><section className="settings-panel"><label>Screen transitions<select value={settings.motion} onChange={e=>onChange({...settings,motion:e.target.value as Settings['motion']})}><option value="system">Cinematic · respect system reduced motion</option><option value="reduce">Reduced motion · no animated transitions</option></select></label><p className="muted">System accessibility preferences always take priority.</p><label>Reading size<select value={settings.text} onChange={e=>onChange({...settings,text:e.target.value as Settings['text']})}><option value="standard">Standard</option><option value="large">Large</option></select></label><p className="muted">Preferences are saved on this browser. Career progress and investigation findings remain in the bureau's saved records.</p><button onClick={()=>onChange({motion:'system',text:'standard'})}>Restore Presentation Defaults</button></section></>
}
