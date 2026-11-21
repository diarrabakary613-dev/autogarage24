-- Estrae tabelle, viste, funzioni ed enum dello schema public in JSON (per gen-types.py)
select json_build_object(
  'tables', (select json_agg(json_build_object('name', c.relname, 'kind', c.relkind, 'columns',
      (select json_agg(json_build_object(
          'name', a.attname,
          'type', format_type(a.atttypid, a.atttypmod),
          'typtype', t.typtype,
          'elemtype', (select format_type(t.typelem, -1) where t.typelem <> 0),
          'elemtyptype', (select et.typtype from pg_type et where et.oid = t.typelem),
          'notnull', a.attnotnull,
          'hasdefault', a.atthasdef or a.attidentity <> '' or a.attgenerated <> '',
          'generated', a.attgenerated <> ''
        ) order by a.attnum)
       from pg_attribute a join pg_type t on t.oid = a.atttypid
       where a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped)) order by c.relname)
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'v')),
  'fks', (select json_agg(json_build_object(
      'table', cl.relname, 'name', co.conname,
      'columns', (select json_agg(a.attname order by k.ord) from unnest(co.conkey) with ordinality k(attnum, ord)
                  join pg_attribute a on a.attrelid = co.conrelid and a.attnum = k.attnum),
      'ref', rc.relname,
      'refcolumns', (select json_agg(a.attname order by k.ord) from unnest(co.confkey) with ordinality k(attnum, ord)
                  join pg_attribute a on a.attrelid = co.confrelid and a.attnum = k.attnum),
      'one_to_one', exists (select 1 from pg_index i where i.indrelid = co.conrelid and i.indisunique and i.indkey::int2[] @> co.conkey and array_length(i.indkey::int2[], 1) = array_length(co.conkey, 1) and i.indpred is null)
    ) order by cl.relname, co.conname)
    from pg_constraint co join pg_class cl on cl.oid = co.conrelid join pg_namespace n on n.oid = cl.relnamespace
    join pg_class rc on rc.oid = co.confrelid join pg_namespace rn on rn.oid = rc.relnamespace
    where co.contype = 'f' and n.nspname = 'public' and rn.nspname = 'public'),
  'enums', (select json_object_agg(t.typname, (select json_agg(e.enumlabel order by e.enumsortorder) from pg_enum e where e.enumtypid = t.oid))
    from pg_type t join pg_namespace n on n.oid = t.typnamespace where n.nspname = 'public' and t.typtype = 'e'),
  'functions', (select json_agg(json_build_object(
      'name', p.proname,
      'args', (select json_agg(json_build_object('name', an, 'type', format_type(at, -1),
                 'typtype', (select typtype from pg_type where oid = at), 'has_default', idx > p.pronargs - p.pronargdefaults))
               from unnest(p.proargnames[1:p.pronargs], p.proargtypes::oid[]) with ordinality as x(an, at, idx)),
      'returns', format_type(p.prorettype, -1),
      'rettyptype', (select typtype from pg_type where oid = p.prorettype),
      'retset', p.proretset,
      'outcols', (select json_agg(json_build_object('name', an, 'type', format_type(at, -1), 'typtype', (select typtype from pg_type where oid = at)))
                  from unnest(p.proargnames, p.proallargtypes, p.proargmodes) as y(an, at, am) where am = 't')
    ) order by p.proname)
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f')
);
