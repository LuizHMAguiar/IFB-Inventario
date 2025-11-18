import { useEffect, useState } from 'react'
import VoiceForm from '../components/VoiceForm'
import { deserializeDbFromBase64 } from '../lib/googleSheetToSqlite'

export default function ItemPage(){
  const [db, setDb] = useState<any|null>(null)
  const [room, setRoom] = useState<string|undefined>(undefined)

  useEffect(()=>{
    const baseId = sessionStorage.getItem('selected_base_id')
    const room = sessionStorage.getItem('selected_room') || undefined
    setRoom(room)
    if (!baseId) return
    const raw = localStorage.getItem('ifb_saved_bases')
    if (!raw) return
    try {
      const bases = JSON.parse(raw)
      const b = bases.find((x:any)=>x.id === baseId)
      if (!b) return
      deserializeDbFromBase64(b.b64).then((d)=>setDb(d)).catch(err=>alert('Erro ao carregar DB: '+(err.message||err)))
    } catch (err:any){ console.error(err) }
  },[])

  return (
    <div className="container">
      <h1>Item — Sala: {room ?? '—'}</h1>
      <VoiceForm db={db} initialRoom={room} />
    </div>
  )
}
