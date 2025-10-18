#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import csv
import gzip
import os
import re
import sqlite3
import sys
import unicodedata
from datetime import datetime

# Usage:
#   python build_multas_sqlite.py /path/to/multas_ibama_unicas_2025-08-08.csv output.sqlite.gz
# This script streams the CSV and builds a normalized SQLite with FTS5 for fast client-side search (sql.js).
# It also gzips the final database for hosting and fast transfer.

CSV_FIELD_MAP = {
    # CSV header -> canonical column name
    'nome_infrator': 'nome_infrator',
    'cpf_cnpj_infrator': 'cpf_cnpj_infrator',
    'val_auto_infracao': 'val_auto_infracao',
    'municipio': 'municipio',
    'uf': 'uf',
    'dat_hora_auto_infracao': 'dat_hora_auto_infracao',
    'des_auto_infracao': 'des_auto_infracao',
    'num_auto_infracao': 'num_auto_infracao',
    'num_processo': 'num_processo',
}

CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS multas (
  id INTEGER PRIMARY KEY,
  nome_infrator TEXT,
  cpf_cnpj_infrator TEXT,
  cpf_norm TEXT,
  num_processo TEXT,
  num_auto_infracao TEXT,
  dat_hora_auto_infracao TEXT,
  data DATE,
  val_auto_infracao REAL,
  municipio TEXT,
  uf TEXT,
  des_auto_infracao TEXT,
  nome_norm TEXT,
  desc_norm TEXT
);
"""

# FTS for name, description and cpf. Prefix enabled for partial matching (prefix); diacritics removed.
CREATE_FTS_SQL = """
CREATE VIRTUAL TABLE IF NOT EXISTS multas_fts USING fts5(
  nome,
  descricao,
  cpf,
  tokenize = 'unicode61 remove_diacritics 2',
  prefix='2 3 4'
);
"""

CREATE_INDEXES_SQL = [
    "CREATE INDEX IF NOT EXISTS idx_multas_data ON multas(data);",
    "CREATE INDEX IF NOT EXISTS idx_multas_valor ON multas(val_auto_infracao);",
    "CREATE INDEX IF NOT EXISTS idx_multas_cpf ON multas(cpf_norm);",
    "CREATE INDEX IF NOT EXISTS idx_multas_proc ON multas(num_processo);",
]

CREATE_META_SQL = """
CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT
);
"""

INSERT_FTS_SQL = """
INSERT INTO multas_fts(rowid, nome, descricao, cpf)
SELECT id, nome_norm, desc_norm, cpf_norm FROM multas;
"""

def normalize_text(s: str) -> str:
    if s is None:
        return ''
    # strip accents, lower, collapse spaces
    s = unicodedata.normalize('NFD', s)
    s = ''.join(ch for ch in s if unicodedata.category(ch) != 'Mn')
    s = s.lower()
    s = re.sub(r"\s+", " ", s.strip())
    return s

_digits = re.compile(r"\D+")

def only_digits(s: str) -> str:
    if not s:
        return ''
    return _digits.sub('', s)


def parse_date_iso(value: str) -> str:
    if not value:
        return ''
    v = value.strip()
    # Try common formats
    fmts = [
        "%Y-%m-%d",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%dT%H:%M:%S",
        "%d/%m/%Y",
        "%d/%m/%Y %H:%M:%S",
    ]
    for f in fmts:
        try:
            dt = datetime.strptime(v[:19], f)
            return dt.strftime("%Y-%m-%d")
        except Exception:
            pass
    # If already like 2025-08-06..., take first 10
    if re.match(r"^\d{4}-\d{2}-\d{2}", v):
        return v[:10]
    return ''


def coerce_float(x: str):
    if x is None or x == '':
        return None
    try:
        return float(str(x).replace(',', '.'))
    except Exception:
        return None


def main():
    if len(sys.argv) < 3:
        print("Usage: python build_multas_sqlite.py <input.csv> <output.sqlite.gz>")
        sys.exit(1)

    in_csv = sys.argv[1]
    out_gz = sys.argv[2]

    tmp_sqlite = out_gz[:-3] if out_gz.endswith('.gz') else out_gz + '.sqlite'
    if os.path.exists(tmp_sqlite):
        os.remove(tmp_sqlite)

    conn = sqlite3.connect(tmp_sqlite)
    conn.execute('PRAGMA journal_mode = OFF;')
    conn.execute('PRAGMA synchronous = OFF;')
    conn.execute('PRAGMA temp_store = MEMORY;')
    conn.execute('PRAGMA cache_size = 100000;')

    cur = conn.cursor()
    cur.execute(CREATE_TABLE_SQL)
    cur.execute(CREATE_FTS_SQL)
    cur.execute(CREATE_META_SQL)
    for sql in CREATE_INDEXES_SQL:
        cur.execute(sql)

    # Stream CSV
    total = 0
    latest_date = ''
    with open(in_csv, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        # detect fields mapping
        fields = reader.fieldnames or []
        required = list(CSV_FIELD_MAP.keys())
        for r in required:
            if r not in fields:
                print(f"[WARN] Missing column in CSV: {r}")
        batch = []
        for row in reader:
            nome = row.get('nome_infrator', '')
            cpf = row.get('cpf_cnpj_infrator', '')
            valor = coerce_float(row.get('val_auto_infracao', ''))
            municipio = row.get('municipio', '')
            uf = row.get('uf', '')
            dat_raw = row.get('dat_hora_auto_infracao', '')
            desc = row.get('des_auto_infracao', '')
            num_auto = row.get('num_auto_infracao', '')
            num_proc = row.get('num_processo', '')

            data_iso = parse_date_iso(dat_raw)
            if data_iso and (latest_date == '' or data_iso > latest_date):
                latest_date = data_iso

            nome_norm = normalize_text(nome)
            desc_norm = normalize_text(desc)
            cpf_norm = only_digits(cpf)

            batch.append((
                nome,
                cpf,
                cpf_norm,
                num_proc,
                num_auto,
                dat_raw,
                data_iso,
                valor,
                municipio,
                uf,
                desc,
                nome_norm,
                desc_norm,
            ))

            if len(batch) >= 5000:
                conn.executemany(
                    "INSERT INTO multas (nome_infrator, cpf_cnpj_infrator, cpf_norm, num_processo, num_auto_infracao, dat_hora_auto_infracao, data, val_auto_infracao, municipio, uf, des_auto_infracao, nome_norm, desc_norm) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
                    batch,
                )
                conn.commit()
                total += len(batch)
                batch.clear()
                if total % 50000 == 0:
                    print(f"Inserted: {total}")

        if batch:
            conn.executemany(
                "INSERT INTO multas (nome_infrator, cpf_cnpj_infrator, cpf_norm, num_processo, num_auto_infracao, dat_hora_auto_infracao, data, val_auto_infracao, municipio, uf, des_auto_infracao, nome_norm, desc_norm) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
                batch,
            )
            conn.commit()
            total += len(batch)
            batch.clear()

    print(f"Total rows: {total}")

    # Populate FTS
    print("Building FTS index...")
    cur.execute("DELETE FROM multas_fts;")
    cur.execute(INSERT_FTS_SQL)
    conn.commit()

    # Meta info
    cur.execute("INSERT OR REPLACE INTO meta(key, value) VALUES (?, ?)", ("lastUpdated", datetime.utcnow().strftime("%Y-%m-%d")))
    cur.execute("INSERT OR REPLACE INTO meta(key, value) VALUES (?, ?)", ("latestFineDate", latest_date))
    conn.commit()

    conn.close()

    # Gzip it
    print("Gzipping...")
    with open(tmp_sqlite, 'rb') as fi, gzip.open(out_gz, 'wb', compresslevel=9) as fo:
        while True:
            chunk = fi.read(1024 * 1024)
            if not chunk:
                break
            fo.write(chunk)

    print(f"Written: {out_gz}")

if __name__ == '__main__':
    main()
