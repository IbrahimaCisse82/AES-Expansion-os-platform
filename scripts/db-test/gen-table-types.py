#!/usr/bin/env python3
"""Génère les définitions TypeScript (format Supabase) de tables données,
à partir d'une base qui a rejoué toutes les migrations (scripts/db-test).
Usage : PGHOST=... python3 scripts/db-test/gen-table-types.py tc_settings tc_kits ...
Sortie : blocs à insérer dans src/integrations/supabase/types.ts (Tables)."""
import json, os, subprocess, sys

DB = os.environ.get('DB_TEST_NAME', 'expansion_os_test')
def q(sql):
    out = subprocess.run(['psql', '-X', '-At', '-d', DB, '-c', sql], check=True, capture_output=True, text=True).stdout
    return [json.loads(l) for l in out.splitlines() if l.strip()]

TS = {'text': 'string', 'uuid': 'string', 'date': 'string', 'timestamp with time zone': 'string',
      'numeric': 'number', 'integer': 'number', 'smallint': 'number', 'bigint': 'number', 'real': 'number', 'double precision': 'number', 'boolean': 'boolean', 'jsonb': 'Json', 'json': 'Json'}

def table(t):
    cols = q(f"""select row_to_json(c) from (select column_name, data_type, udt_name, is_nullable='YES' n,
      column_default is not null or is_identity='YES' d from information_schema.columns
      where table_schema='public' and table_name='{t}' order by column_name) c""")
    fks = q(f"""select row_to_json(f) from (select con.conname name, array_agg(a.attname order by k.ord) cols,
      cl2.relname ref, array_agg(a2.attname order by k.ord) refcols
      from pg_constraint con join pg_class cl on cl.oid=con.conrelid join pg_class cl2 on cl2.oid=con.confrelid
      cross join lateral unnest(con.conkey, con.confkey) with ordinality k(c1, c2, ord)
      join pg_attribute a on a.attrelid=con.conrelid and a.attnum=k.c1
      join pg_attribute a2 on a2.attrelid=con.confrelid and a2.attnum=k.c2
      where con.contype='f' and cl.relname='{t}' group by con.conname, cl2.relname order by con.conname) f""")
    def ty(c):
        base = f'Database["public"]["Enums"]["{c["udt_name"]}"]' if c['data_type'] == 'USER-DEFINED' else TS[c['data_type']]
        return base + (' | null' if c['n'] else '')
    row = '\n'.join(f'          {c["column_name"]}: {ty(c)}' for c in cols)
    ins = '\n'.join(f'          {c["column_name"]}{"?" if (c["n"] or c["d"]) else ""}: {ty(c)}' for c in cols)
    upd = '\n'.join(f'          {c["column_name"]}?: {ty(c)}' for c in cols)
    rel = ''.join(f'''
          {{
            foreignKeyName: "{f['name']}"
            columns: {json.dumps(f['cols'])}
            isOneToOne: false
            referencedRelation: "{f['ref']}"
            referencedColumns: {json.dumps(f['refcols'])}
          }},''' for f in fks)
    return f"""      {t}: {{
        Row: {{
{row}
        }}
        Insert: {{
{ins}
        }}
        Update: {{
{upd}
        }}
        Relationships: [{rel}
        ]
      }}"""

print('\n'.join(table(t) for t in sys.argv[1:]))
