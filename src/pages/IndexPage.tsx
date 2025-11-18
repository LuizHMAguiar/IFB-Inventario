import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

type SavedBase = { id: string; name: string; b64: string }
const STORAGE_KEY = 'ifb_saved_bases'

export default function IndexPage(){
  const [bases, setBases] = useState<SavedBase[]>([])
  const [loading, setLoading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [sheetName, setSheetName] = useState('')
  const navigate = useNavigate()

  useEffect(()=>{
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    try { setBases(JSON.parse(raw)) } catch{ }
  },[])

  const persistBases = (arr: SavedBase[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr))
    setBases(arr)
  }

  const handleImportFile = async () => {
    if (!file) return alert('Selecione um arquivo CSV primeiro')
    setLoading(true)
    try {
      const text = await file.text()
      const name = (sheetName.trim() || file.name).replace(/[^a-z0-9-_\.]/gi,'_') + '.db'
      // send CSV text to server to create and save .db
      const res = await fetch('http://localhost:3001/import-csv', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ csvText: text, name })
      })
      if (!res.ok) throw new Error('server import failed: ' + res.statusText)
      const body = await res.json()
      const id = Date.now().toString()
      const next = [{ id, name, b64: '' }, ...bases]
      persistBases(next)
      setFile(null)
      setSheetName('')
      alert('Base importada no servidor: ' + body.path)
    } catch (err:any){
      alert('Erro ao importar arquivo: ' + (err.message || err))
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = (b: SavedBase) => {
    sessionStorage.setItem('selected_base_id', b.id)
    navigate('/salas')
  }

  const handleDelete = (id:string) => {
    const next = bases.filter(b=>b.id!==id)
    persistBases(next)
  }

  return (
    <div className="container">
      <h1>Selecionar base / Importar</h1>
      <p className="small">Escolha uma base salva ou importe uma planilha para criar uma nova base.</p>
      <div style={{marginBottom:12}}>
        <label>Importar planilha CSV</label>
        <input type="file" accept=".csv,text/csv" onChange={e=>{
          const f = e.target.files?.[0] || null
          setFile(f)
        }} />
        <label style={{marginTop:8, display:'block'}}>Nome da base (opcional)</label>
        <input value={sheetName} onChange={e=>setSheetName(e.target.value)} placeholder="Nome da base (ex.: Laboratório 2025)" />
        <div style={{marginTop:8}}>
          <button onClick={handleImportFile}>Importar CSV e salvar</button>
        </div>
        {loading && <div style={{marginTop:8}}>Processando...</div>}
      </div>

      <h3>Bases salvas</h3>
      {bases.length === 0 && <div className="small">Nenhuma base salva ainda.</div>}
      <ul>
        {bases.map(b => (
          <li key={b.id} style={{marginBottom:8}}>
            <strong style={{display:'block',maxWidth:700,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{b.name}</strong>
            <div style={{display:'flex',gap:8,marginTop:4}}>
              <button onClick={()=>handleSelect(b)}>Selecionar</button>
              <button onClick={()=>handleDelete(b.id)}>Remover</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
