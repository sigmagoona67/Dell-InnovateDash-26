import { Router } from 'express'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import multer from 'multer'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const uploadDir = path.resolve(__dirname, '../../storage/uploads')
fs.mkdirSync(uploadDir, { recursive: true })

const upload = multer({ dest: uploadDir })
const router = Router()

router.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' })
  return res.json({
    ok: true,
    key: req.file.filename,
    url: `/api/v1/storage/files/${req.file.filename}`,
    name: req.file.originalname,
  })
})

router.get('/files/:key', (req, res) => {
  const filePath = path.join(uploadDir, req.params.key)
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Not found' })
  return res.sendFile(filePath)
})

export default router
