/**
 * Thin Supabase-compatible query builder over direct PostgreSQL (pg).
 * Supports the subset of the Supabase API used by the repository layer.
 */
import { Pool, PoolClient, QueryResult } from 'pg';

let _pool: Pool | null = null;

function getPool(): Pool {
  if (_pool) return _pool;
  _pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('sslmode=require') ? { rejectUnauthorized: false } : false,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
  _pool.on('error', (err) => {
    console.error('[db] pool error', { message: err.message });
  });
  return _pool;
}

// ---------- helpers ----------

function parseSelectColumns(select: string): string[] {
  return select.split(',').map((c) => c.trim()).filter(Boolean);
}

function toSnakeCase(key: string): string {
  return key.replace(/([A-Z])/g, '_$1').toLowerCase();
}

function toCamelCase(col: string): string {
  // PostgreSQL returns columns as-is (snake_case), we keep them snake_case
  // because the DB schema is already snake_case and the repo types expect snake_case.
  return col;
}

function buildWhereClause(
  wheres: { column: string; op: string; value: unknown }[],
  params: unknown[],
  offset: number
): { clause: string; params: unknown[] } {
  const clauses: string[] = [];
  const resultParams: unknown[] = [];

  for (const w of wheres) {
    const idx = params.length + resultParams.length + 1;
    switch (w.op) {
      case 'eq':
        if (w.value === null) {
          clauses.push(`"${w.column}" IS NULL`);
        } else {
          clauses.push(`"${w.column}" = $${idx}`);
          resultParams.push(w.value);
        }
        break;
      case 'in':
        // value should be an array
        const arr = w.value as unknown[];
        if (arr.length === 0) {
          clauses.push('FALSE');
        } else {
          const placeholders = arr.map((_, i) => `$${idx + i}`).join(', ');
          clauses.push(`"${w.column}" IN (${placeholders})`);
          resultParams.push(...arr);
        }
        break;
      default:
        throw new Error(`Unsupported operator: ${w.op}`);
    }
  }

  return {
    clause: clauses.length > 0 ? ` WHERE ${clauses.join(' AND ')}` : '',
    params: resultParams,
  };
}

// ---------- Supabase-compatible client ----------

interface QueryState {
  table: string;
  columns: string[];
  wheres: { column: string; op: string; value: unknown }[];
  orders: { column: string; ascending: boolean }[];
  limitCount: number | null;
  single: boolean;
  maybeSingle: boolean;
  insertData: unknown | null;
  updateData: Record<string, unknown> | null;
  isDelete: boolean;
  isRpc: boolean;
  rpcName: string;
  rpcParams: Record<string, unknown>;
  countOnly: boolean;
}

function createQueryBuilder(state: QueryState): any {
  const builder: any = {
    select(cols?: string) {
      if (cols) {
        state.columns = parseSelectColumns(cols);
      }
      return builder;
    },
    eq(column: string, value: unknown) {
      state.wheres.push({ column, op: 'eq', value });
      return builder;
    },
    in(column: string, values: unknown[]) {
      state.wheres.push({ column, op: 'in', value: values });
      return builder;
    },
    order(column: string, opts: { ascending?: boolean } = {}) {
      state.orders.push({ column, ascending: opts.ascending ?? true });
      return builder;
    },
    limit(count: number) {
      state.limitCount = count;
      return builder;
    },
    single() {
      state.single = true;
      return builder;
    },
    maybeSingle() {
      state.maybeSingle = true;
      return builder;
    },
    count(_opts?: { exact?: boolean }) {
      state.countOnly = true;
      return builder;
    },
    then(resolve: any, reject?: any) {
      return executeQuery(state).then(resolve, reject);
    },
  };
  return builder;
}

