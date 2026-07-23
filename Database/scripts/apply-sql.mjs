#!/usr/bin/env node
/**
 * Aplica scripts SQL de Database/ en orden.
 *
 * Uso:
 *   node Database/scripts/apply-sql.mjs --oltp
 *   node Database/scripts/apply-sql.mjs --olap
 *   node Database/scripts/apply-sql.mjs --oltp --olap
 *
 * Conexión (prioridad):
 *   1) DATABASE_URL / DATABASE_URL_OLAP
 *   2) DB_* / DB_OLAP_* (host, port, database, username, password)
 *
 * Requiere: `pg` instalado (p. ej. dependencia de Backend con NODE_PATH=Backend/node_modules)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Client } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATABASE_DIR = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(DATABASE_DIR, '..');

const OLTP_FILES = [
  'schema_oltp.sql',
  'migrations_extra/oltp_schema_delta.sql',
  'migrations_extra/configuracion_sistema.sql',
  // matricula_anual + sync_estudiantes_cursos: TypeORM (Backend migrationsRun)
];

const OLAP_FILES = [
  'schema_olap.sql',
  'migrations_extra/olap_schema_delta.sql',
];

function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadDotEnv(path.join(REPO_ROOT, '.env'));
loadDotEnv(path.join(REPO_ROOT, 'Backend', '.env'));

function parseArgs(argv) {
  const flags = new Set(argv.slice(2));
  const wantOltp = flags.has('--oltp');
  const wantOlap = flags.has('--olap');
  if (!wantOltp && !wantOlap) {
    console.error('Uso: node apply-sql.mjs --oltp | --olap | --oltp --olap');
    process.exit(1);
  }
  return { wantOltp, wantOlap };
}

function configFromParts({ host, port, database, user, password }) {
  return {
    host: host || '127.0.0.1',
    port: Number(port || 5432),
    database,
    user: user || 'academic',
    password: password || '',
  };
}

function oltpConfig() {
  if (process.env.DATABASE_URL) {
    return { connectionString: process.env.DATABASE_URL };
  }
  return configFromParts({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_DATABASE || 'academic_oltp',
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
  });
}

function olapConfig() {
  if (process.env.DATABASE_URL_OLAP) {
    return { connectionString: process.env.DATABASE_URL_OLAP };
  }
  return configFromParts({
    host: process.env.DB_OLAP_HOST || process.env.DB_HOST,
    port: process.env.DB_OLAP_PORT || process.env.DB_PORT,
    database: process.env.DB_OLAP_DATABASE || 'academic_olap',
    user: process.env.DB_OLAP_USERNAME || process.env.DB_USERNAME,
    password: process.env.DB_OLAP_PASSWORD || process.env.DB_PASSWORD,
  });
}

async function applyFiles(label, clientConfig, relativeFiles) {
  const client = new Client(clientConfig);
  console.log(`\n=== ${label} ===`);
  console.log(
    clientConfig.connectionString
      ? `Conectando vía DATABASE_URL…`
      : `Conectando a ${clientConfig.host}:${clientConfig.port}/${clientConfig.database}…`
  );

  await client.connect();
  try {
    for (let i = 0; i < relativeFiles.length; i++) {
      const rel = relativeFiles[i];
      const abs = path.join(DATABASE_DIR, rel);
      if (!fs.existsSync(abs)) {
        throw new Error(`Archivo no encontrado: ${abs}`);
      }
      const sql = fs.readFileSync(abs, 'utf8');
      console.log(`[${i + 1}/${relativeFiles.length}] ${rel}`);
      await client.query(sql);
    }
    console.log(`✓ ${label} aplicado (${relativeFiles.length} archivos)`);
  } finally {
    await client.end();
  }
}

async function main() {
  const { wantOltp, wantOlap } = parseArgs(process.argv);

  if (wantOltp) {
    await applyFiles('OLTP (academic_oltp)', oltpConfig(), OLTP_FILES);
  }
  if (wantOlap) {
    await applyFiles('OLAP (academic_olap)', olapConfig(), OLAP_FILES);
  }
}

main().catch((err) => {
  console.error('\nError aplicando SQL:');
  console.error(err.message || err);
  process.exit(1);
});
