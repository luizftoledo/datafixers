import ssl
import urllib.request
import zipfile
import tempfile
import sqlite3
from pathlib import Path
import pandas as pd

ssl._create_default_https_context = ssl._create_unverified_context

URL = "https://dadosabertos.ibama.gov.br/dados/SIFISC/auto_infracao/auto_infracao/auto_infracao_csv.zip"
REPO_ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = REPO_ROOT / "public-data"
DB_PATH = OUT_DIR / "ibama.sqlite"

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


def ensure_tables(conn: sqlite3.Connection):
    conn.execute("PRAGMA journal_mode=DELETE;")
    conn.execute("PRAGMA synchronous=NORMAL;")
    conn.execute("DROP TABLE IF EXISTS autos;")
    conn.execute(
        """
        CREATE TABLE autos (
            id INTEGER PRIMARY KEY,
            name TEXT,
            cpf TEXT,
            num_processo TEXT
        );
        """
    )
    conn.execute("CREATE INDEX IF NOT EXISTS idx_autos_cpf ON autos(cpf);")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_autos_name ON autos(name);")


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
                out.to_sql("autos", conn, if_exists="append", index=False, chunksize=50000)


def build_static_db():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    zp = download_zip(URL)
    try:
        if DB_PATH.exists():
            DB_PATH.unlink()
        with sqlite3.connect(DB_PATH) as conn:
            ensure_tables(conn)
            populate_from_zip(zp, conn)
            conn.commit()
    finally:
        try:
            zp.unlink()
        except Exception:
            pass


if __name__ == "__main__":
    build_static_db()
