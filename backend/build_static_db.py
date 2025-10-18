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
# Optional local baseline CSV to prefer when fresher than the official ZIP
# 1) Prefer repo copy at backend/baseline/multas_ibama_baseline.csv(.gz)
# 2) Fallback to user's absolute path if running locally
REPO_BASELINE_DIR = REPO_ROOT / "backend" / "baseline"
REPO_BASELINE_CSV = REPO_BASELINE_DIR / "multas_ibama_baseline.csv"
REPO_BASELINE_GZ = REPO_BASELINE_DIR / "multas_ibama_baseline.csv.gz"
LOCAL_ABS_BASELINE = Path("/Users/luizfernandotoledo/Desktop/Code_folder/cursor_testes/multas_ibama_unicas_2025-08-08.csv")

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
    print("[builder] downloading official ZIP...")
    tmp_path = Path(tempfile.gettempdir()) / "ibama_auto_infracao.zip"
    with urllib.request.urlopen(url, timeout=120) as resp, open(tmp_path, "wb") as out:
        total = 0
        while True:
            chunk = resp.read(1024 * 1024)
            if not chunk:
                break
            out.write(chunk)
            total += len(chunk)
            if total % (50 * 1024 * 1024) < 1024 * 1024:  # every ~50MB
                print(f"[builder] downloaded ~{total // (1024*1024)} MB...")
    print("[builder] download complete")
    return tmp_path


def find_name_column(columns):
    upper = {c.upper(): c for c in columns}
    for cand in NAME_CANDIDATES:
        if cand in upper:
            return upper[cand]
    return None


