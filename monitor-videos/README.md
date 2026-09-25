# Monitor de publicações em vídeo

Painel em `https://datafixers.org/monitor-videos/`. O catálogo (`videos.json`) reúne os vídeos incorporados no portfólio e os resultados da busca inicial por “luiz fernando toledo” no canal BBC News Brasil em 25/09/2026. IDs duplicados aparecem uma vez.

## Ativar a coleta

Configure dois secrets no repositório `luizftoledo/datafixers`:

- `YOUTUBE_API_KEY`: chave de projeto com a YouTube Data API v3 habilitada.
- `APIFY_TOKEN`: token da conta Apify. A coleta usa `apify/instagram-reel-scraper` e `apify/instagram-comment-scraper`, sujeitos à cobrança e à disponibilidade dos dados públicos.

Depois execute o workflow **Atualizar monitor de vídeos** em GitHub Actions uma vez. Ele coleta métricas diariamente às **08:17 UTC**, grava o histórico em `data.json` e publica a página no Cloudflare Pages. Às **segundas-feiras, 09:17 UTC**, também procura novos vídeos publicados nos últimos 14 dias no canal da BBC News Brasil no YouTube e Reels da conta `@bbcbrasil` no Instagram. Adiciona ao catálogo apenas vídeos cuja descrição do YouTube ou legenda do Instagram contenha “Luiz Fernando Toledo”, sem duplicar IDs, e coleta suas métricas na mesma execução. A execução manual faz a busca semanal por padrão. Se apenas uma fonte tiver credencial, o workflow ainda registra os dados dessa fonte e mostra a ausência da outra no painel. Sem nenhuma fonte, a execução falha sem alterar o histórico.

Para executar localmente: `YOUTUBE_API_KEY=... APIFY_TOKEN=... python3 scripts/update_video_monitor.py`. Passe as chaves pelo ambiente, nunca pelo código ou `data.json`.

## Definições e limites

- O histórico começa na primeira coleta. Não há série diária retroativa.
- Os valores são contadores públicos acumulados. A variação é a diferença entre snapshots, que pode ser negativa após correções da plataforma.
- YouTube: `statistics.viewCount`, `likeCount`, `commentCount`; até 300 comentários principais mais recentes por vídeo via `commentThreads.list`. Respostas não entram na fila.
- Instagram: curtidas e comentários públicos dos Reels; reproduções (`videoPlayCount`) ou, se ausentes, visualizações (`videoViewCount`). O ator de comentários consulta até 20 comentários por URL por execução. Dados podem ser incompletos ou indisponíveis.
- A descoberta semanal verifica descrições e legendas públicas, não o áudio nem transcrições. Ela não garante encontrar todos os vídeos, especialmente se forem publicados sem o nome completo, em outra conta ou fora da janela de 14 dias.
- A fila identifica como novos os comentários **vistos pela primeira vez na coleta**, exceto o conjunto inicial de cada vídeo, marcado como linha de base. Não representa todos os comentários publicados naquele dia.
- O painel é público e marcado `noindex`. Comentários, nomes de usuário e textos capturados ficam no JSON público. Se for necessário acesso privado, a rota deverá receber proteção de acesso antes da ativação da coleta.
