# Polymarket ≠ Pesquisa — pauta + plano de raspagem

Pauta do datafixers (Luiz / Caio) sobre a confusão recorrente entre **Polymarket** e **pesquisa de intenção de voto** que tem viralizado no X.

---

## 1. O argumento da matéria

### Como o Polymarket funciona

- Mercado de apostas em **contratos binários** ("X vai vencer? Sim / Não"), liquidados em USDC (stablecoin).
- O **preço do contrato (0–1)** é tratado coloquialmente como "probabilidade".
- Operado pela Polymarket Inc., com restrições legais em diversas jurisdições (incluindo EUA pra residentes a partir de 2022, e Brasil sem regulação clara). Pra participar, é preciso carteira cripto e, em muitos casos, VPN.
- Existe concorrente: **Kalshi** (regulado pela CFTC nos EUA, com contratos em dólar fiat).

### Por que NÃO é pesquisa

| Pesquisa de opinião (Datafolha, Quaest, Ipec, AtlasIntel…) | Polymarket |
|---|---|
| Amostragem **probabilística** (~2.000 entrevistados estratificados) | **Autosseleção** de quem aposta |
| Plano amostral, questionário e margem de erro **públicos** | Sem metodologia auditável |
| **Registro obrigatório** no TSE em ano eleitoral (BR) | Sem regulação eleitoral |
| Mede **intenção de voto** | Mede **disposição a apostar dinheiro** em um resultado |
| Margem de erro estatística calculável | "Preço" depende de liquidez, viés do apostador e hedging |

### Por que **não vale como previsão confiável**

- **Viés do apostador**: público é majoritariamente masculino, jovem, anglófono, com cripto e ideologicamente enviesado. Estudos do ciclo americano de 2024 (ex.: Aaron Strauss / Justin Wolfers) documentaram viés pró-Trump persistente entre traders.
- **Baixa liquidez é manipulável**: mercados pequenos podem ser movidos por um único whale. Caso emblemático: o francês "Théo" apostando ~US$ 30M pró-Trump em 2024 distorceu o preço durante semanas.
- **Preço ≠ probabilidade objetiva**: é o ponto onde oferta e demanda se cruzam — afetado por liquidez, custo de capital, hedge e até pelo próprio uso narrativo do mercado.
- **Mercados brasileiros têm liquidez baixíssima** em comparação aos americanos, amplificando todos os problemas acima.

### Por que então **as pessoas estão enlouquecendo**

- Acertou Trump 2024 (mas pesquisas tradicionais também acertaram — AtlasIntel, Selzer/DMR no Iowa, etc.).
- Narrativa de "skin in the game" vende mais que metodologia.
- Algoritmo do X amplifica conteúdo agregador e visual (prints de gráficos do Polymarket).
- Vácuo informacional: pesquisa eleitoral oficial só sai mais próximo das eleições; Polymarket "roda" 24/7.
- Influenciadores e até jornalistas têm reproduzido como se fosse fonte autoritativa.

### O que a matéria precisa entregar

1. Explicar o mecanismo (com exemplo numérico).
2. Mostrar **com dados** que isso virou hábito no X-BR.
3. Mostrar **exemplos reais** (com print) de tweets enquadrando Polymarket como pesquisa.
4. Comparar visibilidade Polymarket vs. institutos tradicionais no X.
5. Caixa lateral: casos em que Polymarket errou ou foi manipulado.
6. Falas de especialistas (sugestão: CESOP-Unicamp, economista comportamental, e talvez Felipe Nunes/Quaest pra resposta de instituto).

---

## 2. Plano de raspagem do X

### Hipóteses testáveis

| # | Hipótese | Como o dado testa |
|---|---|---|
| H1 | Menções a Polymarket no X-BR cresceram muito desde 2024 | série temporal mensal |
| H2 | Posts enquadram Polymarket como pesquisa ("aponta", "prevê", "segundo o…") | regex no texto + amostra qualitativa |
| H3 | Influenciadores políticos e jornalistas amplificam | top-N por engajamento + classificação de perfil |
| H4 | Polymarket disputa atenção com institutos tradicionais | volume e engajamento Polymarket × Datafolha/Quaest/Ipec/Atlas |
| H5 | Quando Polymarket diverge da pesquisa, quem ganha mais alcance | recortes por evento |

### Escopo

- **Idioma:** PT (com checagem manual de PT-BR vs. PT-PT)
- **Janela:** **2024-01-01 → hoje** (ciclo eleitoral americano + pré-campanha brasileira 2026)
- **Queries:** ver `queries.yaml` (cinco grupos: `polymarket_generico`, `polymarket_framing_pesquisa`, `polymarket_eleicao_br`, `kalshi_comparacao`, `institutos_tradicionais`)
- **Limite por termo:** 1.000 tweets por padrão (ajustável via flag `--max-items`)

### Ferramenta

**Apify — actor `apidojo/tweet-scraper`**. Custo aprox. **US$ 0,40 / 1k tweets**.

Estimativa pro escopo completo: 15–25 termos × 1.000 = **US$ 6 a US$ 30** (subir o cap pra 5.000/termo se quiser cobertura mais densa em meses de pico).

### Campos coletados (normalizados pra CSV)

`query_group, query_term, tweet_id, url, created_at, lang, text, author_handle, author_name, author_followers, author_following, author_verified, author_blue, author_bio, likes, retweets, replies, quotes, views, bookmarks, is_reply, is_quote, is_retweet, hashtags, mentions, media_urls`

### Pipeline

1. **Coleta** — `scrape_x.py` dispara um run por termo, polleia status, baixa o dataset, normaliza, salva.
2. **Saída bruta** — `data/raw/<grupo>__<query>.jsonl` (uma linha JSON por tweet, sem perder nada do retorno do Apify).
3. **Saída consolidada** — `data/processed/all_tweets.csv`, deduplicada por `tweet_id`, com colunas `query_group` e `query_term` pra rastrear procedência.
4. **Análise (próxima etapa, fora deste pacote)** — notebook Jupyter pra gerar:
   - linha temporal de menções,
   - top 20 contas por engajamento,
   - barras Polymarket × institutos,
   - regex de framing ("aponta|prevê|mostra|indica|segundo o|de acordo com o polymarket"),
   - amostra estratificada por engajamento pra classificação manual.

### Entregáveis pra reportagem

- **Gráfico:** menções mensais Polymarket vs. agregado dos institutos (Datafolha+Quaest+Ipec+Atlas+Ipespe).
- **Tabela:** top 20 amplificadores de Polymarket no X-BR (por views/likes).
- **Quadro:** 6–10 prints de tweets enquadrando Polymarket como pesquisa.
- **Dataset publicado** no GitHub do datafixers (transparência metodológica é princípio do projeto).

### Limitações a declarar na matéria

- X bloqueou parte da busca histórica em 2023 — pode haver subcontagem em meses antigos.
- Tweets deletados não voltam.
- Bots e amplificação artificial inflam métricas — vamos sinalizar perfis suspeitos (poucos seguidores + alta frequência).
- Coleta é do **X público**; não cobre DMs, Spaces, Communities fechadas.
- Análise não pretende dizer "Polymarket está sempre errado" — pretende mostrar que **não é pesquisa** e que está sendo tratado como tal.

---

## 3. Como executar

Ver `README.md`.
