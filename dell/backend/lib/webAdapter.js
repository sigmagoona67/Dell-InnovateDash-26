export function expressToWebRequest(req) {
  const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`
  const init = {
    method: req.method,
    headers: req.headers,
  }
  if (req.method !== 'GET' && req.method !== 'HEAD' && req.body !== undefined) {
    init.body = JSON.stringify(req.body)
  }
  return new Request(url, init)
}

export async function sendWebResponse(res, webResponse) {
  res.status(webResponse.status)
  webResponse.headers.forEach((value, key) => {
    if (key.toLowerCase() !== 'transfer-encoding') res.setHeader(key, value)
  })
  const text = await webResponse.text()
  try {
    res.send(JSON.parse(text))
  } catch {
    res.send(text)
  }
}
