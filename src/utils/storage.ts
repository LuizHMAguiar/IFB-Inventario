import { type Database, type InventoryItem } from "../types";

const API_URL = "/api/databases";

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const result = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(result?.error || `Erro HTTP ${response.status}`);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const getAllDatabases = (): Promise<Database[]> => {
  return migrateLegacyDatabases().then(() => request<Database[]>(API_URL));
};

async function migrateLegacyDatabases(): Promise<void> {
  const legacy = localStorage.getItem("inventory_databases");
  if (!legacy) return;

  const databases = JSON.parse(legacy) as Database[];
  if (!Array.isArray(databases)) throw new Error("Dados antigos do inventário estão em formato inválido");

  const existing = await request<Database[]>(API_URL);
  const existingIds = new Set(existing.map((database) => database.id));
  for (const database of databases) {
    if (!existingIds.has(database.id)) await saveDatabase(database);
  }
  localStorage.removeItem("inventory_databases");
}

export const saveDatabase = (database: Database): Promise<void> => {
  return request<void>(`${API_URL}/${encodeURIComponent(database.id)}`, {
    method: "PUT",
    body: JSON.stringify(database),
  });
};

export const deleteDatabase = (id: string): Promise<void> => {
  return request<void>(`${API_URL}/${encodeURIComponent(id)}`, { method: "DELETE" });
};

export const getDatabase = (id: string): Promise<Database | null> => {
  return request<Database | null>(`${API_URL}/${encodeURIComponent(id)}`);
};

export const updateItem = (
  databaseId: string,
  itemNumero: string,
  updates: Partial<InventoryItem>,
): Promise<void> => {
  return request<void>(
    `${API_URL}/${encodeURIComponent(databaseId)}/items/${encodeURIComponent(itemNumero)}`,
    { method: "PATCH", body: JSON.stringify(updates) },
  );
};
