import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { AlertTriangle, XCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";

interface ImportError {
  lineNumber: number;
  content: string;
  reason: string;
}

interface ImportErrorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalLines: number;
  importedCount: number;
  skippedLines: ImportError[];
  onConfirm: () => void;
  onCancel: () => void;
}

export function ImportErrorDialog({
  open,
  onOpenChange,
  totalLines,
  importedCount,
  skippedLines,
  onConfirm,
  onCancel
}: ImportErrorDialogProps) {
  const errorCount = skippedLines.length;
  const expectedCount = totalLines - 1; // Minus header
  const successRate = ((importedCount / expectedCount) * 100).toFixed(1);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="size-6 text-orange-600" />
            Aviso: Importação Incompleta
          </DialogTitle>
          <DialogDescription>
            {errorCount} {errorCount === 1 ? 'linha não pôde' : 'linhas não puderam'} ser importada(s) corretamente
          </DialogDescription>
        </DialogHeader>

        <Alert variant="destructive" className="my-4">
          <XCircle className="size-4" />
          <AlertTitle>Resumo da Importação</AlertTitle>
          <AlertDescription>
            <div className="mt-2 space-y-1">
              <p>Total de linhas no arquivo (excluindo cabeçalho): <strong>{expectedCount}</strong></p>
              <p>Itens importados com sucesso: <strong className="text-green-600">{importedCount}</strong></p>
              <p>Linhas não importadas: <strong className="text-red-600">{errorCount}</strong></p>
              <p>Taxa de sucesso: <strong className={
                parseFloat(successRate) >= 95 ? "text-green-600" : 
                parseFloat(successRate) >= 70 ? "text-orange-600" : "text-red-600"
              }>{successRate}%</strong></p>
            </div>
          </AlertDescription>
        </Alert>

        <div className="flex-1 overflow-hidden">
          <h3 className="mb-3">Lista de Linhas com Problemas ({errorCount}):</h3>
          <ScrollArea className="h-[300px] border rounded-lg p-4">
            <div className="space-y-4">
              {skippedLines.map((error, index) => (
                <div key={index} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-2 mb-2">
                    <span className="px-2 py-1 bg-red-600 text-white rounded text-sm shrink-0">
                      Linha {error.lineNumber}
                    </span>
                    <span className="text-red-700 text-sm flex-1">{error.reason}</span>
                  </div>
                  <div className="bg-white p-2 rounded border border-red-200 text-xs font-mono overflow-x-auto">
                    {error.content || '(linha vazia)'}
                    {error.content && error.content.length >= 200 && '...'}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
          <p className="mb-1">💡 <strong>Dicas para corrigir o arquivo:</strong></p>
          <ul className="list-disc list-inside space-y-1 text-slate-700">
            <li>Verifique se todas as linhas possuem o mesmo número de colunas (8 no total)</li>
            <li>Certifique-se de que o campo NUMERO está preenchido em todas as linhas</li>
            <li>Campos com vírgulas devem estar entre aspas duplas</li>
            <li>Remova linhas completamente vazias do arquivo</li>
          </ul>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <div className="flex-1 text-sm text-slate-600">
            Recomendamos corrigir o arquivo CSV antes de prosseguir para garantir a integridade dos dados.
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onCancel}>
              Cancelar Importação
            </Button>
            <Button onClick={onConfirm} variant="default">
              Importar Mesmo Assim ({importedCount} itens)
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}