import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '../..')
const migrationsDir = path.join(root, 'migrations')
const outPath = path.join(__dirname, '../db/init.sql')

const header = `-- CareBridge microservices database (standalone Postgres)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE SCHEMA IF NOT EXISTS public;

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS public.auth_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  email_verified BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

`

const staffTablesSql = `
CREATE TABLE IF NOT EXISTS public.staff_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  questionnaire_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.staff_questionnaire (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  interests JSONB NOT NULL DEFAULT '[]'::jsonb,
  preferred_communication_style JSONB NOT NULL DEFAULT '[]'::jsonb,
  supporting_strengths JSONB NOT NULL DEFAULT '[]'::jsonb,
  personality JSONB NOT NULL DEFAULT '[]'::jsonb,
  quiz_completed BOOLEAN NOT NULL DEFAULT FALSE,
  date_of_birth DATE,
  age INTEGER,
  gender TEXT,
  country TEXT,
  languages JSONB NOT NULL DEFAULT '[]'::jsonb,
  questionnaire_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`

const footer = ``


const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort()
let body = ''
for (const file of files) {
  let sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8')
  sql = sql
    .replace(/auth\.users/g, 'public.auth_users')
    .replace(/system\.update_updated_at/g, 'public.update_updated_at')
    .replace(/auth\.uid\(\)/g, "NULLIF(current_setting('app.current_user_id', true), '')::uuid")
    .replace(/TO authenticated/g, 'TO PUBLIC')
    .replace(/ALTER TABLE[\s\S]*?ENABLE ROW LEVEL SECURITY;/g, '-- RLS disabled')
    .replace(/CREATE POLICY[\s\S]*?;/g, '')
    .replace(/DROP POLICY[\s\S]*?;/g, '')
    .replace(/GRANT[\s\S]*?;/g, '')
  body += `\n-- === ${file} ===\n${sql}\n`
  if (file.includes('20260610143000')) {
    body += staffTablesSql
  }
}

fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, header + body + footer)
console.log(`Wrote ${outPath} (${files.length} migrations)`)
