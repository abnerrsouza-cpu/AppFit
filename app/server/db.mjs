// Banco de dados (PostgreSQL). As tabelas são criadas sozinhas na primeira vez que o servidor sobe.
import pg from 'pg'

const url = process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL não definida')

export const pool = new pg.Pool({
  connectionString: url,
  // no Railway a conexão interna (postgres.railway.internal) não usa SSL; defina PGSSL=1 para bancos externos
  ssl: process.env.PGSSL ? { rejectUnauthorized: false } : false,
  max: 10,
})

export const q = (text, params) => pool.query(text, params)

export async function migrate() {
  await q(`
    create table if not exists users (
      id serial primary key,
      email text unique not null,
      name text not null,
      password_hash text not null,
      avatar bytea,
      avatar_type text,
      status text not null default 'pending',   -- pending | approved | rejected
      role text not null default 'user',        -- user | admin
      notif_paused boolean not null default false,
      lang text default 'pt',
      tz text default 'America/Sao_Paulo',
      created_at timestamptz not null default now(),
      approved_at timestamptz,
      last_seen_at timestamptz
    );
    create table if not exists sessions (
      token text primary key,
      user_id int not null references users(id) on delete cascade,
      created_at timestamptz not null default now(),
      expires_at timestamptz not null
    );
    create table if not exists activity (
      user_id int not null references users(id) on delete cascade,
      day date not null,
      hits int not null default 1,
      primary key (user_id, day)
    );
    create table if not exists app_state (
      user_id int primary key references users(id) on delete cascade,
      data jsonb not null,
      schedule jsonb not null default '[]',
      updated_at timestamptz not null default now()
    );
    create table if not exists push_subs (
      id serial primary key,
      user_id int not null references users(id) on delete cascade,
      endpoint text unique not null,
      p256dh text not null,
      auth text not null,
      created_at timestamptz not null default now()
    );
    create table if not exists settings (
      key text primary key,
      value jsonb not null
    );
    create table if not exists broadcasts (
      id serial primary key,
      title text not null,
      body text not null,
      send_at timestamptz not null default now(),
      sent_at timestamptz,
      sent_count int not null default 0,
      created_at timestamptz not null default now()
    );
    create table if not exists notif_log (
      id bigserial primary key,
      user_id int references users(id) on delete cascade,
      kind text not null,         -- rotina | broadcast | admin | teste
      dedupe text,
      title text not null,
      body text not null,
      ok boolean not null,
      sent_at timestamptz not null default now()
    );
    create unique index if not exists notif_log_dedupe on notif_log (user_id, dedupe) where dedupe is not null;
    create index if not exists notif_log_sent on notif_log (sent_at desc);
  `)
  await q(`insert into settings (key, value) values ('notifications', '{"enabled": true}') on conflict do nothing`)
}

export async function getSetting(key, fallback) {
  const r = await q('select value from settings where key = $1', [key])
  return r.rows[0]?.value ?? fallback
}
export async function setSetting(key, value) {
  await q('insert into settings (key, value) values ($1, $2) on conflict (key) do update set value = excluded.value', [key, value])
}
