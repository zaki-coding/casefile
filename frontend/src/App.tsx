import {useEffect,useReducer,useRef,useState} from 'react'
import {api,rememberInvestigation,resume,start,type CaseBrief,type CaseSummary,type Investigation,type PlayerProfile,type SavedInvestigation} from './api'
import {clearConfirmation,confirmDetective,createBeginGate,focusAbility,hasConfirmedDetective,navigate,parseRoute,paths,useRoute} from './navigation'
import {Back,CaseBriefing,CaseSelection,CareerScreen,ContinueScreen,DetectiveConfirmation,DetectiveSelection,MainMenu,ScreenHeading} from './screens/SetupScreens'
import {AccusationScreen,EquipmentScreen,EvidenceScreen,GameNavigation,InterviewsScreen,ResultsScreen} from './screens/InvestigationScreens'
import {readSettings,SettingsScreen,type Settings} from './screens/SettingsScreen'
import {DetectiveCompanion} from './detectives/DetectiveCompanion'
import {fieldNote,updateDossier} from './detectives/fieldNotes'

export function App() {
  const {route,key}=useRoute()
  const [profile,setProfile]=useState<PlayerProfile>()
  const [cases,setCases]=useState<CaseSummary[]>([])
  const [saves,setSaves]=useState<SavedInvestigation[]>([])
  const [latest,setLatest]=useState<string>()
  const [{saved:state,note},dispatch]=useReducer(updateDossier,{note:'resume'})
  const [brief,setBrief]=useState<CaseBrief>()
  const [busy,setBusy]=useState(false)
  const [loading,setLoading]=useState(true)
  const [gameLoading,setGameLoading]=useState(false)
  const [error,setError]=useState('')
  const [attempt,setAttempt]=useState(0)
  const [settings,setSettings]=useState(readSettings)
  const mutation=useRef(false)
  const beginGate=useRef(createBeginGate<Investigation>())
  const scrollArea=useRef<HTMLDivElement>(null)
  const gameId=route.name==='game'?route.id:undefined
  const selected='detectiveId' in route?profile?.detectives.find(d=>d.id===route.detectiveId):undefined
  const assigned=profile?.detectives.find(d=>d.id===state?.detectiveId)

  useEffect(()=>{
    let active=true
    setLoading(true);setError('')
    Promise.all([api<PlayerProfile>('/profile'),api<CaseSummary[]>('/cases'),api<SavedInvestigation[]>('/investigations'),resume()]).then(([p,c,a,last])=>{
      if(!active)return
      setProfile(p);setCases(c);setSaves(a);setLatest(last?.id)
    }).catch(e=>{if(active)setError(e.message)}).finally(()=>{if(active)setLoading(false)})
    return ()=>{active=false}
  },[attempt])

  useEffect(()=>{
    if(!gameId)return
    let active=true
    setGameLoading(true);setError('')
    api<Investigation>('/investigations/'+gameId).then(async saved=>{
      const dossier=await api<CaseBrief>('/case/'+saved.caseId)
      if(!active)return
      dispatch({type:'restore',saved});setBrief(dossier);rememberInvestigation(saved.id);setLatest(saved.id)
    }).catch(e=>{if(active)setError(e.message)}).finally(()=>{if(active)setGameLoading(false)})
    return ()=>{active=false}
  },[gameId,attempt])

  useEffect(()=>{
    if(!profile || !('detectiveId' in route))return
    if(!selected?.unlocked){navigate(paths.detectives,true);return}
    if((route.name==='cases'||route.name==='briefing')&&!hasConfirmedDetective(selected.id))navigate(paths.confirm(selected.id),true)
  },[key,profile,selected])

  useEffect(()=>{
    if(route.name!=='game'||!state||state.id!==route.id)return
    if(state.result&&route.screen==='accusation')navigate(paths.game(state.id,'verdict'),true)
    if(!state.result&&route.screen==='verdict')navigate(paths.game(state.id,'evidence'),true)
  },[key,state])

  useEffect(()=>{
    document.documentElement.style.fontSize=settings.text==='large'?'112.5%':''
    localStorage.setItem('casefile-settings',JSON.stringify(settings))
  },[settings])

  useEffect(()=>{
    if(loading||gameLoading)return
    window.scrollTo({top:0,behavior:'instant'})
    if(scrollArea.current)scrollArea.current.scrollTop=0
    const heading=document.querySelector<HTMLElement>('main h1')
    if(route.name==='game'&&route.focus==='ability')focusAbility()
    else heading?.focus({preventScroll:true})
    document.title='Casefile AI | '+(route.name==='menu'?'Main Menu':heading?.innerText.replace(/\s+/g,' ')??'Detective Bureau')
  },[key,loading,gameLoading])

  useEffect(()=>{setError('')},[key])

  function setWorking(value:boolean) {
    mutation.current=value
    setBusy(value)
  }
  async function run(action:()=>Promise<void>) {
    if(mutation.current)return
    setWorking(true);setError('')
    try{await action()}catch(e){setError(e instanceof Error?e.message:'Could not update the dossier. Try again.')}
    finally{setWorking(false)}
  }
  function chooseDetective(id:string){clearConfirmation();navigate(paths.confirm(id))}
  function confirm(){if(!selected?.unlocked)return;void run(async()=>{
    setProfile(await api<PlayerProfile>('/profile/detective','PUT',{detectiveId:selected.id}))
    confirmDetective(selected.id);navigate(paths.cases(selected.id))
  })}
  function begin(){if(route.name!=='briefing'||!selected?.unlocked||!hasConfirmedDetective(selected.id))return
    const {caseId}=route
    void run(async()=>{
      const saved=await beginGate.current(()=>start(caseId,selected.id))
      rememberInvestigation(saved.id);setLatest(saved.id);dispatch({type:'begin',saved})
      setSaves(previous=>[{id:saved.id,caseId:saved.caseId,detectiveId:saved.detectiveId,closed:false},...previous.filter(s=>s.id!==saved.id)])
      navigate(paths.game(saved.id,'evidence'),true)
    })
  }
  function update(path:string,data?:unknown){if(!state)return
    const id=state.id
    void run(async()=>{
      const updated=await api<Investigation>('/investigations/'+id+path,'POST',data)
      acceptUpdate(updated)
      if(updated.result){
        setSaves(previous=>previous.map(s=>s.id===id?{...s,closed:true}:s))
        const location=parseRoute(window.location.hash)
        if(location.name==='game'&&location.id===id)navigate(paths.game(id,'verdict'))
        setProfile(await api<PlayerProfile>('/profile'))
      }
    })
  }
  function acceptUpdate(saved:Investigation){dispatch({type:'update',saved})}
  function replay(){if(!state)return
    // Replay still passes through explicit character confirmation and briefing.
    clearConfirmation();sessionStorage.setItem('casefile-replay-case',state.caseId)
    navigate(paths.confirm(state.detectiveId))
  }
  function confirmWithReplay(){
    if(!selected?.unlocked)return
    const caseId=sessionStorage.getItem('casefile-replay-case')
    if(!caseId){confirm();return}
    void run(async()=>{
      setProfile(await api<PlayerProfile>('/profile/detective','PUT',{detectiveId:selected.id}))
      confirmDetective(selected.id);sessionStorage.removeItem('casefile-replay-case')
      navigate(paths.briefing(selected.id,caseId))
    })
  }

  function content(){
    if(loading)return <p role="status">Opening the bureau…</p>
    if(!profile)return <><ScreenHeading label="BUREAU OFFLINE" title="The records are unavailable"/><button onClick={()=>setAttempt(a=>a+1)}>Retry Connection</button></>
    if(route.name==='menu')return <MainMenu latest={saves.find(s=>s.id===latest)}/>
    if(route.name==='detectives')return <DetectiveSelection profile={profile} onSelect={id=>{sessionStorage.removeItem('casefile-replay-case');chooseDetective(id)}}/>
    if(route.name==='confirm')return selected?.unlocked?<DetectiveConfirmation detective={selected} busy={busy} onConfirm={confirmWithReplay}/>:<p role="status">Checking personnel records…</p>
    if(route.name==='cases')return selected?.unlocked&&hasConfirmedDetective(selected.id)?<CaseSelection detective={selected} profile={profile} cases={cases}/>:<p role="status">Checking assignment…</p>
    if(route.name==='briefing'){
      const dossier=cases.find(c=>c.id===route.caseId)
      if(!dossier)return <><Back to={selected?paths.cases(selected.id):'/'}>Choose a Case</Back><ScreenHeading label="MISSING DOSSIER" title="Case not found"/></>
      return selected?.unlocked&&hasConfirmedDetective(selected.id)?<CaseBriefing detective={selected} dossier={dossier} solved={profile.solvedCases.some(s=>s.caseId===dossier.id)} busy={busy} onBegin={begin}/>:<p role="status">Checking assignment…</p>
    }
    if(route.name==='continue')return <ContinueScreen saves={saves} cases={cases} profile={profile} latest={latest}/>
    if(route.name==='career')return <CareerScreen profile={profile}/>
    if(route.name==='settings')return <SettingsScreen settings={settings} onChange={setSettings}/>
    if(route.name==='game'){
      if(gameLoading)return <p role="status">Restoring investigation…</p>
      if(!state||!brief||state.id!==route.id||brief.id!==state.caseId)return <><Back to="/continue">Saved Investigations</Back><ScreenHeading label="RECORD UNAVAILABLE" title="Unable to open this investigation"/><button onClick={()=>setAttempt(a=>a+1)}>Retry Dossier</button></>
      const props={state,brief,busy,update}
      if(route.screen==='verdict')return state.result?<ResultsScreen state={state} brief={brief} profile={profile} onReplay={replay}/>:<p role="status">Opening evidence room…</p>
      return <div className="game-layout"><GameNavigation state={state} brief={brief} screen={route.screen} detective={assigned?.name??state.detectiveId}/><div className="game-content">
        {route.screen==='evidence'&&<EvidenceScreen {...props}/>}
        {route.screen==='interviews'&&<InterviewsScreen {...props} detectiveName={assigned?.name} onUpdate={acceptUpdate} onBusy={setWorking}/>}
        {route.screen==='equipment'&&<EquipmentScreen {...props} onUpdate={acceptUpdate} onBusy={setWorking}/>}
        {route.screen==='accusation'&&!state.result&&<AccusationScreen {...props}/>}
      </div></div>
    }
    return <><Back to="/">Main Menu</Back><ScreenHeading label="UNFILED LOCATION" title="This room does not exist"/></>
  }
  const companion=route.name==='game' && !loading && !gameLoading && state?.id===route.id &&
    brief?.id===state.caseId && assigned &&
    <DetectiveCompanion key={state.id} detective={assigned} saved={state} screen={route.screen}
      line={fieldNote(state,brief,route.screen,note)} />

  return <div className={companion?'investigation-viewport':undefined} data-motion={settings.motion}>
    <div className="page-scroll" ref={scrollArea}><div className="shell">
    <header className="mast"><a className="brand" href="#/" aria-label="Casefile AI Main Menu"><img className="bureau-mark" src="/bureau.svg" alt=""/>CASEFILE<span className="accent">AI</span></a><span className="label">DETECTIVE BUREAU / INVESTIGATIONS DIVISION</span></header>
    {error&&<p className="error" role="alert">{error}</p>}
    <main className={'game-screen screen-'+route.name} key={key}>{content()}</main>
    <footer>CASEFILE AI <span>•</span> FICTIONAL INVESTIGATIONS DIVISION</footer>
    </div></div>
    {companion}
  </div>
}
