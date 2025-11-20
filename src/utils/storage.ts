import { type Database, type InventoryItem } from "../types";

const STORAGE_KEY = 'inventory_databases';

export const getAllDatabases = (): Database[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
};

export const saveDatabase = (database: Database): void => {
  const databases = getAllDatabases();
  const index = databases.findIndex(db => db.id === database.id);
  
  if (index >= 0) {
    databases[index] = database;
  } else {
    databases.push(database);
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(databases));
};

export const deleteDatabase = (id: string): void => {
  const databases = getAllDatabases().filter(db => db.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(databases));
};

export const getDatabase = (id: string): Database | null => {
  const databases = getAllDatabases();
  return databases.find(db => db.id === id) || null;
};

export const updateItem = (databaseId: string, itemNumero: string, updates: Partial<InventoryItem>): void => {
  const database = getDatabase(databaseId);
  if (!database) return;
  
  const itemIndex = database.items.findIndex(item => item.NUMERO === itemNumero);
  if (itemIndex >= 0) {
    database.items[itemIndex] = {
      ...database.items[itemIndex],
      ...updates
    };
    saveDatabase(database);
  }
};
