import ssl
import urllib.request
import zipfile
import tempfile
import sqlite3
from pathlib import Path
import pandas as pd

ssl._create_default_https_context = ssl._create_unverified_context

URL = "https://dadosabertos.ibama.gov.br/dados/SIFISC/auto_infracao/auto_infracao/auto_infracao_csv.zip"
DB_PATH = Path(__file__).parent / "db" / "ibama.db"

NAME_CANDIDATES = [
    "NOME_INFRATOR",
    "NOME_AUTUADO",
    "NOME",
    "NOME_PESSOA",
    "NOME_RAZAO_SOCIAL",
]

CPF_COL = "CPF_CNPJ_INFRATOR"
NUM_PROCESSO_COL = "NUM_PROCESSO"


def download_zip(url: str) -> Path:
    tmp_path = Path(tempfile.gettempdir()) / "ibama_auto_infracao.zip"
    with urllib.request.urlopen(url) as resp, open(tmp_path, "wb") as out:
        while True:
            chunk = resp.read(1024 * 1024)
            if not chunk:
                break
            out.write(chunk)
    return tmp_path


def find_name_column(columns):
    upper = {c.upper(): c for c in columns}
    for cand in NAME_CANDIDATES:
        if cand in upper:
            return upper[cand]
    return None


def ensure_db(conn: sqlite3.Connection):
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA synchronous=NORMAL;")
    conn.execute(
        "CREATE TABLE IF NOT EXISTS autos_raw (name TEXT, cpf TEXT, num_processo TEXT);"
    )


def reset_tables(conn: sqlite3.Connection):
    conn.execute("DROP TABLE IF EXISTS autos_fts;")
    conn.execute("DROP TABLE IF EXISTS autos;")
    conn.execute("DELETE FROM autos_raw;")


def create_final_tables(conn: sqlite3.Connection):
    conn.execute(
        "CREATE TABLE autos (id INTEGER PRIMARY KEY, name TEXT, cpf TEXT, num_processo TEXT);"
    )
    conn.execute(
        "CREATE VIRTUAL TABLE autos_fts USING fts5(name, content='autos', content_rowid='id');"
    )
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_autos_cpf ON autos(cpf);"
    )


def populate_from_zip(zip_path: Path, conn: sqlite3.Connection):
    with zipfile.ZipFile(zip_path, "r") as zf:
        for name in zf.namelist():
            if not name.endswith(".csv"):
                continue
            with zf.open(name) as f:
                try:
                    df = pd.read_csv(
                        f,
                        sep=";",
                        decimal=",",
                        dtype={CPF_COL: str, NUM_PROCESSO_COL: str},
                        low_memory=False,
                    )
                except Exception:
                    continue
                name_col = find_name_column(df.columns)
                if name_col is None:
                    continue
                out = pd.DataFrame(
                    {
                        "name": df[name_col].astype(str).fillna("").str.strip(),
                        "cpf": df.get(CPF_COL, pd.Series([None] * len(df), dtype="object")).astype(str),
                        "num_processo": df.get(NUM_PROCESSO_COL, pd.Series([None] * len(df), dtype="object")).astype(str),
                    }
                )
                out.to_sql("autos_raw", conn, if_exists="append", index=False, chunksize=50000, method=None)


def finalize(conn: sqlite3.Connection):
    conn.execute("INSERT INTO autos(name, cpf, num_processo) SELECT name, cpf, num_processo FROM autos_raw;")
    conn.execute("INSERT INTO autos_fts(rowid, name) SELECT id, name FROM autos;")
    conn.commit()


def main():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    zp = download_zip(URL)
    try:
        with sqlite3.connect(DB_PATH) as conn:
            ensure_db(conn)
            reset_tables(conn)
            populate_from_zip(zp, conn)
            create_final_tables(conn)
            finalize(conn)
    finally:
        if zp.exists():
            try:
                zp.unlink()
            except Exception:
                pass


if __name__ == "__main__":
    main()
