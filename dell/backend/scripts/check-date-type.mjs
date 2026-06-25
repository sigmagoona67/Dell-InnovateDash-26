import pg from 'pg'

const pool = new pg.Pool({
  connectionString: 'postgresql://carebridge:carebridge@localhost:5432/carebridge',
})

const r = await pool.query(
  'SELECT slot_date, pg_typeof(slot_date) AS t FROM consultation_requests LIMIT 1',
)
const row = r.rows[0]
console.log('row', row, 'typeof', typeof row.slot_date, 'value', row.slot_date)
console.log('json', JSON.stringify(row))
await pool.end()
