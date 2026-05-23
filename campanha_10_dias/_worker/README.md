# campanha-stats — Worker de telemetria

Recebe eventos do jogo `Campanha 10 dias` e:
1. Armazena cada evento em Cloudflare KV (60 dias de retenção)
2. Envia alerta no Telegram em `game_start`, `game_end`, `pagehide` (após D2)

Privado — só você recebe.

## Setup

```bash
cd campanha_10_dias/_worker
npm install -g wrangler   # se ainda não tiver
wrangler login

# Criar KV namespace
wrangler kv:namespace create ANALYTICS
# Cole o ID retornado em wrangler.toml em `id =`

# Criar bot no @BotFather, pegar TOKEN
# Mandar /start no bot pelo seu Telegram, pegar chat_id em:
#   https://api.telegram.org/bot<TOKEN>/getUpdates
wrangler secret put TG_TOKEN     # cola o token
wrangler secret put TG_CHAT      # cola seu chat_id (numérico)
wrangler secret put OWNER_KEY    # chave secreta para acessar /dashboard

# Deploy
wrangler deploy
```

## Custom domain

No dashboard do Cloudflare: Workers > campanha-stats > Triggers > Custom Domains.
Adicionar `campanha-stats.datafixers.org` (precisa do datafixers.org com Cloudflare).

Alternativa: usar a URL `https://campanha-stats.<seuuser>.workers.dev` e atualizar `TELEMETRY.endpoint` no `index.html` do jogo.

## Eventos enviados

| ev | quando |
|---|---|
| `page_loaded` | abrir página |
| `game_start` | clicar COMEÇAR |
| `day_start` | início de cada dia |
| `action` | cada ação executada |
| `game_end` | fim do jogo (vitória/derrota/cassação/2T) |
| `pagehide` | fechar página |

## Dashboard

`https://campanha-stats.datafixers.org/dashboard?key=<OWNER_KEY>`

Mostra lista bruta de sessões. Pra mais dashboards, expandir `renderDashboard()`.
