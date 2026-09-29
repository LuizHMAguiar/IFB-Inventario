import { useState } from "react";
import { type Database } from "./types";
import { getDatabase } from "./utils/storage";
import { DatabaseManagement } from "./components/DatabaseManagement";
import { RoomSelection } from "./components/RoomSelection";
import { ItemForm } from "./components/ItemForm";
import { Toaster } from "./components/ui/sonner";
import { toast } from "sonner";

type Screen = "database" | "room" | "form";

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("database");
  const [selectedDatabase, setSelectedDatabase] = useState<Database | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<string>("");
  const [selectedItemNumber, setSelectedItemNumber] = useState<string | undefined>();

  const handleSelectDatabase = (database: Database) => {
    setSelectedDatabase(database);
    setCurrentScreen("room");
  };

  const handleSelectRoom = (room: string, itemNumero?: string) => {
    setSelectedRoom(room);
    setSelectedItemNumber(itemNumero);
    setCurrentScreen("form");
  };

  const handleBackToDatabase = () => {
    setCurrentScreen("database");
    setSelectedDatabase(null);
    setSelectedRoom("");
    setSelectedItemNumber(undefined);
  };

  const handleBackToRoom = async () => {
    if (selectedDatabase) {
      try {
        const updatedDatabase = await getDatabase(selectedDatabase.id);
        if (updatedDatabase) setSelectedDatabase(updatedDatabase);
      } catch (error) {
        toast.error(`Erro ao atualizar a base: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
      }
    }
    setCurrentScreen("room");
    setSelectedRoom("");
    setSelectedItemNumber(undefined);
  };

  return (
    <>
      {currentScreen === "database" && (
        <DatabaseManagement onSelectDatabase={handleSelectDatabase} />
      )}

      {currentScreen === "room" && selectedDatabase && (
        <RoomSelection
          database={selectedDatabase}
          onSelectRoom={handleSelectRoom}
          onBack={handleBackToDatabase}
        />
      )}

      {currentScreen === "form" && selectedDatabase && selectedRoom && (
        <ItemForm
          database={selectedDatabase}
          selectedRoom={selectedRoom}
          initialItemNumero={selectedItemNumber}
          onBack={handleBackToRoom}
        />
      )}

      <Toaster position="top-right" />
    </>
  );
}
