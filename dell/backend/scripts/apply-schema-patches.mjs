import pg from 'pg'
import { DATABASE_URL } from '../lib/config.js'

const PATCHES = [
  `ALTER TABLE public.staff_questionnaire
     ADD COLUMN IF NOT EXISTS interests JSONB NOT NULL DEFAULT '[]'::jsonb`,
]

async function main() {
  const client = new pg.Client({ connectionString: DATABASE_URL })
  await client.connect()
  try {
    for (const sql of PATCHES) {
      await client.query(sql)
    }
    console.log('[db:patch] schema patches applied')
  } finally {
    await client.end()
  }
}

main().catch((err) => {
  console.error('[db:patch] failed:', err.message)
  process.exit(1)
})
