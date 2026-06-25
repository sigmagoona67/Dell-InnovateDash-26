const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 }
const MIN_LEVEL = LEVELS[process.env.LOG_LEVEL?.toLowerCase()] ?? LEVELS.info

function write(level, service, message, fields = {}) {
  if (LEVELS[level] < MIN_LEVEL) return
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    service,
    msg: message,
    ...fields,
  })
  if (level === 'error') console.error(line)
  else if (level === 'warn') console.warn(line)
  else console.log(line)
}

export function createLogger(service) {
  return {
    debug: (msg, fields) => write('debug', service, msg, fields),
    info: (msg, fields) => write('info', service, msg, fields),
    warn: (msg, fields) => write('warn', service, msg, fields),
    error: (msg, fields) => write('error', service, msg, fields),
  }
}
