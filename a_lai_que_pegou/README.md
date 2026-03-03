# A LAI que pegou

Página: [https://datafixers.org/a_lai_que_pegou/](https://datafixers.org/a_lai_que_pegou/)

## Como a atualização funciona

A curadoria é atualizada por script em `scripts/update_curation.py`.

O script:

1. Busca novos links nos feeds configurados em `data/feed_sources.json`.
2. Remove duplicatas e limpa URLs com redirecionamento/tracking.
3. Atualiza:
   - `data/feeds.json` (lista de reportagens)
   - `data/featured.json` (destaques automáticos)
   - `data/academics.json` (lista acadêmica)
   - `data/meta.json` (resumo da execução)

## Rodar manualmente

```bash
python a_lai_que_pegou/scripts/update_curation.py
```

## Automação no GitHub

Workflow: `.github/workflows/update_lai_curation.yml`

- Execução diária (cron)
- Também pode ser disparado por `workflow_dispatch`
- Faz commit automático somente quando houver atualização dos arquivos de dados
