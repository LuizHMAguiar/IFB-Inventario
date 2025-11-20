import { useState, useEffect, useRef } from "react";
import { Button } from "./ui/button";
import { Mic, MicOff, Volume2 } from "lucide-react";
import { toast } from "sonner";
 
interface VoiceCommandProps {
  onCommand: (command: VoiceCommandResult) => void;
  onFillForm: (data: { estado?: string; observacao?: string }) => void;
  isActive: boolean;
}

export interface VoiceCommandResult {
  numero?: string;
  estado?: string;
  observacao?: string;
  rawText: string;
}

export function VoiceCommand({ onCommand, onFillForm, isActive }: VoiceCommandProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check if browser supports speech recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      toast.error("Seu navegador não suporta reconhecimento de voz");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'pt-BR';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      toast.success("Microfone ativado. Pode falar agora.");
    };

    recognition.onresult = (event: any) => {
      const speechResult = event.results[0][0].transcript;
      setTranscript(speechResult);
      
      const command = parseVoiceCommand(speechResult);
      onCommand(command);

      const { numero: _numero, rawText: _rawText, ...formData } = command;

      if (Object.keys(formData).length > 0) {
        onFillForm(formData);
      }
      
      toast.info(`Comando detectado: ${speechResult}`);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      toast.error(`Erro no reconhecimento de voz: ${event.error}`);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [onCommand, onFillForm]);

  const parseVoiceCommand = (text: string): VoiceCommandResult => {
    const lowerText = text.toLowerCase();
    const result: VoiceCommandResult = {
      rawText: text
    };
  
    // Extrai o número do item (procura por "número" seguido de dígitos, ou apenas dígitos)
    const numeroMatch = lowerText.match(/(?:número\s+)?(\d+)/);
    if (numeroMatch) {
      result.numero = numeroMatch[1];
    }
  
    // Extrai o estado (procura por "estado" seguido do valor até encontrar "observação" ou o fim da string)
    const estadoMatch = lowerText.match(/estado\s+([^observação]+)/i);
    if (estadoMatch) {
      let estado = estadoMatch[1].trim();
      // Remove a palavra "observação" se ela foi capturada indevidamente
      const obsIndex = estado.indexOf('observação');
      if (obsIndex !== -1) {
        estado = estado.substring(0, obsIndex).trim();
      }
      result.estado = estado;
    }
  
    // Extrai a observação (procura por "observação" seguido do resto da string)
    const observacaoMatch = lowerText.match(/observa[çc][ãa]o\s+(.+)$/i);
    if (observacaoMatch) {
      result.observacao = observacaoMatch[1].trim();
    }
  
    return result;
  };

  const toggleListening = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error('Error starting recognition:', error);
        toast.error("Erro ao iniciar reconhecimento de voz");
      }
    }
  };

  if (!isActive) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button
          type="button"
          size="lg"
          variant={isListening ? "destructive" : "default"}
          onClick={toggleListening}
          className="gap-2"
        >
          {isListening ? (
            <>
              <MicOff className="size-5" />
              Parar Gravação
            </>
          ) : (
            <>
              <Mic className="size-5" />
              Ativar Comando de Voz
            </>
          )}
        </Button>

        {isListening && (
          <div className="flex items-center gap-2 text-red-600 animate-pulse">
            <Volume2 className="size-5" />
            <span>Escutando...</span>
          </div>
        )}
      </div>

      {transcript && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700 mb-1">Último comando detectado:</p>
          <p className="text-blue-900">{transcript}</p>
        </div>
      )}

      <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
        <p className="text-sm mb-2">Exemplo de comando de voz:</p>
        <code className="text-sm bg-white px-3 py-2 rounded block">
          "Número 1457 estado bom observação armário sem chave"
        </code>
      </div>
    </div>
  );
}
