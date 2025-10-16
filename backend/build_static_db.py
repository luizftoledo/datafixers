import ssl
import urllib.request
import zipfile
import tempfile
import sqlite3
from pathlib import Path
import pandas as pd
from datetime import datetime, timezone

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

# Additional candidates for enrichment
DATE_CANDIDATES = [
    "DATA_AUTO_INFRACAO",
    "DATA_INFRACAO",
    "DATA_LAVRATURA",
    "DATA",
    "DAT_HORA_AUTO_INFRACAO",
]
VALUE_CANDIDATES = [
    "VALOR_MULTA",
    "VALOR_INFRACAO",
    "VALOR",
    "VAL_AUTO_INFRACAO",
]
DESC_CANDIDATES = [
    "DESCRICAO_AUTO",
    "DESCRICAO_INFRACAO",
    "DESCRICAO",
    "ENQUADRAMENTO",
    "ENQUADRAMENTO_LEGAL",
    "DESCRICAO_AUTO_INFRACAO",
    "DES_AUTO_INFRACAO",
]


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
    conn.execute("DROP TABLE IF EXISTS meta;")
    conn.execute(
        """
        CREATE TABLE autos (
            id INTEGER PRIMARY KEY,
            name TEXT,
            cpf TEXT,
            num_processo TEXT,
            data TEXT,
            valor REAL,
            descricao TEXT
        );
        """
    )
    conn.execute("CREATE INDEX IF NOT EXISTS idx_autos_cpf ON autos(cpf);")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_autos_name ON autos(name);")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_autos_data ON autos(data);")
    conn.execute(
        """
        CREATE TABLE meta (
            key TEXT PRIMARY KEY,
            value TEXT
        );
        """
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
                cols = list(df.columns)
                name_col = find_name_column(cols)
                if name_col is None:
                    continue
                # locate enrichment columns
                upper = {c.upper(): c for c in cols}
                def pick(candidates):
                    for cand in candidates:
                        if cand in upper:
                            return upper[cand]
                    return None
                date_col = pick(DATE_CANDIDATES)
                value_col = pick(VALUE_CANDIDATES)
                desc_col = pick(DESC_CANDIDATES)

                # build output dataframe
                out = pd.DataFrame(
                    {
                        "name": df[name_col].astype(str).fillna("").str.strip(),
                        "cpf": df.get(CPF_COL, pd.Series([None] * len(df), dtype="object")).astype(str),
                        "num_processo": df.get(NUM_PROCESSO_COL, pd.Series([None] * len(df), dtype="object")).astype(str),
                    }
                )
                # parse date
                if date_col and date_col in df:
                    try:
                        dt = pd.to_datetime(df[date_col], dayfirst=True, errors="coerce")
                        out["data"] = dt.dt.strftime("%Y-%m-%d")
                    except Exception:
                        out["data"] = None
                else:
                    out["data"] = None
                # parse value (float)
                if value_col and value_col in df:
                    try:
                        # pandas with decimal=',' should already parse, but ensure numeric
                        val = pd.to_numeric(df[value_col], errors="coerce")
                        out["valor"] = val
                    except Exception:
                        out["valor"] = None
                else:
                    out["valor"] = None
                # description
                if desc_col and desc_col in df:
                    out["descricao"] = df[desc_col].astype(str)
                else:
                    out["descricao"] = None

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
            # write meta info
            cur = conn.cursor()
            cur.execute("SELECT MAX(data) FROM autos WHERE data IS NOT NULL AND data != ''")
            max_date = cur.fetchone()[0] or ''
            built_at = datetime.now(timezone.utc).isoformat()
            conn.execute("INSERT INTO meta(key,value) VALUES(?,?)", ("built_at_utc", built_at))
            conn.execute("INSERT INTO meta(key,value) VALUES(?,?)", ("max_date", max_date))
            conn.commit()
    finally:
        try:
            zp.unlink()
        except Exception:
            pass


if __name__ == "__main__":
    build_static_db()
