import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { csvFileToDbBytes } from '../lib/csvToSqlite'

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
  
  const uint8ToBase64 = (bytes: Uint8Array) => {
    let binary = ''
    const chunkSize = 0x8000
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize)
      binary += String.fromCharCode.apply(null, Array.from(chunk) as any)
    }
    return btoa(binary)
  }

  const importCsvToDb = async (file: File): Promise<string> => {
    const bytes = await csvFileToDbBytes(file)
    const b64 = uint8ToBase64(bytes)
    return b64
  }

  const handleImportFile = async () => {
    if (!file) return alert('Selecione um arquivo CSV primeiro')
    setLoading(true)
    try {
      const name = (sheetName.trim() || file.name).replace(/[^a-z0-9-_\.]/gi,'_') + '.db'
      const b64 = await importCsvToDb(file)
      const id = Date.now().toString()
      
      // Tentar salvar no servidor (se disponível)
      const serverUrl = process.env.NODE_ENV === 'production' 
        ? window.location.origin 
        : 'http://localhost:3001'
      
      try {
        const saveRes = await fetch(`${serverUrl}/save-db`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, b64 })
        })
        if (saveRes.ok) {
          const result = await saveRes.json()
          console.log('Arquivo salvo em:', result.path)
        }
      } catch (serverErr: any) {
        console.warn('Servidor não disponível - arquivo será salvo localmente apenas')
      }
      
      const next = [{ id, name, b64 }, ...bases]
      persistBases(next)
      setFile(null)
      setSheetName('')
      alert('Base importada com sucesso!')
    } catch (err:any){
      alert('Erro ao importar arquivo: ' + (err.message || err))
    } finally {
      setLoading(false)
    }
  }

  const handleExportDb = async (b: SavedBase) => {
    setLoading(true)
    try {
      const binary = atob(b.b64)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i)
      }
      
      // Tentar usar File System Access API (Chrome, Edge, Opera)
      if ((window as any).showSaveFilePicker) {
        try {
          const fileHandle = await (window as any).showSaveFilePicker({
            suggestedName: b.name,
            types: [{ description: 'Database Files', accept: { 'application/octet-stream': ['.db'] } }]
          })
          const writable = await fileHandle.createWritable()
          await writable.write(bytes)
          await writable.close()
          alert('Arquivo salvo com sucesso: ' + b.name)
          return
        } catch (err: any) {
          if (err.name !== 'AbortError') {
            console.warn('Erro ao usar File System Access API:', err)
          }
        }
      }
      
      // Fallback: Download via blob
      const blob = new Blob([bytes], { type: 'application/octet-stream' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = b.name
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      alert('Arquivo baixado: ' + b.name)
    } catch (err: any) {
      alert('Erro ao exportar arquivo: ' + (err.message || err))
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
              <button onClick={()=>handleExportDb(b)}>Baixar .db</button>
              <button onClick={()=>handleDelete(b.id)}>Remover</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
