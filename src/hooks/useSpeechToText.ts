import { useEffect, useRef, useState } from 'react';

export function useSpeechToText() {
  const [text, setText] = useState('');
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SpeechRecognition) return;
    const r = new SpeechRecognition();
    r.lang = 'pt-BR';
    r.interimResults = false;
    r.maxAlternatives = 1;
    r.onresult = (e:any) => {
      const t = Array.from(e.results).map((r:any)=>r[0].transcript).join('');
      setText(t);
    };
    r.onend = () => {
      setListening(false);
    };
    recognitionRef.current = r;
  }, []);

  const startListening = () => {
    if (!recognitionRef.current) return alert('SpeechRecognition não suportado neste navegador.');
    setText('');
    setListening(true);
    recognitionRef.current.start();
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  const reset = () => setText('');

  return { text, listening, startListening, stopListening, reset };
}
