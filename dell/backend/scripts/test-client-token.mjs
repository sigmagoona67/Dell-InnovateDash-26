import { createClient } from '../lib/createClient.js'

const token = 'my-jwt-token'
const client = createClient({ edgeFunctionToken: token })

// Inspect what Authorization header would be
const builder = client.database.from('profiles')
builder.token = () => token
const resolved = typeof builder.token === 'function' ? builder.token() : builder.token
console.log('resolved token:', resolved)
console.log('broken template:', `Bearer ${builder.token}`)
