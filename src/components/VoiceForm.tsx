import { useEffect, useState } from 'react'
import { useSpeechToText } from '../hooks/useSpeechToText'
import { parseSpeechText } from '../lib/parser'
import { importGoogleSheetToSQLite, type DB } from '../lib/googleSheetToSqlite'
import { findItemByNumero } from '../lib/db'
import { fillFormWithData, type FormData } from '../lib/fillForm'

export default function VoiceForm(){
  const { text, listening, startListening, stopListening, reset } = useSpeechToText()
  const [db, setDb] = useState<DB | null>(null)
  const [lastTranscript, setLastTranscript] = useState('')
  const [form, setForm] = useState<FormData>({
    numero: '', descricao:'', sala:'', estado:'', status:'', etiquetado:'', observacao:'', recomendacao:''
  })
  const [loading, setLoading] = useState(false)

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
      } catch (err:any){
        console.error(err)
        alert('Erro ao processar a frase: ' + (err.message || err))
      } finally {
        setLoading(false)
      }
    }
    handle()
  }, [text, db])

  const handleImport = async () => {
    const url = (document.getElementById('sheetUrl') as HTMLInputElement).value.trim()
    if (!url) return alert('Cole o link da planilha (formato public CSV)')
    setLoading(true)
    try {
      const dbInstance = await importGoogleSheetToSQLite(url)
      setDb(dbInstance)
      alert('Planilha importada para banco local.')
    } catch (err:any){
      alert('Erro ao importar: ' + (err.message || err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div style={{marginBottom:12}}>
        <label>Link público da Google Sheets (use o link de export CSV)</label>
        <input id="sheetUrl" placeholder="https://docs.google.com/spreadsheets/d/ID/export?format=csv" />
        <div style={{marginTop:8}}>
          <button onClick={handleImport}>Importar planilha</button>
        </div>
      </div>

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

      <form onSubmit={(e)=>e.preventDefault()}>
        <div className="field">
          <label>Número</label>
          <input value={form.numero} onChange={e=>setForm({...form, numero:e.target.value})} />
        </div>
        <div className="field">
          <label>Descrição</label>
          <input value={form.descricao} onChange={e=>setForm({...form, descricao:e.target.value})} />
        </div>
        <div className="field">
          <label>Sala</label>
          <input value={form.sala} onChange={e=>setForm({...form, sala:e.target.value})} />
        </div>
        <div className="field">
          <label>Estado de conservação</label>
          <select value={form.estado} onChange={e=>setForm({...form, estado:e.target.value})}>
            <option value="">-- escolha --</option>
            <option>Bom</option>
            <option>Irreversível</option>
            <option>Recuperável</option>
            <option>Ocioso</option>
          </select>
        </div>
        <div className="field">
          <label>Status</label>
          <select value={form.status} onChange={e=>setForm({...form, status:e.target.value})}>
            <option value="">-- escolha --</option>
            <option>Localizado</option>
            <option>Migrado</option>
            <option>Não Localizado</option>
          </select>
        </div>
        <div className="field">
          <label>Etiquetado</label>
          <select value={form.etiquetado} onChange={e=>setForm({...form, etiquetado:e.target.value})}>
            <option value="">-- escolha --</option>
            <option>Sim</option>
            <option>Não</option>
          </select>
        </div>
        <div className="field">
          <label>Observação</label>
          <textarea rows={3} value={form.observacao} onChange={e=>setForm({...form, observacao:e.target.value})} />
        </div>
        <div className="field">
          <label>Recomendação</label>
          <textarea rows={3} value={form.recomendacao} onChange={e=>setForm({...form, recomendacao:e.target.value})} />
        </div>

        <div style={{marginTop:12}}>
          <button type="button" onClick={()=>alert('Salvar não implementado nesta versão.')}>Salvar</button>
        </div>
      </form>

      {loading && <div style={{marginTop:12}}>Processando...</div>}
    </div>
  )
}
