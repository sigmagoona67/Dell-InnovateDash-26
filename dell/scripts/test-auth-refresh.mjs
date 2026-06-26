const baseUrl = 'https://qav4stmn.ap-southeast.insforge.app'
const anonKey = 'ik_eca49935960b257132d2d3e3c586405e'

async function test() {
  for (const body of [{ refresh_token: 'fake' }, { refreshToken: 'fake' }]) {
    const res = await fetch(`${baseUrl}/api/auth/refresh?client_type=mobile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
      body: JSON.stringify(body),
    })
    const text = await res.text()
    console.log('refresh body', JSON.stringify(body), '->', res.status, text.slice(0, 300))
  }
}

test().catch((error) => {
  console.error(error)
  process.exit(1)
})
