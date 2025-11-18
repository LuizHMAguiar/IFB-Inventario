import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { deserializeDbFromBase64 } from '../lib/db'

const STORAGE_KEY = 'ifb_saved_bases'

export default function RoomsPage(){
  const [bases, setBases] = useState<any[]>([])
  const [rooms, setRooms] = useState<string[]>([])
  const [selectedBaseId, setSelectedBaseId] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(()=>{
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    try { setBases(JSON.parse(raw)) } catch{ }
  },[])

  const loadRoomsFromBase = async (b:any) => {
    const db = await deserializeDbFromBase64(b.b64)
    // try to get distinct room/local/Sala column
    try {
      const info = db.exec("PRAGMA table_info('item');");
      const cols = (info[0]?.values ?? []).map((v:any)=>v[1].toString())
      const candidates = ['sala','local','room','Sala','Local','Room']
      const roomCol = cols.find((c:any)=>candidates.includes(c)) || cols[0]
      const stmt = db.prepare(`SELECT DISTINCT "${roomCol}" as room FROM item;`)
      const arr:string[] = []
      while(stmt.step()){
        const o = stmt.getAsObject()
        if (o.room) arr.push(o.room.toString())
      }
      stmt.free()
      setRooms(arr.filter(Boolean))
      setSelectedBaseId(b.id)
      // Salvar a base selecionada na sessão para uso posterior
      sessionStorage.setItem('selected_base_b64', b.b64)
    } catch (err:any){
      console.error(err)
      alert('Erro ao listar salas: ' + (err.message||err))
    }
  }

  const handleSelectRoom = (room:string) => {
    if (!selectedBaseId) return alert('Selecione uma base primeiro')
    sessionStorage.setItem('selected_base_id', selectedBaseId)
    sessionStorage.setItem('selected_room', room)
    navigate('/item')
  }

  return (
    <div className="container">
      <h1>Escolher Sala</h1>
      <div>
        <h3>Bases</h3>
        <ul>
          {bases.map(b=> (
            <li key={b.id} style={{marginBottom:8}}>
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <div style={{flex:1,overflow:'hidden',textOverflow:'ellipsis'}}>{b.name}</div>
                <button onClick={()=>loadRoomsFromBase(b)}>Selecionar</button>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <div style={{marginTop:12}}>
        <h3>Salas</h3>
        {rooms.length === 0 && <div className="small">Nenhuma sala carregada</div>}
        <ul>
          {rooms.map(r=> (
            <li key={r} style={{marginBottom:6}}>
              <button onClick={()=>handleSelectRoom(r)}>{r}</button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
