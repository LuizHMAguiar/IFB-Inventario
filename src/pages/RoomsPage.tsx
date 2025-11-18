import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

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
    try {
      const headers: string[] = (b?.json?.headers) || []
      const rows: any[] = (b?.json?.rows) || []

      if (!headers || headers.length === 0) {
        alert('A base selecionada não contém cabeçalhos (headers). Importe um CSV com cabeçalho.')
        return
      }

      // busca por candidatos de nome de coluna de sala (case-insensitive, substrings)
      const lowerHeaders = headers.map(h => String(h).toLowerCase().trim())
      const candidates = ['sala','local','room','localizacao','localização','sala_nome','ambiente','setor']
      let idx = lowerHeaders.findIndex(h => candidates.includes(h))
      if (idx === -1) {
        idx = lowerHeaders.findIndex(h => h.includes('sala') || h.includes('local') || h.includes('room'))
      }
      if (idx === -1) idx = 0
      const roomCol = headers[idx]

      const arr: string[] = []
      for (const r of rows) {
        const val = r?.[roomCol]
        if (val != null) {
          const s = String(val).trim()
          if (s) arr.push(s)
        }
      }

      const uniq = Array.from(new Set(arr))
      uniq.sort((a,b)=>a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }))
      setRooms(uniq.filter(Boolean))
      setSelectedBaseId(b.id)
      // Salvar a base selecionada (JSON) na sessão para uso posterior
      sessionStorage.setItem('selected_base_json', JSON.stringify(b.json))
      sessionStorage.setItem('selected_base_id', b.id)
    } catch (err:any){
      console.error(err)
      alert('Erro ao listar salas: ' + (err.message||err))
    }
  }

  const handleSelectRoom = (room:string) => {
    if (!selectedBaseId) return alert('Selecione uma base primeiro')
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
                <button onClick={()=>loadRoomsFromBase(b)}>Carregar salas</button>
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
