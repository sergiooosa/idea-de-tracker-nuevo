// Runner de migraciones determinista para el deploy del dashboard (AUT-576).
//
// Aplica los archivos migrations/*.sql contra la BD de prod ANTES de levantar
// el server (ver docker-entrypoint.sh). Resuelve el incidente silencioso de
// AUT-544/AUT-575: un cambio de schema mergeado a main quedaba sin aplicar en
// prod porque el contenedor solo corría `node server.js`.
//
// Diseño:
//  - Usa `pg` directo (disponible en runtime; drizzle-kit es devDependency y NO
//    está en la imagen standalone de Next).
//  - Tabla de tracking `_dashboard_migrations` → cada archivo se aplica 1 sola vez.
//  - Baseline en primera ejecución: si la tabla de tracking aún no existe, asume
//    que la BD prod YA refleja todas las migraciones actuales (se aplicaron a
//    mano) y las registra SIN ejecutarlas. Así no se re-corren UPDATEs de datos
//    (p.ej. add_embed_domain) sobre prod. A partir de ahí, toda migración NUEVA
//    se aplica automáticamente. Forzar ejecución total con MIGRATIONS_FRESH=true.
//  - CONCURRENTLY: los archivos con CREATE INDEX CONCURRENTLY se ejecutan
//    statement-por-statement en autocommit (no pueden correr en transacción).
//    El resto de archivos corre atómico (BEGIN/COMMIT por archivo).
//  - Credencial: usa MIGRATIONS_DATABASE_URL si existe (rol con permisos DDL),
//    si no DATABASE_URL. El usuario debe poder CREATE/ALTER en el schema public.
//  - Fail-fast: si una migración falla, sale con código !=0 → el deploy de
//    Coolify queda marcado como fallido y NO se promueve la imagen (la versión
//    anterior sigue sirviendo). Override de emergencia: MIGRATIONS_FAILFAST=false.

import pg from "pg";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const { Client } = pg;
const HERE = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(HERE, "..", "migrations");
const TABLE = "_dashboard_migrations";

const log = (...a) => console.log("[migrate]", ...a);
const errlog = (...a) => console.error("[migrate]", ...a);

const connectionString =
  process.env.MIGRATIONS_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  errlog("ERROR: ni MIGRATIONS_DATABASE_URL ni DATABASE_URL definidos.");
  process.exit(1);
}

if (!existsSync(MIGRATIONS_DIR)) {
  log(`directorio ${MIGRATIONS_DIR} no existe — nada que aplicar.`);
  process.exit(0);
}

// Divide un archivo en statements para ejecución en autocommit (solo para
// archivos CONCURRENTLY). Asume SQL simple sin dollar-quoting ni funciones.
function splitStatements(sql) {
  return sql
    .split(/;\s*(?:\r?\n|$)/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !/^(--[^\n]*\s*)+$/.test(s));
}

async function main() {
  const client = new Client({
    connectionString,
    ssl:
      process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : false,
  });
  await client.connect();
  try {
    const reg = await client.query(
      "SELECT to_regclass($1) IS NOT NULL AS exists",
      [`public.${TABLE}`],
    );
    const freshTracking = !reg.rows[0].exists;

    await client.query(
      `CREATE TABLE IF NOT EXISTS public.${TABLE} (
         filename   text PRIMARY KEY,
         applied_at timestamptz NOT NULL DEFAULT now()
       )`,
    );

    const files = readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    if (freshTracking && process.env.MIGRATIONS_FRESH !== "true") {
      log(
        `tracking nuevo → baseline de ${files.length} migracion(es) existente(s) ` +
          "(se registran como aplicadas, no se ejecutan).",
      );
      for (const f of files) {
        await client.query(
          `INSERT INTO public.${TABLE} (filename) VALUES ($1) ON CONFLICT DO NOTHING`,
          [f],
        );
      }
      log(
        "baseline completado. Las migraciones futuras se aplicarán automáticamente en cada deploy.",
      );
      return;
    }

    const appliedRows = await client.query(
      `SELECT filename FROM public.${TABLE}`,
    );
    const applied = new Set(appliedRows.rows.map((r) => r.filename));
    const pending = files.filter((f) => !applied.has(f));

    if (pending.length === 0) {
      log("sin migraciones pendientes.");
      return;
    }
    log(`${pending.length} migracion(es) pendiente(s): ${pending.join(", ")}`);

    for (const f of pending) {
      const sql = readFileSync(join(MIGRATIONS_DIR, f), "utf8");
      const concurrent = /\bCONCURRENTLY\b/i.test(sql);
      log(`aplicando ${f}${concurrent ? " (CONCURRENTLY, sin transacción)" : ""}`);
      try {
        if (concurrent) {
          for (const stmt of splitStatements(sql)) {
            await client.query(stmt);
          }
        } else {
          await client.query("BEGIN");
          await client.query(sql);
          await client.query("COMMIT");
        }
        await client.query(
          `INSERT INTO public.${TABLE} (filename) VALUES ($1) ON CONFLICT DO NOTHING`,
          [f],
        );
        log(`✓ ${f}`);
      } catch (e) {
        if (!concurrent) {
          try {
            await client.query("ROLLBACK");
          } catch {
            /* noop */
          }
        }
        throw new Error(`fallo aplicando ${f}: ${e.message}`);
      }
    }
    log("migraciones completadas.");
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  errlog(`ERROR: ${e.message}`);
  if (process.env.MIGRATIONS_FAILFAST === "false") {
    errlog(
      "MIGRATIONS_FAILFAST=false → se continúa pese al error (el server arrancará igual).",
    );
    process.exit(0);
  }
  process.exit(1);
});
