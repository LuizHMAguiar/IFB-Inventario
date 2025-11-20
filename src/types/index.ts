export interface InventoryItem {
  NUMERO: string;
  DESCRIÇÃO: string;
  SALA: string;
  "ESTADO DE CONSERVAÇÃO": string;
  STATUS: string;
  ETIQUETADO: string;
  OBSERVAÇÃO: string;
  RECOMENDAÇÃO: string;
}

export interface Database {
  id: string;
  name: string;
  items: InventoryItem[];
  createdAt: string;
}
