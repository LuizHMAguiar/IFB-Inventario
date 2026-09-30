import { createServer } from "node:http";
import { existsSync } from "node:fs";
import pg from "pg";

if (typeof process.loadEnvFile === "function" && existsSync(".env")) {
  process.loadEnvFile(".env");
}

const { Pool } = pg;
const requiredEnvironment = [
  "VITE_SUPABASE_DB_HOST",
  "VITE_SUPABASE_DB_NAME",
  "VITE_SUPABASE_DB_USER",
  "VITE_SUPABASE_DB_PASSWORD",
];
const missingEnvironment = requiredEnvironment.filter((name) => !process.env[name]);
if (missingEnvironment.length > 0) {
  throw new Error(`Variáveis do Supabase ausentes: ${missingEnvironment.join(", ")}`);
}

const pool = new Pool({
  ...(process.env.VITE_SUPABASE_DB_URL
    ? { connectionString: process.env.VITE_SUPABASE_DB_URL }
    : {
        host: process.env.VITE_SUPABASE_DB_HOST,
        port: Number(process.env.VITE_SUPABASE_DB_PORT || 5432),
        database: process.env.VITE_SUPABASE_DB_NAME,
        user: process.env.VITE_SUPABASE_DB_USER,
        password: process.env.VITE_SUPABASE_DB_PASSWORD,
      }),
  ssl: process.env.VITE_SUPABASE_DB_SSL !== "false" ? { rejectUnauthorized: false } : false,
  max: Number(process.env.VITE_SUPABASE_DB_POOL_SIZE || 10),
});

await pool.query(`
  CREATE TABLE IF NOT EXISTS inventory_databases (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
  )
`);
await pool.query(`
  CREATE TABLE IF NOT EXISTS inventory_items (
    database_id TEXT NOT NULL,
    item_numero TEXT NOT NULL,
    item_data JSONB NOT NULL,
    PRIMARY KEY (database_id, item_numero),
    FOREIGN KEY (database_id) REFERENCES inventory_databases(id) ON DELETE CASCADE
  )
`);

async function loadDatabase(id, client = pool) {
  const savedDatabase = await client.query(
    "SELECT id, name, created_at AS \"createdAt\" FROM inventory_databases WHERE id = $1",
    [id],
  );
  if (savedDatabase.rowCount === 0) return null;

  const items = await client.query(
    "SELECT item_data AS \"itemData\" FROM inventory_items WHERE database_id = $1 ORDER BY item_numero",
    [id],
  );
  return { ...savedDatabase.rows[0], items: items.rows.map(({ itemData }) => itemData) };
}

async function readBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 50 * 1024 * 1024) {
      throw Object.assign(new Error("Requisição excede 50 MB"), { status: 413 });
    }
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw Object.assign(new Error("JSON inválido"), { status: 400 });
  }
}

function respond(response, status, data) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(data === undefined ? "" : JSON.stringify(data));
}

