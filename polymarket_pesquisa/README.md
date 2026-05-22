# polymarket_pesquisa

Raspagem one-shot do X pra pauta **"Polymarket não é pesquisa"**. Veja `PLAN.md` pro contexto editorial e a justificativa metodológica.

## Setup

```bash
cd polymarket_pesquisa
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
```

> **Onde rodar.** Este script precisa chamar `api.apify.com`. O ambiente "Claude Code on the web" tem allowlist de rede e bloqueia esse host por padrão — rode **localmente na sua máquina** ou em qualquer servidor com saída pra internet aberta.

## Credencial Apify

Crie conta em https://console.apify.com e pegue o token em **Settings → Integrations → API tokens**. O actor usado é `apidojo/tweet-scraper` (https://apify.com/apidojo/tweet-scraper) — cobra **US$ 0,40 por 1.000 tweets**.

```bash
export APIFY_TOKEN=apify_api_xxxxxxxxxxxxxxxxxxxx
```

## Rodar

```bash
# 1) Sempre faça um dry-run antes pra ver quantos runs vão sair
python scrape_x.py --dry-run

# 2) Coleta completa (todos os grupos do queries.yaml, 1000 tweets/termo)
python scrape_x.py

# 3) Só um grupo, com cap maior
python scrape_x.py --group polymarket_eleicao_br --max-items 5000

# 4) Tweets de maior engajamento, em vez de mais recentes
python scrape_x.py --sort Top
```

## Saída

```
data/
├── raw/
│   ├── polymarket_generico__polymarket.jsonl
│   ├── polymarket_framing_pesquisa__polymarket__aponta_or_preve_or...jsonl
│   ├── institutos_tradicionais__datafolha.jsonl
│   └── ...
└── processed/
    └── all_tweets.csv      # consolidado, deduplicado por tweet_id
```

O CSV tem `query_group` e `query_term` em cada linha, então dá pra cruzar com pandas direto.

## Editar o escopo

Tudo em `queries.yaml`:
- `start_date` / `end_date` — janela temporal
- `groups.<nome>.lang` — idioma (use `pt` pra pegar PT-BR + PT-PT)
- `groups.<nome>.terms` — lista de queries (sintaxe Twitter Advanced Search)

## Custo estimado

Com a config padrão (≈20 termos × 1.000 tweets), gasto fica em torno de **US$ 8**. Subindo cap pra 5.000/termo, vai a **US$ 40**. O script imprime estimativa antes de começar.

## Próxima etapa (fora deste pacote)

Análise: notebook Jupyter pra gerar a série temporal, top contas, comparação Polymarket × institutos, e amostra estratificada pra classificação manual de framing. Quando aprovar o dataset, abre-se a próxima task.
