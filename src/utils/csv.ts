import { type InventoryItem } from "../types";

const REQUIRED_COLUMNS = [
  "NUMERO",
  "DESCRIÇÃO",
  "SALA",
  "ESTADO DE CONSERVAÇÃO",
  "STATUS",
  "ETIQUETADO",
  "OBSERVAÇÃO",
  "RECOMENDAÇÃO"
];

export interface CSVParseResult {
  items: InventoryItem[];
  totalLines: number;
  skippedLines: Array<{
    lineNumber: number;
    content: string;
    reason: string;
  }>;
}

// Robust CSV parser that handles quoted fields, commas inside fields, and multiline fields
const parseCSVLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // Field separator
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  // Add last field
  result.push(current.trim());
  
  return result;
};

export const parseCSV = (csvText: string): CSVParseResult => {
  // Remove BOM if present
  let normalizedText = csvText;
  if (normalizedText.charCodeAt(0) === 0xFEFF) {
    normalizedText = normalizedText.slice(1);
  }
  
  // Normalize line endings
  normalizedText = normalizedText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Count original lines for accurate reporting
  const originalLineCount = normalizedText.split('\n').length;
  
  const lines: string[] = [];
  let currentLine = '';
  let inQuotes = false;
  let lineNumber = 0;
  
  // Split by newlines, but respect quoted fields that contain newlines
  for (let i = 0; i < normalizedText.length; i++) {
    const char = normalizedText[i];
    const nextChar = normalizedText[i + 1];
    
    if (char === '"') {
      currentLine += char;
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        currentLine += nextChar;
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === '\n' && !inQuotes) {
      lineNumber++;
      // Always add line, even if empty (to maintain line number accuracy)
      lines.push(currentLine);
      currentLine = '';
    } else {
      currentLine += char;
    }
  }
  
  // Add last line
  lineNumber++;
  lines.push(currentLine);
  
  if (lines.length === 0) {
    throw new Error("Arquivo CSV vazio");
  }

  const headers = parseCSVLine(lines[0]);
  
  // Validate required columns
  const missingColumns = REQUIRED_COLUMNS.filter(col => !headers.includes(col));
  if (missingColumns.length > 0) {
    throw new Error(`Colunas obrigatórias ausentes: ${missingColumns.join(', ')}`);
  }

  const items: InventoryItem[] = [];
  const skippedLines: Array<{
    lineNumber: number;
    content: string;
    reason: string;
  }> = [];
  
  for (let i = 1; i < lines.length; i++) {
    const lineContent = lines[i];
    
    // Skip completely empty lines
    if (!lineContent.trim()) {
      if (lineContent === '') {
        // Empty line - common in CSVs, don't report as error
        continue;
      }
    }
    
    try {
      const values = parseCSVLine(lineContent);
      
      // Check if line has any data
      if (values.length === 0 || !values.some(v => v.trim())) {
        skippedLines.push({
          lineNumber: i + 1,
          content: lineContent.substring(0, 200),
          reason: 'Linha vazia ou sem dados válidos'
        });
        continue;
      }
      
      // Check if number of values matches headers
      if (values.length !== headers.length) {
        skippedLines.push({
          lineNumber: i + 1,
          content: lineContent.substring(0, 200),
          reason: `Número de colunas incorreto. Esperado: ${headers.length} colunas, Encontrado: ${values.length} colunas. Verifique vírgulas extras ou campos mal formatados.`
        });
        continue;
      }
      
      const item: any = {};
      
      // Map values to headers
      headers.forEach((header, index) => {
        item[header] = values[index] || '';
      });
      
      // Validate that NUMERO field exists and is not empty
      if (!item.NUMERO || !item.NUMERO.trim()) {
        skippedLines.push({
          lineNumber: i + 1,
          content: lineContent.substring(0, 200),
          reason: 'Campo NUMERO vazio ou ausente. Este campo é obrigatório para identificar o item.'
        });
        continue;
      }
      
      items.push(item as InventoryItem);
    } catch (error) {
      console.warn(`Erro ao processar linha ${i + 1}:`, error);
      skippedLines.push({
        lineNumber: i + 1,
        content: lineContent.substring(0, 200),
        reason: `Erro ao processar: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      });
    }
  }

  return {
    items,
    totalLines: lines.length,
    skippedLines
  };
};

const escapeCSVField = (field: any): string => {
  if (field === null || field === undefined) {
    return '';
  }
  let value = String(field);

  // Replace newlines with a space to ensure one line per item
  value = value.replace(/(\r\n|\n|\r)/gm, " ");

  // Check if the value contains characters that require quoting
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    // Escape double quotes within the value
    const escapedValue = value.replace(/"/g, '""');
    // Wrap the entire value in double quotes
    return `"${escapedValue}"`;
  }

  return value;
};

export const exportCSV = (items: InventoryItem[]): string => {
  const headers = REQUIRED_COLUMNS;
  const rows = items.map(item => headers.map(header => escapeCSVField(item[header as keyof InventoryItem])).join(','));

  return [headers.join(','), ...rows].join('\n');
};

export const downloadCSV = (csvContent: string, filename: string) => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};