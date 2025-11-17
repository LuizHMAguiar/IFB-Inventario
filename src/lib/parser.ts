export type Parsed = {
  numero?: string;
  estado?: string;
  observacao?: string;
  status?: string;
  etiquetado?: string;
  descricao?: string;
  sala?: string;
  recomendacao?: string;
};

export function parseSpeechText(input: string): Parsed {
  const text = input.toLowerCase().replace(/[,;.:]/g,' ');
  const parsed: Parsed = {};

  // number (first long number)
  const num = text.match(/\b\d{3,}\b/);
  if (num) parsed.numero = num[0];

  // estado mapping
  const estadoMap: Record<string,string> = {
    'bom':'Bom',
    'irreversivel':'Irreversível',
    'irreversível':'Irreversível',
    'recuperavel':'Recuperável',
    'recuperável':'Recuperável',
    'ocioso':'Ocioso'
  };
  for (const k of Object.keys(estadoMap)) {
    if (text.includes(k)) { parsed.estado = estadoMap[k]; break; }
  }

  // status mapping
  const statusMap: Record<string,string> = {
    'localizado':'Localizado',
    'migrado':'Migrado',
    'nao localizado':'Não Localizado',
    'não localizado':'Não Localizado'
  };
  for (const k of Object.keys(statusMap)) {
    if (text.includes(k)) { parsed.status = statusMap[k]; break; }
  }

  // etiquetado
  if (text.includes('etiquetado') || text.includes('etiqueta')) {
    parsed.etiquetado = text.includes('não') || text.includes('nao') ? 'Não' : 'Sim';
  }

  // recommendation/observations - heuristics: look for keywords
  const obsKeywords = ['observação','observacoes','observacao','observações','obs'];
  for (const kw of obsKeywords) {
    if (text.includes(kw)) {
      parsed.observacao = text.split(kw)[1].trim();
      break;
    }
  }
  // fallback: consider trailing text after estado as observation
  if (!parsed.observacao && parsed.estado) {
    const afterEstado = text.split(parsed.estado.toLowerCase())[1];
    if (afterEstado) parsed.observacao = afterEstado.trim();
  }

  // simple recommendation detection
  if (text.includes('recomenda') || text.includes('recomend')) {
    const idx = text.indexOf('recomend');
    parsed.recomendacao = text.slice(idx).replace(/recomend(a|e|ar)?/,'').trim();
  }

  return parsed;
}
