import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import pg from 'pg';

function isReadStatement(sql) {
  return /^\s*(SELECT|WITH|PRAGMA|EXPLAIN)/i.test(sql) || /\bRETURNING\b/i.test(sql);
}

function normalizeSqlForPostgres(sql) {
  let position = 0;
  return sql.replace(/\?/g, () => `$${++position}`);
}

class SqliteAdapter {
  constructor(filename) {
    if (filename !== ':memory:') mkdirSync(dirname(filename), { recursive: true });
    this.driver = new DatabaseSync(filename);
    this.kind = 'sqlite';
    this.driver.exec('PRAGMA foreign_keys = ON;');
    this.driver.exec('PRAGMA journal_mode = WAL;');
    this.driver.exec('PRAGMA busy_timeout = 5000;');
  }

  async query(sql, params = []) {
    const statement = this.driver.prepare(sql);
    if (isReadStatement(sql)) {
      const rows = statement.all(...params);
      return { rows, rowCount: rows.length };
    }
    const result = statement.run(...params);
    return {
      rows: [],
      rowCount: Number(result.changes || 0),
      lastInsertId: result.lastInsertRowid ? String(result.lastInsertRowid) : undefined,
    };
  }

  async exec(sql) {
    this.driver.exec(sql);
  }

  async transaction(work) {
    this.driver.exec('BEGIN IMMEDIATE;');
    try {
      const result = await work(this);
      this.driver.exec('COMMIT;');
      return result;
    } catch (error) {
      this.driver.exec('ROLLBACK;');
      throw error;
    }
  }

  async close() {
    this.driver.close();
  }
}

class PostgresAdapter {
  constructor(connectionString) {
    this.pool = new pg.Pool({ connectionString, max: 12, idleTimeoutMillis: 30_000 });
    this.kind = 'postgres';
  }

  async query(sql, params = []) {
    const result = await this.pool.query(normalizeSqlForPostgres(sql), params);
    return { rows: result.rows, rowCount: result.rowCount || 0 };
  }

  async exec(sql) {
    await this.pool.query(sql);
  }

  async transaction(work) {
    const client = await this.pool.connect();
    const transaction = {
      kind: 'postgres',
      query: async (sql, params = []) => {
        const result = await client.query(normalizeSqlForPostgres(sql), params);
        return { rows: result.rows, rowCount: result.rowCount || 0 };
      },
      exec: async (sql) => client.query(sql),
    };
    try {
      await client.query('BEGIN');
      const result = await work(transaction);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async close() {
    await this.pool.end();
  }
}

export async function createDatabase(config) {
  if (config.databaseUrl.startsWith('postgres://') || config.databaseUrl.startsWith('postgresql://')) {
    const database = new PostgresAdapter(config.databaseUrl);
    await database.query('SELECT 1');
    return database;
  }

  const filename = config.databaseUrl.startsWith('sqlite:')
    ? config.databaseUrl.slice('sqlite:'.length)
    : config.databaseUrl;
  return new SqliteAdapter(filename || config.sqlitePath);
}

export async function applyMigrations(database, migrationsDirectory) {
  await database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);
  const applied = new Set((await database.query('SELECT id FROM schema_migrations')).rows.map((row) => row.id));
  const migrationIds = ['001_platform.sql'];

  for (const id of migrationIds) {
    if (applied.has(id)) continue;
    const migration = readFileSync(join(migrationsDirectory, id), 'utf8');
    await database.exec(migration);
    await database.query('INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)', [id, new Date().toISOString()]);
  }
}