async function handleRequest(request, response) {
  const path = new URL(request.url, "http://localhost").pathname;

  if (request.method === "GET" && path === "/api/health") {
    await pool.query("SELECT 1");
    respond(response, 200, { status: "ok", database: process.env.VITE_SUPABASE_DB_NAME });
    return;
  }

  if (request.method === "GET" && path === "/api/databases") {
    const result = await pool.query("SELECT id FROM inventory_databases ORDER BY created_at DESC");
    const databases = await Promise.all(result.rows.map(({ id }) => loadDatabase(id)));
    respond(response, 200, databases.filter(Boolean));
    return;
  }

  const itemMatch = path.match(/^\/api\/databases\/([^/]+)\/items\/([^/]+)$/);
  if (request.method === "PATCH" && itemMatch) {
    const databaseId = decodeURIComponent(itemMatch[1]);
    const itemNumero = decodeURIComponent(itemMatch[2]);
    const updates = await readBody(request);
    if (!updates || typeof updates !== "object" || Array.isArray(updates)) {
      respond(response, 400, { error: "Alterações inválidas" });
      return;
    }

    const result = await pool.query(
      "SELECT item_data AS \"itemData\" FROM inventory_items WHERE database_id = $1 AND item_numero = $2",
      [databaseId, itemNumero],
    );
    if (result.rowCount === 0) {
      respond(response, 404, { error: "Item não encontrado" });
      return;
    }

    const item = { ...result.rows[0].itemData, ...updates };
    await pool.query(
      "UPDATE inventory_items SET item_data = $1::jsonb WHERE database_id = $2 AND item_numero = $3",
      [JSON.stringify(item), databaseId, itemNumero],
    );
    respond(response, 204);
    return;
  }

  const databaseMatch = path.match(/^\/api\/databases\/([^/]+)$/);
  if (!databaseMatch) {
    respond(response, 404, { error: "Rota não encontrada" });
    return;
  }
  const id = decodeURIComponent(databaseMatch[1]);

  if (request.method === "GET") {
    respond(response, 200, await loadDatabase(id));
    return;
  }

  if (request.method === "PUT") {
    const savedDatabase = await readBody(request);
    if (
      !savedDatabase || savedDatabase.id !== id || typeof savedDatabase.name !== "string" ||
      typeof savedDatabase.createdAt !== "string" || !Array.isArray(savedDatabase.items)
    ) {
      respond(response, 400, { error: "Base de dados inválida" });
      return;
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `INSERT INTO inventory_databases (id, name, created_at) VALUES ($1, $2, $3)
         ON CONFLICT(id) DO UPDATE SET name = EXCLUDED.name, created_at = EXCLUDED.created_at`,
        [id, savedDatabase.name, savedDatabase.createdAt],
      );
      await client.query("DELETE FROM inventory_items WHERE database_id = $1", [id]);
      for (const item of savedDatabase.items) {
        if (!item || typeof item.NUMERO !== "string") {
          throw Object.assign(new Error("Cada item precisa ter um NUMERO em texto"), { status: 400 });
        }
        await client.query(
          "INSERT INTO inventory_items (database_id, item_numero, item_data) VALUES ($1, $2, $3::jsonb)",
          [id, item.NUMERO, JSON.stringify(item)],
        );
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    respond(response, 204);
    return;
  }

  if (request.method === "DELETE") {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("DELETE FROM inventory_items WHERE database_id = $1", [id]);
      await client.query("DELETE FROM inventory_databases WHERE id = $1", [id]);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    respond(response, 204);
    return;
  }
  respond(response, 405, { error: "Método não permitido" });
}

const server = createServer((request, response) => {
  void handleRequest(request, response).catch((error) => {
    console.error("[api]", error);
    if (!response.headersSent) {
      respond(response, error.status || 500, {
        error: error.status ? error.message : "Erro interno do servidor",
      });
    } else {
      response.destroy();
    }
  });
});

const port = Number(process.env.VITE_API_PORT || 3001);
const listenResult = await new Promise((resolve) => {
  server.once("error", (error) => resolve({ error }));
  server.listen(port, "127.0.0.1", () => resolve({ started: true }));
});

if (listenResult.error) {
  if (listenResult.error.code !== "EADDRINUSE") throw listenResult.error;

  let existingApi;
  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/health`);
    existingApi = response.ok ? await response.json() : null;
  } catch {
    existingApi = null;
  }

  if (existingApi?.status !== "ok" || existingApi.database !== process.env.VITE_SUPABASE_DB_NAME) {
    console.error(`[api] A porta ${port} já está em uso por outro serviço.`);
    process.exit(1);
  }

  console.log(`[api] Reutilizando a API ativa na porta ${port}`);
  await new Promise((resolveExit) => {
    const keepAlive = setInterval(() => {}, 60_000);
    const shutdown = () => {
      clearInterval(keepAlive);
      server.close();
      void pool.end().finally(resolveExit);
    };
    process.once("SIGINT", shutdown);
    process.once("SIGTERM", shutdown);
  });
} else {
  console.log(`API Supabase disponível em http://127.0.0.1:${port}`);
}
