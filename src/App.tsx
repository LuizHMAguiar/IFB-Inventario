import { useState } from "react";
import { type Database } from "./types";
import { DatabaseManagement } from "./components/DatabaseManagement";
import { RoomSelection } from "./components/RoomSelection";
import { ItemForm } from "./components/ItemForm";
import { Toaster } from "./components/ui/sonner";

type Screen = "database" | "room" | "form";

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("database");
  const [selectedDatabase, setSelectedDatabase] = useState<Database | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<string>("");

  const handleSelectDatabase = (database: Database) => {
    setSelectedDatabase(database);
    setCurrentScreen("room");
  };

  const handleSelectRoom = (room: string) => {
    setSelectedRoom(room);
    setCurrentScreen("form");
  };

  const handleBackToDatabase = () => {
    setCurrentScreen("database");
    setSelectedDatabase(null);
    setSelectedRoom("");
  };

  const handleBackToRoom = () => {
    setCurrentScreen("room");
    setSelectedRoom("");
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
          onBack={handleBackToRoom}
        />
      )}

      <Toaster position="top-right" />
    </>
  );
}
