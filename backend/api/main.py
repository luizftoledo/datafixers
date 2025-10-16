from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parents[1] / "db" / "ibama.db"

app = FastAPI(title="Datafixers IBAMA Search API", version="0.1.0")

# CORS: allow Datafixers domain and common local dev origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://datafixers.org",
        "https://www.datafixers.org",
        "http://datafixers.org",
        "http://www.datafixers.org",
        "http://127.0.0.1:8000",
        "http://localhost:8000",
        "http://127.0.0.1:5500",
        "http://localhost:5500",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


class SearchItem(BaseModel):
    id: int
    name: Optional[str]
    cpf: Optional[str]
    num_processo: Optional[str]


class SearchResponse(BaseModel):
    total: int
    page: int
    page_size: int
    results: List[SearchItem]


@app.get("/health")
def health():
    exists = DB_PATH.exists()
    size = DB_PATH.stat().st_size if exists else 0
    return {"db_exists": exists, "db_size": size}


def build_name_query(name: str) -> str:
    # Convert user input into FTS5 prefix query: each token as token*
    tokens = [t.strip() for t in name.split() if t.strip()]
    if not tokens:
        return ""
    # Join with AND: token1* token2* => matches rows containing all prefixes
    return " ".join([f"{t}*" for t in tokens])


@app.get("/search", response_model=SearchResponse)
def search(
    name: Optional[str] = Query(None, description="Nome do autuado/infrator"),
    cpf: Optional[str] = Query(None, description="CPF/CNPJ do infrator"),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=200),
):
    where_clauses = []
    params: list = []
    use_fts = False

    if cpf:
        where_clauses.append("a.cpf = ?")
        params.append(cpf)

    join_clause = ""
    if name:
        match = build_name_query(name)
        if match:
            use_fts = True
            join_clause = "JOIN autos_fts f ON f.rowid = a.id"
            where_clauses.append("f.name MATCH ?")
            params.append(match)

    where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

    base_sql = f"""
        FROM autos a
        {join_clause}
        {where_sql}
    """

    count_sql = f"SELECT COUNT(1) {base_sql}"
    data_sql = f"SELECT a.id, a.name, a.cpf, a.num_processo {base_sql} ORDER BY a.id LIMIT ? OFFSET ?"

    offset = (page - 1) * page_size

    with get_conn() as conn:
        cur = conn.cursor()
        total = cur.execute(count_sql, params).fetchone()[0]
        rows = cur.execute(data_sql, [*params, page_size, offset]).fetchall()

    results = [SearchItem(**dict(r)) for r in rows]
    return SearchResponse(total=total, page=page, page_size=page_size, results=results)
