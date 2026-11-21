#!/usr/bin/env python3
"""Converte l'introspezione JSON dello schema in tipi TypeScript compatibili con supabase-js."""
import json
import sys

schema = json.load(open(sys.argv[1]))
enums = schema.get("enums") or {}

SCALARS = {
    "uuid": "string", "text": "string", "character varying": "string", "date": "string",
    "timestamp with time zone": "string", "timestamp without time zone": "string", "time without time zone": "string",
    "integer": "number", "bigint": "number", "smallint": "number", "double precision": "number", "real": "number",
    "boolean": "boolean", "jsonb": "Json", "json": "Json", "void": "undefined", "interval": "string",
}


def ts(type_name, typtype=None, elem=None, elemtyptype=None):
    t = type_name
    if t.endswith("[]"):
        base = t[:-2]
        inner = ts(base, elemtyptype)
        return f"{inner}[]"
    if t.startswith("numeric"):
        return "number"
    if t.startswith("public."):
        t = t[len("public."):]
    if t in enums:
        return f'Database["public"]["Enums"]["{t}"]'
    if t.startswith("character varying"):
        return "string"
    return SCALARS.get(t, "unknown")


out = []
out.append("/**\n * Tipi del database generati automaticamente da scripts/gen-types.sh.\n * NON modificare a mano: rigenerare dopo ogni migrazione.\n */\n")
out.append("export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];\n")
out.append("export type Database = {\n  public: {\n    Tables: {")
views = []
for t in schema["tables"]:
    if t["kind"] == "v":
        views.append(t)
        continue
    cols = t["columns"]
    row = "\n".join(f'          {c["name"]}: {ts(c["type"], c["typtype"], c["elemtype"], c["elemtyptype"])}{"" if c["notnull"] else " | null"};' for c in cols)
    ins = "\n".join(
        f'          {c["name"]}{"?" if (c["hasdefault"] or not c["notnull"]) else ""}: {ts(c["type"], c["typtype"], c["elemtype"], c["elemtyptype"])}{"" if c["notnull"] else " | null"};'
        for c in cols if not c["generated"])
    upd = "\n".join(
        f'          {c["name"]}?: {ts(c["type"], c["typtype"], c["elemtype"], c["elemtyptype"])}{"" if c["notnull"] else " | null"};'
        for c in cols if not c["generated"])
    rels = [f for f in (schema.get("fks") or []) if f["table"] == t["name"]]
    rel_ts = "[" + ", ".join(
        '{ foreignKeyName: %s; columns: %s; isOneToOne: %s; referencedRelation: %s; referencedColumns: %s }'
        % (json.dumps(r["name"]), json.dumps(r["columns"]), "true" if r["one_to_one"] else "false", json.dumps(r["ref"]), json.dumps(r["refcolumns"]))
        for r in rels) + "]"
    out.append(f'      {t["name"]}: {{\n        Row: {{\n{row}\n        }};\n        Insert: {{\n{ins}\n        }};\n        Update: {{\n{upd}\n        }};\n        Relationships: {rel_ts};\n      }};')
out.append("    };\n    Views: {")
for v in views:
    row = "\n".join(f'          {c["name"]}: {ts(c["type"], c["typtype"], c["elemtype"], c["elemtyptype"])} | null;' for c in v["columns"])
    out.append(f'      {v["name"]}: {{\n        Row: {{\n{row}\n        }};\n        Relationships: [];\n      }};')
out.append("    };\n    Functions: {")
# Le funzioni sovraccaricate (stesso nome, argomenti diversi) diventano un'unione di firme.
by_name = {}
for f in schema.get("functions") or []:
    if f["returns"] == "trigger":
        continue
    by_name.setdefault(f["name"], []).append(f)
for name in sorted(by_name):
    sigs = []
    for f in by_name[name]:
        args = f.get("args") or []
        if args:
            a = "; ".join(f'{x["name"]}{"?" if x["has_default"] else ""}: {ts(x["type"], x["typtype"])}' for x in args)
            args_ts = "{ " + a + " }"
        else:
            args_ts = "Record<PropertyKey, never>"
        if f.get("outcols"):
            r = "{ " + "; ".join(f'{c["name"]}: {ts(c["type"], c["typtype"])}' for c in f["outcols"]) + " }[]"
        else:
            r = ts(f["returns"], f.get("rettyptype"))
            if f["retset"]:
                r += "[]"
        sig = f"{{ Args: {args_ts}; Returns: {r} }}"
        if sig not in sigs:
            sigs.append(sig)
    out.append(f'      {name}: {" | ".join(sigs)};')
out.append("    };\n    Enums: {")
for name, labels in sorted(enums.items()):
    out.append(f'      {name}: ' + " | ".join(json.dumps(l) for l in labels) + ";")
out.append("    };\n    CompositeTypes: { [_ in never]: never };\n  };\n};\n")
out.append("""
type PublicSchema = Database["public"];
export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"];
export type Views<T extends keyof PublicSchema["Views"]> = PublicSchema["Views"][T]["Row"];
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T];

// Alias usati dal codice della Fase 1
export type AppRoleEnum = Enums<"app_role">;
export type AccountStatusEnum = Enums<"account_status">;
export type VerificationTypeEnum = Enums<"verification_type">;
export type VerificationStatusEnum = Enums<"verification_status">;
export type ProfileRow = Tables<"profiles">;
export type ProfessionalProfileRow = Tables<"professional_profiles">;
""")
print("\n".join(out))
