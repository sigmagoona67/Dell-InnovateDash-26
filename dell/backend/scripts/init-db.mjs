import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import { DATABASE_URL } from '../lib/config.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const initPath = path.join(__dirname, '../db/init.sql')

async function main() {
  const sql = fs.readFileSync(initPath, 'utf8')
  const client = new pg.Client({ connectionString: DATABASE_URL })
  await client.connect()
  try {
    if (process.env.FORCE_DB_INIT === '1') {
      await client.query('DROP SCHEMA IF EXISTS public CASCADE')
      await client.query('CREATE SCHEMA public')
      await client.query(sql)
      console.log('[db:init] full schema reset applied')
    } else {
      const { rows } = await client.query(
        `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles' LIMIT 1`,
      )
      if (!rows.length) {
        await client.query(sql)
        console.log('[db:init] schema applied (first run)')
      } else {
        console.log('[db:init] schema exists — skipped (set FORCE_DB_INIT=1 to reset)')
      }
    }
  } finally {
    await client.end()
  }
}

main().catch((err) => {
  console.error('[db:init] failed:', err.message)
  process.exit(1)
})
