import { useEffect, useState } from 'react'
import { useSpeechToText } from '../hooks/useSpeechToText'
import { parseSpeechText } from '../lib/parser'
import { fillFormWithData, type FormData } from '../lib/fillForm'
import { findItemByNumero } from '../services/findItem'

type Props = { db?: any | null; initialRoom?: string }

export default function VoiceForm({ db, initialRoom }: Props){
  const { text, listening, startListening, stopListening, reset } = useSpeechToText()
  const [lastTranscript, setLastTranscript] = useState('')
  const [form, setForm] = useState<FormData>({
    numero: '', descricao:'', sala:'', estado:'', status:'', etiquetado:'', observacao:'', recomendacao:''
  })
  
  const [autoFilled, setAutoFilled] = useState<Record<keyof FormData, boolean>>({
    numero: false, descricao: false, sala: false, estado: false, status: false, etiquetado: false, observacao: false, recomendacao: false,
  })
  
  const [loading, setLoading] = useState(false)

  useEffect(()=>{
    if (initialRoom) setForm(f=>({...f, sala: initialRoom}))
  },[initialRoom])

  const handleManualSearch = () => {
    if (!form.numero) return alert('Digite um número para buscar.');
    
    // Se db for nulo, tente usar a chave padrão como fallback
    const dbToUse = db || 'ifb_saved_bases'; 

    setLoading(true);
    try {
      const item = findItemByNumero(dbToUse, form.numero);
      
      if (item) {
        console.log("Item encontrado:", item); // Para debug

        setForm(prev => ({
          ...prev,
          // Mapeamento das chaves MAIÚSCULAS do seu JSON para o form minúsculo
          descricao: item.DESCRIÇÃO || item.Descricao || item.descricao || prev.descricao,
          sala: item.SALA || item.Sala || item.sala || prev.sala,
          observacao: item.OBSERVAÇÃO || item.Observacao || item.observacao || prev.observacao,
          estado: item['ESTADO DE CONSERVAÇÃO'] || item.Estado || prev.estado,
          status: item.STATUS || item.Status || prev.status,
          etiquetado: item.ETIQUETADO || item.Etiquetado || prev.etiquetado,
          recomendacao: item.RECOMENDAÇÃO || item.Recomendacao || prev.recomendacao
        }));

        setAutoFilled(prev => ({
          ...prev,
          numero: true,
          descricao: true, // Marca como preenchido
          sala: true,
          observacao: !!item.OBSERVAÇÃO,
          estado: !!item['ESTADO DE CONSERVAÇÃO'],
          status: !!item.STATUS,
          etiquetado: !!item.ETIQUETADO,
          recomendacao: !!item.RECOMENDAÇÃO
        }));
      } else {
        alert('Item não encontrado com o número: ' + form.numero);
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao buscar item.');
    } finally {
      setLoading(false);
    }
}
  // -----------------------------------

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

      <form onSubmit={(e)=>e.preventDefault()}>
        
        {/* CAMPO NÚMERO MODIFICADO COM BOTÃO DE LUPA */}
        <div className="field">
          <label>Número</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input 
              className={autoFilled.numero ? 'auto-filled' : ''} 
              value={form.numero} 
              onChange={e=>{ setForm({...form, numero:e.target.value}); setAutoFilled(prev=>({...prev, numero:false})); }} 
              placeholder="Digite o ID..."
            />
            <button 
              type="button" 
              onClick={handleManualSearch}
              title="Buscar dados manualmente"
              style={{ padding: '0 12px', cursor: 'pointer' }}
            >
              🔍
            </button>
          </div>
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