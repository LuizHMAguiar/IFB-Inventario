import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Papa from 'papaparse'

type SavedBase = { id: string; name: string; json: any }
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
      // Parse CSV to JSON using PapaParse (header:true -> array of objects)
      const parsed = await new Promise<any>((resolve, reject) => {
        Papa.parse(file, { header: true, skipEmptyLines: true, complete: resolve, error: reject })
      })

      const headers = parsed.meta.fields || []
      const rows = parsed.data || []
      const id = Date.now().toString()
      const name = (sheetName.trim() || file.name).replace(/[^a-z0-9-_\.]/gi,'_') + '.json'

      const json = { headers, rows }
      const next = [{ id, name, json }, ...bases]
      persistBases(next)
      setFile(null)
      setSheetName('')
      alert('Arquivo CSV importado e salvo como JSON no localStorage!')
    } catch (err:any){
      alert('Erro ao importar arquivo: ' + (err.message || err))
    } finally {
      setLoading(false)
    }
  }

  const handleExportJson = async (b: SavedBase) => {
    setLoading(true)
    try {
      const jsonStr = JSON.stringify(b.json, null, 2)
      const blob = new Blob([jsonStr], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = b.name
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      alert('Arquivo JSON baixado: ' + b.name)
    } catch (err: any) {
      alert('Erro ao exportar JSON: ' + (err.message || err))
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
          <button onClick={handleImportFile}>Importar CSV e salvar (JSON)</button>
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
              <button onClick={()=>handleExportJson(b)}>Baixar JSON</button>
              <button onClick={()=>handleDelete(b.id)}>Remover</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
