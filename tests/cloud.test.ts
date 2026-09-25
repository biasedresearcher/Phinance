import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("cloud RLS isolates users and optimistic revisions reject stale uploads", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      `create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as 'select nullif(current_setting(''request.jwt.claim.sub'',true),'''')::uuid'; grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated; insert into auth.users values ('00000000-0000-0000-0000-000000000001'),('00000000-0000-0000-0000-000000000002');`,
    );
    await db.exec(
      await readFile(
        new URL("../supabase/schema.sql", import.meta.url),
        "utf8",
      ),
    );
    await db.exec(
      `set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);`,
    );
    const create = await db.query<{ revision: number }>(
      `select public.save_phinance_snapshot(null,'{"schemaVersion":2,"data":{}}'::jsonb) as revision`,
    );
    assert.equal(Number(create.rows[0].revision), 1);
    await assert.rejects(
      db.query(
        `select public.save_phinance_snapshot(null,'{"schemaVersion":2,"data":{}}')`,
      ),
    );
    const update = await db.query<{ revision: number }>(
      `select public.save_phinance_snapshot(1,'{"schemaVersion":2,"data":{}}') as revision`,
    );
    assert.equal(Number(update.rows[0].revision), 2);
    await assert.rejects(
      db.query(
        `select public.save_phinance_snapshot(1,'{"schemaVersion":2,"data":{}}')`,
      ),
      /newer cloud copy/,
    );
    await db.exec(
      `select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false)`,
    );
    assert.equal(
      (await db.query("select * from public.finance_snapshots")).rows.length,
      0,
    );
    await assert.rejects(
      db.query(
        `insert into public.finance_snapshots(user_id,payload) values('00000000-0000-0000-0000-000000000001','{}')`,
      ),
      /row-level security/,
    );
    assert.equal(
      (
        await db.query(
          `update public.finance_snapshots set revision=100 where user_id='00000000-0000-0000-0000-000000000001' returning revision`,
        )
      ).rows.length,
      0,
    );
    await assert.rejects(
      db.query(
        `select public.save_phinance_snapshot(null,'{"schemaVersion":3,"data":{}}')`,
      ),
      /Unsupported/,
    );
    await db.exec("reset role; set role anon;");
    await assert.rejects(
      db.query("select * from public.finance_snapshots"),
      /permission denied/,
    );
  } finally {
    await db.close();
  }
});
