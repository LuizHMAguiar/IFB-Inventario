import { useState, useEffect } from "react";
import { type Database, type InventoryItem } from "../types";
import { getDatabase, updateItem } from "../utils/storage";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { ArrowLeft, Search, CheckCircle, AlertCircle } from "lucide-react";
import { VoiceCommand, type VoiceCommandResult } from "./VoiceCommand";
import { toast } from "sonner";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

interface ItemFormProps {
  database: Database;
  selectedRoom: string;
  onBack: () => void;
}

export function ItemForm({ database, selectedRoom, onBack }: ItemFormProps) {
  const [searchNumber, setSearchNumber] = useState("");
  const [currentItem, setCurrentItem] = useState<InventoryItem | null>(null);
  const [formData, setFormData] = useState<Partial<InventoryItem>>({});
  const [databaseData, setDatabaseData] = useState(database);

  useEffect(() => {
    // Reload database data when component mounts or updates
    const freshData = getDatabase(database.id);
    if (freshData) {
      setDatabaseData(freshData);
    }
  }, [database.id]);

  const searchItem = (numero: string) => {
    if (!numero.trim()) {
      toast.error("Digite um número de item");
      return;
    }

    const item = databaseData.items.find(i => i.NUMERO === numero.trim());
    
    if (!item) {
      toast.error(`Item ${numero} não encontrado na base de dados`);
      setCurrentItem(null);
      setFormData({});
      return;
    }

    setCurrentItem(item);
    
    // Determine status and etiquetado based on room match
    const isInCorrectRoom = item.SALA === selectedRoom;
    let newStatus: string;
    let newObservacao = item.OBSERVAÇÃO;
    
    if (isInCorrectRoom) {
      newStatus = "Localizado";
    } else {
      newStatus = "Migrado";
      newObservacao = `Localizado na sala ${selectedRoom}`;
    }

    const updatedFormData = {
      ...item,
      STATUS: newStatus,
      ETIQUETADO: "Sim",
      "ESTADO DE CONSERVAÇÃO": "Bom",
      OBSERVAÇÃO: newObservacao
    };

    setFormData(updatedFormData);
    
    // Update database immediately
    updateItem(database.id, numero.trim(), {
      STATUS: newStatus,
      ETIQUETADO: "Sim",
      "ESTADO DE CONSERVAÇÃO": "Bom",
      OBSERVAÇÃO: newObservacao
    });

    // Reload database to get fresh data
    const freshData = getDatabase(database.id);
    if (freshData) {
      setDatabaseData(freshData);
    }

    if (isInCorrectRoom) {
      toast.success(`Item ${numero} localizado na sala correta`);
    } else {
      toast.warning(`Item ${numero} migrado da sala ${item.SALA} para ${selectedRoom}`);
    }
  };

  const handleFieldChange = (field: keyof InventoryItem, value: string) => {
    if (!currentItem) return;

    const updatedFormData = {
      ...formData,
      [field]: value
    };

    setFormData(updatedFormData);
    
    // Update database immediately
    updateItem(database.id, currentItem.NUMERO, { [field]: value });

    // Reload database
    const freshData = getDatabase(database.id);
    if (freshData) {
      setDatabaseData(freshData);
    }
  };

  const handleVoiceCommand = (command: VoiceCommandResult) => {
    console.log("Voice command received:", command);

    // If numero detected, search for the item
    if (command.numero) {
      setSearchNumber(command.numero);
      searchItem(command.numero);
    }

    // If estado detected, update the field
    if (command.estado && currentItem) {
      handleFieldChange("ESTADO DE CONSERVAÇÃO", command.estado);
      toast.success(`Estado atualizado: ${command.estado}`);
    }

    // If observacao detected, update the field
    if (command.observacao && currentItem) {
      // Preserve migration message if exists, or replace with voice command
      const isMigrated = formData.STATUS === "Migrado";
      const observacao = isMigrated && formData.OBSERVAÇÃO?.startsWith("Localizado na sala")
        ? `${formData.OBSERVAÇÃO}. ${command.observacao}`
        : command.observacao;
      
      handleFieldChange("OBSERVAÇÃO", observacao);
      toast.success(`Observação atualizada`);
    }

    // If recomendacao detected, update the field
    if (command.recomendacao && currentItem) {
      handleFieldChange("RECOMENDAÇÃO", command.recomendacao);
      toast.success(`Recomendação atualizada`);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    searchItem(searchNumber);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Button variant="ghost" onClick={onBack} className="gap-2 mb-4">
            <ArrowLeft className="size-4" />
            Voltar para Seleção de Sala
          </Button>
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-slate-900">Verificação de Itens</h1>
            <Badge variant="outline" className="text-lg px-4 py-2">
              Sala: {selectedRoom}
            </Badge>
          </div>
          <p className="text-slate-600">Base de dados: {database.name}</p>
        </div>

        {/* Voice Command Section */}
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle>Comando de Voz</CardTitle>
            <CardDescription>
              Use comandos de voz para buscar e atualizar itens rapidamente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <VoiceCommand onCommand={handleVoiceCommand} isActive={true} />
          </CardContent>
        </Card>

        {/* Manual Search */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Busca Manual</CardTitle>
            <CardDescription>Digite o número do item para buscar</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearchSubmit} className="flex gap-2">
              <Input
                placeholder="Número do item"
                value={searchNumber}
                onChange={(e) => setSearchNumber(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" className="gap-2">
                <Search className="size-4" />
                Buscar
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Item Form */}
        {currentItem && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Item: {currentItem.NUMERO}</CardTitle>
                <div className="flex gap-2">
                  {formData.STATUS === "Localizado" ? (
                    <Badge variant="default" className="gap-1 bg-green-600">
                      <CheckCircle className="size-3" />
                      Localizado
                    </Badge>
                  ) : (
                    <Badge variant="default" className="gap-1 bg-orange-600">
                      <AlertCircle className="size-3" />
                      Migrado
                    </Badge>
                  )}
                  {formData.ETIQUETADO === "Sim" && (
                    <Badge variant="outline">Etiquetado</Badge>
                  )}
                </div>
              </div>
              <CardDescription>
                Sala Original: {currentItem.SALA}
                {currentItem.SALA !== selectedRoom && (
                  <span className="text-orange-600"> → Atual: {selectedRoom}</span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="numero">Número</Label>
                <Input
                  id="numero"
                  value={formData.NUMERO || ""}
                  disabled
                  className="bg-slate-50"
                />
              </div>

              <div>
                <Label htmlFor="descricao">Descrição</Label>
                <Input
                  id="descricao"
                  value={formData.DESCRIÇÃO || ""}
                  onChange={(e) => handleFieldChange("DESCRIÇÃO", e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="sala">Sala</Label>
                <Input
                  id="sala"
                  value={formData.SALA || ""}
                  onChange={(e) => handleFieldChange("SALA", e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="estado">Estado de Conservação</Label>
                <Select
                  value={formData["ESTADO DE CONSERVAÇÃO"] || ""}
                  onValueChange={(value) => handleFieldChange("ESTADO DE CONSERVAÇÃO", value)}
                >
                  <SelectTrigger id="estado">
                    <SelectValue placeholder="Selecione o estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Bom">Bom</SelectItem>
                    <SelectItem value="Antieconomico">Antieconomico</SelectItem>
                    <SelectItem value="Irreversível">Irreversível</SelectItem>
                    <SelectItem value="Ocioso">Ocioso</SelectItem>
                    <SelectItem value="Recuperável">Recuperável</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.STATUS || ""}
                  onValueChange={(value) => handleFieldChange("STATUS", value)}
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Localizado">Localizado</SelectItem>
                    <SelectItem value="Não Localizado">Não Localizado</SelectItem>
                    <SelectItem value="Migrado">Migrado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="etiquetado">Etiquetado</Label>
                <Select
                  value={formData.ETIQUETADO || ""}
                  onValueChange={(value) => handleFieldChange("ETIQUETADO", value)}
                >
                  <SelectTrigger id="etiquetado">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Sim">Sim</SelectItem>
                    <SelectItem value="Não">Não</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="observacao">Observação</Label>
                <Textarea
                  id="observacao"
                  value={formData.OBSERVAÇÃO || ""}
                  onChange={(e) => handleFieldChange("OBSERVAÇÃO", e.target.value)}
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="recomendacao">Recomendação</Label>
                <Textarea
                  id="recomendacao"
                  value={formData.RECOMENDAÇÃO || ""}
                  onChange={(e) => handleFieldChange("RECOMENDAÇÃO", e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {!currentItem && (
          <div className="text-center py-12">
            <Search className="size-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">Busque um item usando o número ou comando de voz</p>
          </div>
        )}
      </div>
    </div>
  );
}