async function executeQuery(state: QueryState): Promise<{ data: any; error: any; count?: number }> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    // RPC call
    if (state.isRpc) {
      const paramKeys = Object.keys(state.rpcParams);
      const values = paramKeys.map((k) => state.rpcParams[k]);
      const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
      const sql = `SELECT * FROM ${state.rpcName}(${placeholders})`;
      const result = await client.query(sql, values);
      return { data: result.rows, error: null };
    }

    // Count query
    if (state.countOnly) {
      const baseParams: unknown[] = [];
      const { clause, params } = buildWhereClause(state.wheres, baseParams, 0);
      const sql = `SELECT COUNT(*) as count FROM ${state.table}${clause}`;
      const result = await client.query(sql, params);
      return { data: null, error: null, count: parseInt(result.rows[0]?.count ?? '0', 10) };
    }

    // INSERT
    if (state.insertData) {
      const row = state.insertData as Record<string, unknown>;
      const cols = Object.keys(row);
      const vals = Object.values(row);
      const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
      const colNames = cols.map((c) => `"${c}"`).join(', ');

      const selectCols = state.columns.length > 0 ? state.columns.join(', ') : '*';
      const sql = `INSERT INTO ${state.table} (${colNames}) VALUES (${placeholders}) RETURNING ${selectCols}`;
      const result = await client.query(sql, vals);
      return { data: result.rows[0], error: null };
    }

    // UPDATE
    if (state.updateData) {
      const setClauses: string[] = [];
      const params: unknown[] = [];
      let idx = 1;

      for (const [key, val] of Object.entries(state.updateData)) {
        if (val === undefined) continue;
        setClauses.push(`"${key}" = $${idx}`);
        params.push(val);
        idx++;
      }

      // WHERE clause
      const { clause: whereClause, params: whereParams } = buildWhereClause(state.wheres, params, idx);
      params.push(...whereParams);

      const selectCols = state.columns.length > 0 ? state.columns.join(', ') : '*';
      const sql = `UPDATE ${state.table} SET ${setClauses.join(', ')}${whereClause} RETURNING ${selectCols}`;
      const result = await client.query(sql, params);
      return { data: result.rows[0], error: null };
    }

    // DELETE
    if (state.isDelete) {
      const baseParams: unknown[] = [];
      const { clause, params } = buildWhereClause(state.wheres, baseParams, 0);
      const sql = `DELETE FROM ${state.table}${clause}`;
      await client.query(sql, params);
      return { data: null, error: null };
    }

    // SELECT
    const selectCols = state.columns.length > 0 ? state.columns.join(', ') : '*';
    const baseParams: unknown[] = [];
    const { clause: whereClause, params } = buildWhereClause(state.wheres, baseParams, 0);

    let orderClause = '';
    if (state.orders.length > 0) {
      const orderParts = state.orders.map(
        (o) => `"${o.column}" ${o.ascending ? 'ASC' : 'DESC'}`
      );
      orderClause = ` ORDER BY ${orderParts.join(', ')}`;
    }

    const limitClause = state.limitCount != null ? ` LIMIT ${state.limitCount}` : '';
    const sql = `SELECT ${selectCols} FROM ${state.table}${whereClause}${orderClause}${limitClause}`;
    const result = await client.query(sql, params);

    if (state.single) {
      if (result.rows.length === 0) {
        return { data: null, error: { message: 'Row not found', code: 'PGRST116' } };
      }
      return { data: result.rows[0], error: null };
    }

    if (state.maybeSingle) {
      return { data: result.rows[0] ?? null, error: null };
    }

    return { data: result.rows, error: null };
  } catch (err: any) {
    return { data: null, error: { message: err.message } };
  } finally {
    client.release();
  }
}

function createTableProxy(tableName: string): any {
  const state: QueryState = {
    table: tableName,
    columns: [],
    wheres: [],
    orders: [],
    limitCount: null,
    single: false,
    maybeSingle: false,
    insertData: null,
    updateData: null,
    isDelete: false,
    isRpc: false,
    rpcName: '',
    rpcParams: {},
    countOnly: false,
  };

  const builder: any = {
    select(cols?: string) {
      if (cols) {
        state.columns = parseSelectColumns(cols);
      }
      return builder;
    },
    eq(column: string, value: unknown) {
      state.wheres.push({ column, op: 'eq', value });
      return builder;
    },
    in(column: string, values: unknown[]) {
      state.wheres.push({ column, op: 'in', value: values });
      return builder;
    },
    order(column: string, opts: { ascending?: boolean } = {}) {
      state.orders.push({ column, ascending: opts.ascending ?? true });
      return builder;
    },
    limit(count: number) {
      state.limitCount = count;
      return builder;
    },
    single() {
      state.single = true;
      return builder;
    },
    maybeSingle() {
      state.maybeSingle = true;
      return builder;
    },
    count(_opts?: { exact?: boolean }) {
      state.countOnly = true;
      return builder;
    },
    insert(data: unknown) {
      state.insertData = data;
      return builder;
    },
    update(data: Record<string, unknown>) {
      state.updateData = data;
      return builder;
    },
    delete() {
      state.isDelete = true;
      return builder;
    },
    then(resolve: any, reject?: any) {
      return executeQuery(state).then(resolve, reject);
    },
  };

  return builder;
}

export function createSupabaseCompat(): any {
  const tables: Record<string, any> = {};

  return new Proxy(
    {},
    {
      get(_target, prop: string) {
        // .rpc() support
        if (prop === 'rpc') {
          return (name: string, params: Record<string, unknown> = {}) => {
            const state: QueryState = {
              table: '',
              columns: [],
              wheres: [],
              orders: [],
              limitCount: null,
              single: false,
              maybeSingle: false,
              insertData: null,
              updateData: null,
              isDelete: false,
              isRpc: true,
              rpcName: name,
              rpcParams: params,
              countOnly: false,
            };
            return createQueryBuilder(state);
          };
        }

        // .from('table') support
        if (prop === 'from') {
          return (tableName: string) => {
            if (!tables[tableName]) {
              tables[tableName] = createTableProxy(tableName);
            }
            return tables[tableName];
          };
        }

        return undefined;
      },
    }
  );
}
