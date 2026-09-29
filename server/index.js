import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import initSqlJs from "sql.js";

if (existsSync(".env")) process.loadEnvFile(".env");

const databaseFile = resolve(process.env.DB_FILE || "data/ifb-inventario.sqlite");
mkdirSync(dirname(databaseFile), { recursive: true });

const SQL = await initSqlJs();
const database = new SQL.Database(
  existsSync(databaseFile) ? new Uint8Array(readFileSync(databaseFile)) : undefined,
);
database.run("PRAGMA foreign_keys = ON");
database.run(`
  CREATE TABLE IF NOT EXISTS inventory_databases (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL
  )
`);
database.run(`
  CREATE TABLE IF NOT EXISTS inventory_items (
    database_id TEXT NOT NULL,
    item_numero TEXT NOT NULL,
    item_data TEXT NOT NULL,
    PRIMARY KEY (database_id, item_numero),
    FOREIGN KEY (database_id) REFERENCES inventory_databases(id) ON DELETE CASCADE
  )
`);

function persistDatabase() {
  const temporaryFile = `${databaseFile}.tmp`;
  writeFileSync(temporaryFile, Buffer.from(database.export()));
  renameSync(temporaryFile, databaseFile);
}

function queryRows(sql, parameters = []) {
  const statement = database.prepare(sql);
  try {
    statement.bind(parameters);
    const rows = [];
    while (statement.step()) rows.push(statement.getAsObject());
    return rows;
  } finally {
    statement.free();
  }
}

function queryOne(sql, parameters = []) {
  return queryRows(sql, parameters)[0] || null;
}

function loadDatabase(id) {
  const savedDatabase = queryOne(
    "SELECT id, name, created_at AS createdAt FROM inventory_databases WHERE id = ?",
    [id],
  );
  if (!savedDatabase) return null;

  const items = queryRows(
    "SELECT item_data AS itemData FROM inventory_items WHERE database_id = ? ORDER BY rowid",
    [id],
  ).map(({ itemData }) => JSON.parse(itemData));
  return { ...savedDatabase, items };
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
    respond(response, 200, { status: "ok", databaseFile });
    return;
  }

  if (request.method === "GET" && path === "/api/databases") {
    const rows = queryRows("SELECT id FROM inventory_databases ORDER BY created_at DESC");
    respond(response, 200, rows.map(({ id }) => loadDatabase(id)).filter(Boolean));
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

    const row = queryOne(
      "SELECT item_data AS itemData FROM inventory_items WHERE database_id = ? AND item_numero = ?",
      [databaseId, itemNumero],
    );
    if (!row) {
      respond(response, 404, { error: "Item não encontrado" });
      return;
    }

    const item = { ...JSON.parse(row.itemData), ...updates };
    database.run(
      "UPDATE inventory_items SET item_data = ? WHERE database_id = ? AND item_numero = ?",
      [JSON.stringify(item), databaseId, itemNumero],
    );
    persistDatabase();
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
    respond(response, 200, loadDatabase(id));
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

    database.run("BEGIN TRANSACTION");
    try {
      database.run(
        `INSERT INTO inventory_databases (id, name, created_at) VALUES (?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET name = excluded.name, created_at = excluded.created_at`,
        [id, savedDatabase.name, savedDatabase.createdAt],
      );
      database.run("DELETE FROM inventory_items WHERE database_id = ?", [id]);
      for (const item of savedDatabase.items) {
        if (!item || typeof item.NUMERO !== "string") {
          throw Object.assign(new Error("Cada item precisa ter um NUMERO em texto"), { status: 400 });
        }
        database.run(
          "INSERT INTO inventory_items (database_id, item_numero, item_data) VALUES (?, ?, ?)",
          [id, item.NUMERO, JSON.stringify(item)],
        );
      }
      database.run("COMMIT");
      persistDatabase();
    } catch (error) {
      database.run("ROLLBACK");
      throw error;
    }
    respond(response, 204);
    return;
  }

  if (request.method === "DELETE") {
    database.run("DELETE FROM inventory_databases WHERE id = ?", [id]);
    persistDatabase();
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

const port = Number(process.env.API_PORT || 3001);
persistDatabase();
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

  if (existingApi?.status !== "ok" || resolve(existingApi.databaseFile) !== databaseFile) {
    console.error(`[api] A porta ${port} já está em uso por outro serviço.`);
    process.exit(1);
  }

  console.log(`[api] Reutilizando a API ativa na porta ${port} e o banco ${databaseFile}`);
  await new Promise((resolveExit) => {
    const keepAlive = setInterval(() => {}, 60_000);
    const stop = () => resolveExit();
    const shutdown = () => {
      clearInterval(keepAlive);
      process.off("SIGINT", shutdown);
      process.off("SIGTERM", shutdown);
      stop();
    };
    process.once("SIGINT", shutdown);
    process.once("SIGTERM", shutdown);
  });
} else {
  console.log(`API SQLite disponível em http://127.0.0.1:${port}`);
  console.log(`Arquivo de banco local: ${databaseFile}`);
}