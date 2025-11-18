const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
app.use(express.json({ limit: '50mb' }));
// Simple CORS middleware to allow requests from the dev server
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.post('/save-db', (req, res) => {
  const { name, b64 } = req.body;
  if (!name || !b64) return res.status(400).send('missing name or b64');
  const outDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const fname = path.join(outDir, path.basename(name));
  const buf = Buffer.from(b64, 'base64');
  fs.writeFileSync(fname, buf);
  console.log('Saved', fname);
  res.json({ ok: true, path: fname });
});

// Import a published Google Sheet CSV (sheetUrl) and save as .db in data/
app.post('/import-sheet', async (req, res) => {
  const { sheetUrl, name } = req.body;
  if (!sheetUrl || !name) return res.status(400).send('missing sheetUrl or name');
  try {
    const fetchRes = await fetch(sheetUrl);
    if (!fetchRes.ok) return res.status(400).send('failed to download CSV: ' + fetchRes.statusText);
    const text = await fetchRes.text();
    const Papa = require('papaparse');
    const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
    const rows = parsed.data;
    const fields = parsed.meta.fields || Object.keys(rows[0] || {});

    const sqlite3 = require('sqlite3').verbose();
    const outDir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const fname = path.join(outDir, path.basename(name));
    // remove existing file
    if (fs.existsSync(fname)) fs.unlinkSync(fname);
    const db = new sqlite3.Database(fname);
    const colsDef = fields.map(f => `"[${f}]" TEXT`).join(',');
    await new Promise((resolve, reject) => {
      db.serialize(() => {
        db.run(`CREATE TABLE itens (${colsDef});`);
        const placeholders = fields.map(()=>'?').join(',');
        const insertSQL = `INSERT INTO itens (${fields.map((f)=>`"[${f}]"`).join(',')}) VALUES (${placeholders});`;
        const stmt = db.prepare(insertSQL);
        for (const r of rows) {
          const vals = fields.map(f => (r[f] ?? '').toString());
          stmt.run(vals);
        }
        stmt.finalize(err => err ? reject(err) : resolve(undefined));
      });
    });
    db.close();
    console.log('Imported CSV to', fname);
    res.json({ ok: true, path: fname });
  } catch (err) {
    console.error(err);
    res.status(500).send(err.message || String(err));
  }
});

// Import from CSV text provided by client and save as .db in data/
app.post('/import-csv', async (req, res) => {
  const { csvText, name } = req.body;
  if (!csvText || !name) return res.status(400).send('missing csvText or name');
  try {
    const Papa = require('papaparse');
    const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
    const rows = parsed.data;
    const fields = parsed.meta.fields || Object.keys(rows[0] || {});

    const sqlite3 = require('sqlite3').verbose();
    const outDir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const fname = path.join(outDir, path.basename(name));
    if (fs.existsSync(fname)) fs.unlinkSync(fname);
    const db = new sqlite3.Database(fname);
    const colsDef = fields.map(f => `"[${f}]" TEXT`).join(',');
    await new Promise((resolve, reject) => {
      db.serialize(() => {
        db.run(`CREATE TABLE itens (${colsDef});`);
        const placeholders = fields.map(()=>'?').join(',');
        const insertSQL = `INSERT INTO itens (${fields.map((f)=>`"[${f}]"`).join(',')}) VALUES (${placeholders});`;
        const stmt = db.prepare(insertSQL);
        for (const r of rows) {
          const vals = fields.map(f => (r[f] ?? '').toString());
          stmt.run(vals);
        }
        stmt.finalize(err => err ? reject(err) : resolve(undefined));
      });
    });
    db.close();
    console.log('Imported CSV text to', fname);
    res.json({ ok: true, path: fname });
  } catch (err) {
    console.error(err);
    res.status(500).send(err.message || String(err));
  }
});

const port = process.env.PORT || 3001;
app.listen(port, () => console.log('save-db-server listening on', port));