def ensure_tables(conn: sqlite3.Connection):
    conn.execute("PRAGMA page_size=8192;")
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
            cpf_norm TEXT,
            num_processo TEXT,
            data TEXT,
            valor REAL,
            descricao TEXT
        );
        """
    )
    # keep only essential indexes to reduce DB size
    conn.execute("CREATE INDEX IF NOT EXISTS idx_autos_cpf_norm ON autos(cpf_norm);")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_autos_data ON autos(data);")
    conn.execute(
        """
        CREATE TABLE meta (
            key TEXT PRIMARY KEY,
            value TEXT
        );
        """
    )


def _process_generic_df(df: pd.DataFrame) -> pd.DataFrame:
    """Map and normalize an incoming generic DF into the standardized schema."""
    cols = list(df.columns)
    # helper: robust date parser that preserves YYYY-MM-DD and parses other formats dayfirst
    def parse_to_ymd(series: pd.Series) -> pd.Series:
        try:
            s = series.astype(str)
            iso_mask = s.str.match(r'^\d{4}-\d{2}-\d{2}$', na=False)
            dt_iso = pd.to_datetime(s.where(iso_mask, None), format='%Y-%m-%d', errors='coerce')
            dt_other = pd.to_datetime(s.where(~iso_mask, None), dayfirst=True, errors='coerce')
            dt = dt_iso.combine_first(dt_other)
            return dt.dt.strftime('%Y-%m-%d')
        except Exception:
            return pd.Series([None] * len(series))
    # If it's already standardized, just ensure cpf_norm and filters
    std_cols = {"name", "cpf", "num_processo", "data", "valor", "descricao"}
    if std_cols.issubset(set(c.lower() for c in cols)):
        # normalize column names to expected casing
        df2 = df.copy()
        lower_map = {c.lower(): c for c in df2.columns}
        out = pd.DataFrame({
            "name": df2[lower_map["name"]].astype(str).fillna("").str.strip(),
            "cpf": df2[lower_map["cpf"]].astype(str) if "cpf" in lower_map else df2[lower_map["cpf_cnpj"]].astype(str) if "cpf_cnpj" in lower_map else "",
            "num_processo": df2[lower_map["num_processo"]].astype(str),
            "data": parse_to_ymd(df2[lower_map["data"]]),
            "valor": pd.to_numeric(df2[lower_map["valor"]], errors="coerce") if "valor" in lower_map else None,
            "descricao": df2[lower_map["descricao"]].astype(str) if "descricao" in lower_map else None,
        })
        out["cpf_norm"] = out["cpf"].fillna("").astype(str).str.replace(r"\D+", "", regex=True)
        # drop rows with future dates
        try:
            today_str = datetime.now().strftime("%Y-%m-%d")
            mask_future = (out["data"].notna()) & (out["data"] > today_str)
            if mask_future.any():
                out = out.loc[~mask_future]
        except Exception:
            pass
        return out[["name", "cpf", "cpf_norm", "num_processo", "data", "valor", "descricao"]]
    name_col = find_name_column(cols)
    if name_col is None:
        return pd.DataFrame(columns=["name", "cpf", "cpf_norm", "num_processo", "data", "valor", "descricao"])  # empty
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

    out = pd.DataFrame(
        {
            "name": df[name_col].astype(str).fillna("").str.strip(),
            "cpf": df.get(CPF_COL, pd.Series([None] * len(df), dtype="object")).astype(str),
            "num_processo": df.get(NUM_PROCESSO_COL, pd.Series([None] * len(df), dtype="object")).astype(str),
        }
    )
    # normalized cpf/cnpj: only digits
    out["cpf_norm"] = out["cpf"].fillna("").astype(str).str.replace(r"\D+", "", regex=True)
    # parse date
    if date_col and date_col in df:
        try:
            out["data"] = parse_to_ymd(df[date_col])
        except Exception:
            out["data"] = None
    else:
        out["data"] = None
    # drop rows with future dates (keep nulls)
    try:
        today_str = datetime.now().strftime("%Y-%m-%d")
        mask_future = (out["data"].notna()) & (out["data"] > today_str)
        if mask_future.any():
            out = out.loc[~mask_future]
    except Exception:
        pass
    # parse value (float)
    if value_col and value_col in df:
        try:
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
    return out


def collect_from_zip(zip_path: Path) -> pd.DataFrame:
    """Read all CSVs from the official ZIP into a single normalized dataframe."""
    parts = []
    with zipfile.ZipFile(zip_path, "r") as zf:
        for name in zf.namelist():
            if not name.endswith(".csv"):
                continue
            print(f"[builder] reading {name} ...")
            with zf.open(name) as f:
                try:
                    df = pd.read_csv(
                        f,
                        sep=";",
                        decimal=",",
                        dtype={CPF_COL: str, NUM_PROCESSO_COL: str},
                        low_memory=False,
                    )
                except Exception as e:
                    print(f"[builder] failed to read {name}: {e}")
                    continue
                out = _process_generic_df(df)
                if len(out):
                    parts.append(out)
                    print(f"[builder] processed {name}: rows={len(out)}")
    if parts:
        return pd.concat(parts, ignore_index=True)
    return pd.DataFrame(columns=["name", "cpf", "cpf_norm", "num_processo", "data", "valor", "descricao"])  # empty


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
                out = _process_generic_df(df)
                if len(out):
                    out.to_sql("autos", conn, if_exists="append", index=False, chunksize=50000)


def build_static_db():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    # Always use the official ZIP source
    zp = download_zip(URL)
    try:
        # Collect only from official source
        df_baseline = None
        df_source = collect_from_zip(zp)

        # Compute max dates (ignore nulls)
        def max_date_of(df: pd.DataFrame) -> str:
            if df is None or df.empty:
                return ''
            try:
                s = df['data'].dropna()
                s = s[s <= datetime.now().strftime('%Y-%m-%d')]
                return s.max() if not s.empty else ''
            except Exception:
                return ''

        max_base = max_date_of(df_baseline)
        max_src = max_date_of(df_source)
        print(f"[builder] baseline max_date={'-' } rows={0}")
        print(f"[builder] source   max_date={max_src or '-'} rows={0 if df_source is None else len(df_source)}")

        # Use only the source dataset (official ZIP)
        use_df = df_source
        source_choice = 'source'
        print(f"[builder] using dataset: {source_choice} with rows={0 if use_df is None else len(use_df)}")

        if DB_PATH.exists():
            DB_PATH.unlink()
        with sqlite3.connect(DB_PATH) as conn:
            ensure_tables(conn)
            if use_df is not None and not use_df.empty:
                use_df.to_sql("autos", conn, if_exists="append", index=False, chunksize=50000)
            else:
                # Fallback: stream directly from ZIP if something went wrong assembling the DataFrame
                populate_from_zip(zp, conn)
            # write meta info
            cur = conn.cursor()
            # summary metrics
            cur.execute("SELECT COUNT(1) FROM autos")
            total_rows = cur.fetchone()[0] or 0
            cur.execute("SELECT MIN(data) FROM autos WHERE data IS NOT NULL AND data != '' AND date(data) <= date('now')")
            min_date = cur.fetchone()[0] or ''
            cur.execute("SELECT MAX(data) FROM autos WHERE data IS NOT NULL AND data != '' AND date(data) <= date('now')")
            max_date = cur.fetchone()[0] or ''
            built_at = datetime.now(timezone.utc).isoformat()
            conn.execute("INSERT INTO meta(key,value) VALUES(?,?)", ("built_at_utc", built_at))
            conn.execute("INSERT INTO meta(key,value) VALUES(?,?)", ("max_date", max_date))
            conn.commit()
            # compact database to minimize size
            conn.execute("VACUUM;")
            conn.execute("PRAGMA optimize;")
            print(f"[builder] wrote meta: built_at_utc={built_at}, max_date={max_date}")
            print(f"[builder] final rows={total_rows} min_date={min_date or '-'} max_date={max_date or '-'} choice={source_choice}")
            # write a markdown summary for GitHub Actions
            try:
                with open('build_summary.md', 'w', encoding='utf-8') as fh:
                    fh.write('# IBAMA build summary\n')
                    fh.write(f"\n- Source used: **{source_choice}**\n")
                    fh.write(f"- Total rows: **{total_rows}**\n")
                    fh.write(f"- Min date: **{min_date or '-'}**\n")
                    fh.write(f"- Max date: **{max_date or '-'}**\n")
                    fh.write(f"- Built at (UTC): **{built_at}**\n")
            except Exception:
                pass
            # write gzip-compressed copy for GitHub Pages
            try:
                import gzip, shutil
                gz_path = OUT_DIR / 'ibama.sqlite.gz'
                with open(DB_PATH, 'rb') as f_in, gzip.open(gz_path, 'wb', compresslevel=6) as f_out:
                    shutil.copyfileobj(f_in, f_out)
                print(f"[builder] wrote gzip DB: {gz_path} ({gz_path.stat().st_size // (1024*1024)} MB)")
            except Exception as e:
                print(f"[builder] failed to write gzip: {e}")
    finally:
        try:
            zp.unlink()
        except Exception:
            pass


if __name__ == "__main__":
    build_static_db()
