import { useState, useEffect } from "react";
import { type Database } from "../types";
import { parseCSV, exportCSV, downloadCSV, type CSVParseResult } from "../utils/csv";
import { getAllDatabases, saveDatabase, deleteDatabase } from "../utils/storage";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Upload, Trash2, Download, FolderOpen } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Label } from "./ui/label";
import { toast } from "sonner";
import { ImportErrorDialog } from "./ImportErrorDialog";

interface DatabaseManagementProps {
  onSelectDatabase: (database: Database) => void;
}

export function DatabaseManagement({ onSelectDatabase }: DatabaseManagementProps) {
  const [databases, setDatabases] = useState<Database[]>([]);
  const [newDatabaseName, setNewDatabaseName] = useState("");
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [pendingImport, setPendingImport] = useState<CSVParseResult | null>(null);

  useEffect(() => {
    loadDatabases();
  }, []);

  const loadDatabases = () => {
    setDatabases(getAllDatabases());
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!newDatabaseName.trim()) {
      toast.error("Por favor, forneça um nome para a base de dados");
      return;
    }

    try {
      const text = await file.text();
      const parseResult = parseCSV(text);
      
      const expectedCount = parseResult.totalLines - 1; // Minus header
      const importedCount = parseResult.items.length;
      const hasErrors = importedCount < expectedCount;

      if (hasErrors) {
        setPendingImport(parseResult);
        setIsImportDialogOpen(false);
      } else {
        confirmImport(parseResult);
      }
    } catch (error) {
      toast.error(`Erro ao importar CSV: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
    
    // Reset file input
    event.target.value = '';
  };

  const confirmImport = (parseResult: CSVParseResult) => {
    const newDatabase: Database = {
      id: Date.now().toString(),
      name: newDatabaseName,
      items: parseResult.items,
      createdAt: new Date().toISOString()
    };

    saveDatabase(newDatabase);
    loadDatabases();
    setNewDatabaseName("");
    setIsImportDialogOpen(false);
    setPendingImport(null);
    toast.success(`Base de dados "${newDatabaseName}" importada com sucesso! ${parseResult.items.length} itens carregados.`);
  };

  const cancelImport = () => {
    setPendingImport(null);
    setNewDatabaseName("");
    toast.info("Importação cancelada. Por favor, corrija o arquivo CSV e tente novamente.");
  };

  const handleDeleteDatabase = (id: string, name: string) => {
    if (confirm(`Tem certeza que deseja excluir a base de dados "${name}"?`)) {
      deleteDatabase(id);
      loadDatabases();
      toast.success("Base de dados excluída com sucesso");
    }
  };

  const handleExportDatabase = (database: Database) => {
    const csvContent = exportCSV(database.items);
    downloadCSV(csvContent, `${database.name}_${new Date().toISOString().split('T')[0]}.csv`);
    toast.success("Base de dados exportada com sucesso");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-slate-900 mb-2">Sistema de Gestão de Inventário</h1>
          <p className="text-slate-600">Gerencie suas bases de dados de verificação de itens</p>
        </div>

        <div className="mb-6">
          <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Upload className="size-4" />
                Importar Nova Base de Dados
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Importar Base de Dados CSV</DialogTitle>
                <DialogDescription>
                  Faça o upload de um arquivo CSV com as colunas: NUMERO, DESCRIÇÃO, SALA, ESTADO DE CONSERVAÇÃO, STATUS, ETIQUETADO, OBSERVAÇÃO, RECOMENDAÇÃO
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label htmlFor="database-name">Nome da Base de Dados</Label>
                  <Input
                    id="database-name"
                    placeholder="Ex: Inventário 2025"
                    value={newDatabaseName}
                    onChange={(e) => setNewDatabaseName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="csv-file">Arquivo CSV</Label>
                  <Input
                    id="csv-file"
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                  />
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {databases.map((database) => (
            <Card key={database.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FolderOpen className="size-5 text-blue-600" />
                  {database.name}
                </CardTitle>
                <CardDescription>
                  {database.items.length} itens
                  <br />
                  Criado em: {new Date(database.createdAt).toLocaleDateString('pt-BR')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  className="w-full"
                  onClick={() => onSelectDatabase(database)}
                >
                  Abrir Base de Dados
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 gap-2"
                    onClick={() => handleExportDatabase(database)}
                  >
                    <Download className="size-4" />
                    Exportar
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1 gap-2"
                    onClick={() => handleDeleteDatabase(database.id, database.name)}
                  >
                    <Trash2 className="size-4" />
                    Excluir
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {databases.length === 0 && (
          <div className="text-center py-12">
            <FolderOpen className="size-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">Nenhuma base de dados importada ainda</p>
            <p className="text-slate-400">Clique em "Importar Nova Base de Dados" para começar</p>
          </div>
        )}

        {/* Import Error Dialog */}
        {pendingImport && (
          <ImportErrorDialog
            open={!!pendingImport}
            onOpenChange={(open) => !open && cancelImport()}
            totalLines={pendingImport.totalLines}
            importedCount={pendingImport.items.length}
            skippedLines={pendingImport.skippedLines}
            onConfirm={() => confirmImport(pendingImport)}
            onCancel={cancelImport}
          />
        )}
      </div>
    </div>
  );
}