import VoiceForm from './components/VoiceForm'

export default function App(){
  return (
    <div className="container">
      <h1>Formulário por voz — React + TypeScript</h1>
      <p className="small">Cole o link público da Google Sheets (export CSV) e importe. Pressione e segure o microfone, fale a frase e solte para preencher o formulário.</p>
      <VoiceForm />
    </div>
  )
}
