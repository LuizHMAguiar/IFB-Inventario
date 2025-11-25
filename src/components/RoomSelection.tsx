import { useState, useMemo } from "react";
import { type Database, type InventoryItem } from "../types";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { ArrowLeft, DoorOpen, Eye, Search } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";

interface RoomSelectionProps {
  database: Database;
  onSelectRoom: (room: string) => void;
  onBack: () => void;
}

export function RoomSelection({ database, onSelectRoom, onBack }: RoomSelectionProps) {
  const [selectedRoomForPreview, setSelectedRoomForPreview] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [roomSearchTerm, setRoomSearchTerm] = useState("");

  const rooms = useMemo(() => {
    const uniqueRooms = new Set(database.items.map(item => item.SALA));
    return Array.from(uniqueRooms).sort();
  }, [database]);

  const getRoomItems = (room: string): InventoryItem[] => {
    return database.items.filter(item => item.SALA === room);
  };

  const previewItems = useMemo(() => {
    if (!selectedRoomForPreview) return [];
    const items = getRoomItems(selectedRoomForPreview);
    if (!searchTerm.trim()) return items;

    return items.filter(item => 
      item.NUMERO.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.DESCRIÇÃO.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [selectedRoomForPreview, searchTerm, database.items]);

  const filteredRooms = useMemo(() => {
    if (!roomSearchTerm.trim()) {
      return rooms;
    }
    return rooms.filter(room =>
      room.toLowerCase().includes(roomSearchTerm.toLowerCase())
    );
  }, [rooms, roomSearchTerm]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <Button variant="ghost" onClick={onBack} className="gap-2 mb-4">
            <ArrowLeft className="size-4" />
            Voltar para Bases de Dados
          </Button>
          <h1 className="text-slate-900 mb-2">{database.name}</h1>
          <p className="text-slate-600">Selecione uma sala para iniciar a verificação</p>
        </div>

        <div className="mb-6">
          <Input
            placeholder="Buscar pelo nome da sala..."
            value={roomSearchTerm}
            onChange={(e) => setRoomSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRooms.map((room) => {
            const roomItems = getRoomItems(room);
            const itemCount = roomItems.length;
            const verifiedCount = roomItems.filter(
              item => item.STATUS === "Localizado" || item.STATUS === "Migrado"
            ).length;
            
            return (
              <Card key={room} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DoorOpen className="size-5 text-green-600" />
                    {room}
                  </CardTitle>
                  <CardDescription>Verificados: {verifiedCount} / {itemCount} itens</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button 
                    className="w-full"
                    onClick={() => onSelectRoom(room)}
                  >
                    Iniciar Verificação
                  </Button>
                  
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full gap-2"
                        onClick={() => {
                          setSelectedRoomForPreview(room);
                          setSearchTerm(""); // Limpa a busca ao abrir
                        }}
                      >
                        <Eye className="size-4" />
                        Ver Itens
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Itens da Sala: {room}</DialogTitle>
                        <DialogDescription>
                          Total de {itemCount} itens cadastrados
                        </DialogDescription>
                      </DialogHeader>
                      <div className="py-2">
                        <Input 
                          placeholder="Buscar por número ou descrição..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                      <ScrollArea className="h-[400px] pr-4">
                        <div className="space-y-2">
                          {previewItems.map((item) => {
                            const status = item.STATUS;
                            const isLocalizado = status === "Localizado";
                            const isMigrado = status === "Migrado";
                            
                            return (
                              <div
                                key={item.NUMERO}
                                className={`p-3 border rounded-lg hover:bg-slate-50 transition-colors ${
                                  isLocalizado ? 'bg-green-50 border-green-200' : 
                                  isMigrado ? 'bg-yellow-50 border-yellow-200' : 
                                  'bg-white'
                                }`}
                              >
                                <div className="flex gap-3">
                                  <div className={`px-3 py-1 rounded ${
                                    isLocalizado ? 'bg-green-100 text-green-700' :
                                    isMigrado ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-blue-100 text-blue-700'
                                  }`}>
                                    {item.NUMERO}
                                  </div>
                                  <div className="flex-1">
                                    <p>{item.DESCRIÇÃO}</p>
                                    {item.STATUS && (
                                      <p className={`text-sm ${
                                        isLocalizado ? 'text-green-600' :
                                        isMigrado ? 'text-yellow-600' :
                                        'text-slate-500'
                                      }`}>
                                        Status: {item.STATUS}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </ScrollArea>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {rooms.length > 0 && filteredRooms.length === 0 && (
          <div className="text-center py-12">
            <Search className="size-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">Nenhuma sala encontrada com o termo "{roomSearchTerm}"</p>
          </div>
        )}

        {rooms.length === 0 && (
          <div className="text-center py-12">
            <DoorOpen className="size-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">Nenhuma sala encontrada nesta base de dados</p>
          </div>
        )}
      </div>
    </div>
  );
}