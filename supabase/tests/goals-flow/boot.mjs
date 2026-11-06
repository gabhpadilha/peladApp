import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

export const REPO = process.env.REPO;
/** Cria um banco em memória com o mínimo do Supabase (auth, storage, papéis) e aplica todas as migrations. */
export async function boot() {
  const db = new PGlite({ extensions: { pgcrypto } });
  await db.exec(`
    create schema if not exists extensions; create schema if not exists auth; create schema if not exists storage;
    create extension if not exists pgcrypto with schema extensions;
    do $$ begin
      if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
      if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
      if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if;
    end $$;
    create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}'::jsonb,
      confirmation_token text default '', recovery_token text default '', email_change_token_new text default '', email_change text default '');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects (id uuid default gen_random_uuid(), bucket_id text, name text, owner uuid);
    alter table storage.objects enable row level security;
    grant usage on schema public, auth, extensions to anon, authenticated, service_role;
    grant execute on function auth.uid() to anon, authenticated, service_role;
    -- Como no Supabase: tabelas novas já nascem com os privilégios padrão; as migrations revogam o que precisam.
    alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
    alter default privileges in schema public grant usage on sequences to authenticated;
  `);
  const dir = path.join(REPO, "supabase/migrations");
  for (const file of readdirSync(dir).sort()) {
    try { await db.exec(readFileSync(path.join(dir, file), "utf8")); }
    catch (e) { console.error("MIGRATION FALHOU", file, e.message); throw e; }
  }
  return db;
}
