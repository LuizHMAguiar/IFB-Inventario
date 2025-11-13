import { useEffect, useState } from 'react';
import { useSpeechToText } from '../hooks/useSpeechToText';
import { interpretText } from '../services/openaiClient';

type FormData = {
  id: string;
  state: string;
  observations: string;
  recommendations: string;
};

export function VoiceForm() {
  const { text, listening, startListening, stopListening, reset } = useSpeechToText();
  const [form, setForm] = useState<FormData>({ id:'', state:'', observations:'', recommendations:'' });
  const [loading, setLoading] = useState(false);
  const [lastTranscript, setLastTranscript] = useState('');

  useEffect(() => {
    async function handle() {
      if (!text) return;
      setLastTranscript(text);
      setLoading(true);
      try {
        const parsed = await interpretText(text);
        setForm({
          id: parsed.id ?? '',
          state: parsed.state ?? '',
          observations: parsed.observations ?? '',
          recommendations: parsed.recommendations ?? ''
        });
      } catch (err:any) {
        alert('Erro ao interpretar: ' + (err.message || err));
      } finally {
        setLoading(false);
      }
    }
    handle();
  }, [text]);

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
        <div className="field">
          <label>Número de identificação</label>
          <input value={form.id} onChange={e=>setForm({...form, id:e.target.value})} />
        </div>
        <div className="field">
          <label>Estado do item</label>
          <input value={form.state} onChange={e=>setForm({...form, state:e.target.value})} />
        </div>
        <div className="field">
          <label>Observações</label>
          <textarea rows={3} value={form.observations} onChange={e=>setForm({...form, observations:e.target.value})} />
        </div>
        <div className="field">
          <label>Recomendações</label>
          <textarea rows={3} value={form.recommendations} onChange={e=>setForm({...form, recommendations:e.target.value})} />
        </div>
      </form>

      {loading && <div style={{marginTop:12}}>Interpretando comando...</div>}
    </div>
  );
}
