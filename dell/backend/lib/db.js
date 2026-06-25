import pg from 'pg'
import { DATABASE_URL } from './config.js'

const { types } = pg

// Keep Postgres DATE/TIME values as plain strings (matches InsForge SDK / 16514a6 behaviour).
types.setTypeParser(1082, (value) => value)
types.setTypeParser(1083, (value) => value)
types.setTypeParser(1114, (value) => value)
types.setTypeParser(1184, (value) => value)

const { Pool } = pg

export const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 20,
})

export async function query(text, params) {
  return pool.query(text, params)
}

export async function withUserContext(userId, fn) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    if (userId) {
      await client.query(`SELECT set_config('app.current_user_id', $1, true)`, [String(userId)])
    }
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
