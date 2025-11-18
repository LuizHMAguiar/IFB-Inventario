/**
 * Busca um item pelo número dentro das bases salvas no LocalStorage.
 * * @param dbId - O ID da base de dados específica (ex: '1763472622853') ou null para buscar em todas.
 * @param numeroSearch - O número do item a ser buscado.
 */
export function findItemByNumero(dbId: string | null, numeroSearch: string): any | null {
  if (!numeroSearch) return null;

  // 1. Carregar SEMPRE a lista principal de bases
  const STORAGE_KEY = 'ifb_saved_bases';
  let allBases: any[] = [];

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      allBases = JSON.parse(raw);
    }
  } catch (e) {
    console.error(`[findItem] Erro ao ler localStorage chave '${STORAGE_KEY}':`, e);
    return null;
  }

  if (!allBases || allBases.length === 0) {
    console.warn("[findItem] Nenhuma base encontrada em 'ifb_saved_bases'.");
    return null;
  }

  // 2. Filtrar as bases: Se um dbId foi passado, usamos apenas a base correspondente.
  // Caso contrário, usamos todas as bases disponíveis.
  let targetBases = allBases;
  
  if (dbId) {
    // Aqui corrigimos o erro: buscamos o objeto cujo .id é igual ao parâmetro recebido
    const specificBase = allBases.find(b => b.id === dbId);
    if (specificBase) {
      targetBases = [specificBase];
      console.log(`[findItem] Base selecionada: ${specificBase.name} (ID: ${dbId})`);
    } else {
      console.warn(`[findItem] Base com ID '${dbId}' não encontrada. Buscando em todas as bases.`);
    }
  }

  const target = String(numeroSearch).trim().toLowerCase();

  // 3. Iterar sobre as bases selecionadas e buscar o item
  for (const base of targetBases) {
    if (base?.json?.rows && Array.isArray(base.json.rows)) {
      const rows = base.json.rows;
      
      const found = rows.find((row: any) => {
        // Verifica chaves comuns (NUMERO, ID, etc)
        const val = row.NUMERO || row.Numero || row.numero || row.id || row.ID || '';
        return String(val).trim().toLowerCase() === target;
      });

      if (found) {
        console.log(`[findItem] ✅ Item encontrado na base "${base.name}":`, found);
        return found;
      }
    }
  }

  console.log(`[findItem] ❌ Item ${target} não localizado.`);
  return null;
}