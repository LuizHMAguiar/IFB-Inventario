import { useState, useEffect, useRef } from "react";
import { Button } from "./ui/button";
import { Mic, MicOff, Volume2 } from "lucide-react";
import { toast } from "sonner";

interface VoiceCommandProps {
  onCommand: (command: VoiceCommandResult) => void;
  isActive: boolean;
}

export interface VoiceCommandResult {
  numero?: string;
  estado?: string;
  observacao?: string;
  recomendacao?: string;
  rawText: string;
}

export function VoiceCommand({ onCommand, isActive }: VoiceCommandProps) {
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
      console.log("--- [Comando de Voz Recebido] ---");
      console.log("Texto bruto:", speechResult);
      
      const command = parseVoiceCommand(speechResult);
      console.log("Comando interpretado:", command);
      onCommand(command);

      const { numero: _numero, rawText: _rawText, ...formData } = command;

      if (Object.keys(formData).length > 0) {
        console.log("Dados para preenchimento do formulário:", formData);
      }
      console.log("--- [Fim do Comando de Voz] ---");
      
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
  }, [onCommand]);

  const parseVoiceCommand = (text: string): VoiceCommandResult => {
    console.log("Iniciando a interpretação do comando...");
    // Normaliza o texto: minúsculas e sem pontuação
    const normalizedText = text.toLowerCase().replace(/[.,]/g, '');
    console.log("Texto normalizado:", normalizedText);

    const result: VoiceCommandResult = {
      rawText: text
    };

    const capitalizeFirstLetter = (str: string) => {
      if (!str) return str;
      return str.charAt(0).toUpperCase() + str.slice(1);
    };

    // Extrai o número do item (com ou sem a palavra "número"/"item")
    const numeroMatch = normalizedText.match(/^(?:\d+|número\s+\d+|item\s+\d+)/);
    if (numeroMatch) {
      const numeroStr = numeroMatch[0].match(/\d+/);
      if (numeroStr) {
        result.numero = numeroStr[0];
        console.log(`Número encontrado: ${result.numero}`);
      }
    }

    // Extrai o estado
    const estadoMatch = normalizedText.match(/estado\s+([\w\sà-ú]+)/i);
    if (estadoMatch) {
      const potentialEstado = estadoMatch[1].split(/observa[çc][ãa]o|recomenda[çc][ãa]o/)[0].trim();
      result.estado = capitalizeFirstLetter(potentialEstado);
      console.log(`Estado encontrado: ${result.estado}`);
    }

    // Extrai a observação
    const observacaoMatch = normalizedText.match(/observa[çc][ãa]o\s+([\w\sà-ú]+)/i);
    if (observacaoMatch) {
      const potentialObservacao = observacaoMatch[1].split(/estado|recomenda[çc][ãa]o/)[0].trim();
      result.observacao = capitalizeFirstLetter(potentialObservacao);
      console.log(`Observação encontrada: ${result.observacao}`);
    }

    // Extrai a recomendação
    const recomendacaoMatch = normalizedText.match(/recomenda[çc][ãa]o\s+(.+)$/i);
    if (recomendacaoMatch) {
      result.recomendacao = capitalizeFirstLetter(recomendacaoMatch[1].trim());
      console.log(`Número encontrado: ${result.numero}`);
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
          "176 recomendação gaveteiro precisa de reparo"
        </code>
      </div>
    </div>
  );
}
