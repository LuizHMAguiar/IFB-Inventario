import React from 'react';
import { VoiceForm } from './components/VoiceForm';

export default function App() {
  return (
    <div className="container">
      <h1>Formulário por voz</h1>
      <p>Pressione e segure o botão de microfone, fale o comando e solte. O sistema preencherá o formulário automaticamente.</p>
      <VoiceForm />
    </div>
  );
}
