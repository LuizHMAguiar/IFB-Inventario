import { useEffect, useState, useRef } from 'react'
import { useSpeechToText } from '../hooks/useSpeechToText'
import { parseSpeechText } from '../lib/parser'
import { findItemByNumero } from '../lib/db'
import { fillFormWithData, type FormData } from '../lib/fillForm'
import { csvFileToDbBytes } from '../lib/csvToSqlite'

type Props = { db?: any | null; initialRoom?: string }

export default function VoiceForm({ db, initialRoom }: Props){
  const { text, listening, startListening, stopListening, reset } = useSpeechToText()
  const [lastTranscript, setLastTranscript] = useState('')
  const [form, setForm] = useState<FormData>({
    numero: '', descricao:'', sala:'', estado:'', status:'', etiquetado:'', observacao:'', recomendacao:''
  })
  const [autoFilled, setAutoFilled] = useState<Record<keyof FormData, boolean>>({
    numero: false,
    descricao: false,
    sala: false,
    estado: false,
    status: false,
    etiquetado: false,
    observacao: false,
    recomendacao: false,
  })
  const [loading, setLoading] = useState(false)

  useEffect(()=>{
    if (initialRoom) setForm(f=>({...f, sala: initialRoom}))
  },[initialRoom])

  useEffect(() => {
    async function handle(){
      if (!text) return
      setLastTranscript(text)
      setLoading(true)
      try {
        const parsed = parseSpeechText(text)
        // search in db
        const item = db && parsed.numero ? findItemByNumero(db, parsed.numero) : null
        const filled = fillFormWithData(item, parsed)
        setForm(filled)
        // compute which fields were auto-filled (from parsed or from matched item)
        const flags: Record<keyof FormData, boolean> = {
          numero: Boolean((parsed.numero ?? '') || (item && (item.numero ?? item.id ?? item.etiqueta ?? ''))),
          descricao: Boolean((parsed.descricao ?? '') || (item && (item.descricao ?? item.descricao_item ?? item.Descricao ?? ''))),
          sala: Boolean((parsed.sala ?? '') || (item && (item.sala ?? item.local ?? item.Sala ?? ''))),
          estado: Boolean(parsed.estado ?? ''),
          status: Boolean(parsed.status ?? ''),
          etiquetado: Boolean(parsed.etiquetado ?? ''),
          observacao: Boolean((parsed.observacao ?? '') || (item && (item.observacao ?? ''))),
          recomendacao: Boolean(parsed.recomendacao ?? ''),
        }
        setAutoFilled(flags)
      } catch (err:any){
        console.error(err)
        alert('Erro ao processar a frase: ' + (err.message || err))
      } finally {
        setLoading(false)
      }
    }
    handle()
  }, [text, db])

  // Import handled by parent App; VoiceForm only uses `db` prop.
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const handleCsvDownload = async () => {
    const input = fileInputRef.current
    const f = input?.files?.[0]
    if (!f) return alert('Selecione um arquivo CSV primeiro')
    setLoading(true)
    try {
      const bytes = await csvFileToDbBytes(f)
      const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
      const ab = arr.buffer.slice(arr.byteOffset, arr.byteOffset + arr.byteLength) as ArrayBuffer
      const blob = new Blob([ab], { type: 'application/octet-stream' })
      const filename = (f.name.replace(/\.csv$/i, '') || 'database') + '.db'
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err:any) {
      console.error(err)
      alert('Erro ao converter CSV: ' + (err.message || err))
    } finally {
      setLoading(false)
    }
  }

  const handleCsvSaveToFolder = async () => {
    const input = fileInputRef.current
    const f = input?.files?.[0]
    if (!f) return alert('Selecione um arquivo CSV primeiro')
    if (!(window as any).showDirectoryPicker) {
      return alert('API de acesso a arquivos não suportada neste navegador. Use o botão de baixar.')
    }
    setLoading(true)
    try {
      const bytes = await csvFileToDbBytes(f)
      const filename = (f.name.replace(/\.csv$/i, '') || 'database') + '.db'
      const dirHandle = await (window as any).showDirectoryPicker()
      const fileHandle = await dirHandle.getFileHandle(filename, { create: true })
      const writable = await fileHandle.createWritable()
      const arr2 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
      const ab2 = arr2.buffer.slice(arr2.byteOffset, arr2.byteOffset + arr2.byteLength) as ArrayBuffer
      await writable.write(ab2)
      await writable.close()
      alert('Arquivo salvo: ' + filename)
    } catch (err:any) {
      console.error(err)
      alert('Erro ao salvar arquivo: ' + (err.message || err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
        <div style={{display:'flex', gap:12, alignItems:'center', marginBottom:12}}>
        <button
          className="mic"
          onMouseDown={() => { reset(); startListening(); }}
          onMouseUp={() => { stopListening(); }}
          onTouchStart={(e)=>{ e.preventDefault(); reset(); startListening(); }}
          onTouchEnd={(e)=>{ e.preventDefault(); stopListening(); }}
        >
          {listening ? '🎤 Gravando...' : '🎙️ Pressione e segure'}
        </button>
        <div>
          <div><strong>Transcrição:</strong></div>
          <div style={{minHeight:24}}>{lastTranscript}</div>
        </div>
      </div>

      <div style={{marginBottom:12}}>
        <label>Importar CSV local</label>
        <div style={{display:'flex', gap:8, alignItems:'center', marginTop:8}}>
          <input ref={fileInputRef} id="csvFile" type="file" accept=".csv,text/csv" />
          <button type="button" onClick={handleCsvDownload}>Converter e baixar .db</button>
          <button type="button" onClick={handleCsvSaveToFolder}>Converter e salvar em pasta...</button>
        </div>
      </div>

      <form onSubmit={(e)=>e.preventDefault()}>
        <div className="field">
          <label>Número</label>
          <input className={autoFilled.numero ? 'auto-filled' : ''} value={form.numero} onChange={e=>{ setForm({...form, numero:e.target.value}); setAutoFilled(prev=>({...prev, numero:false})); }} />
        </div>
        <div className="field">
          <label>Descrição</label>
          <input className={autoFilled.descricao ? 'auto-filled' : ''} value={form.descricao} onChange={e=>{ setForm({...form, descricao:e.target.value}); setAutoFilled(prev=>({...prev, descricao:false})); }} />
        </div>
        <div className="field">
          <label>Sala</label>
          <input className={autoFilled.sala ? 'auto-filled' : ''} value={form.sala} onChange={e=>{ setForm({...form, sala:e.target.value}); setAutoFilled(prev=>({...prev, sala:false})); }} />
        </div>
        <div className="field">
          <label>Estado de conservação</label>
          <select className={autoFilled.estado ? 'auto-filled' : ''} value={form.estado} onChange={e=>{ setForm({...form, estado:e.target.value}); setAutoFilled(prev=>({...prev, estado:false})); }}>
            <option value="">-- escolha --</option>
            <option>Bom</option>
            <option>Irreversível</option>
            <option>Recuperável</option>
            <option>Ocioso</option>
          </select>
        </div>
        <div className="field">
          <label>Status</label>
          <select className={autoFilled.status ? 'auto-filled' : ''} value={form.status} onChange={e=>{ setForm({...form, status:e.target.value}); setAutoFilled(prev=>({...prev, status:false})); }}>
            <option value="">-- escolha --</option>
            <option>Localizado</option>
            <option>Migrado</option>
            <option>Não Localizado</option>
          </select>
        </div>
        <div className="field">
          <label>Etiquetado</label>
          <select className={autoFilled.etiquetado ? 'auto-filled' : ''} value={form.etiquetado} onChange={e=>{ setForm({...form, etiquetado:e.target.value}); setAutoFilled(prev=>({...prev, etiquetado:false})); }}>
            <option value="">-- escolha --</option>
            <option>Sim</option>
            <option>Não</option>
          </select>
        </div>
        <div className="field">
          <label>Observação</label>
          <textarea className={autoFilled.observacao ? 'auto-filled' : ''} rows={3} value={form.observacao} onChange={e=>{ setForm({...form, observacao:e.target.value}); setAutoFilled(prev=>({...prev, observacao:false})); }} />
        </div>
        <div className="field">
          <label>Recomendação</label>
          <textarea className={autoFilled.recomendacao ? 'auto-filled' : ''} rows={3} value={form.recomendacao} onChange={e=>{ setForm({...form, recomendacao:e.target.value}); setAutoFilled(prev=>({...prev, recomendacao:false})); }} />
        </div>

        <div style={{marginTop:12}}>
          <button type="button" onClick={()=>alert('Salvar não implementado nesta versão.')}>Salvar</button>
        </div>
      </form>

      {loading && <div style={{marginTop:12}}>Processando...</div>}
    </div>
  )
}
