from html import escape
from pathlib import Path
import json
import hashlib

OUT = Path(__file__).with_name('index.html')

# Comentários públicos do post do Clube Caixeiral de Pelotas no Facebook,
# incluindo as duas respostas. Captura de 24/09/2026.
comments = [
    ('Maria Elizabeth Natale', 'Que ele descanse na paz do Senhor!!! 🙏🙏🙏', False),
    ('Astrid Goncalves', 'Tristeza infinita 🌹', False),
    ('Glades Valerio', 'Meus sentimentos aos familiares e amigos.', False),
    ('Dioneia Eduardo', 'Sentimentos a família e amigos.', False),
    ('Alvaro Nilton Mendes Silva', 'Sentimentos e solidariedade a família . Um grande ser humano!', False),
    ('Edir Godinho', 'Que faça a travessia em Paz. Sentimentos a família e amigos.', False),
    ('Ivo Martins', 'Meus sentimentos', False),
    ('Nilza Lislei Möller', 'Meus sentimentos aos familiares e amigos', False),
    ('Juliana Santos', 'Vá em paz seu Zé Maria, meus sentimentos aos filhos, netos e de mais parentes... Meus sentimentos Bahia e tia Ana Maria Santos e Mariana Hallal', False),
    ('Elisa Bartz', 'Meus sentimentos!', False),
    ('Getúlio Dos Santos Diniz', 'Elisa Bartz 🌹', True),
    ('Getúlio Dos Santos Diniz', 'Elisa Bartz ,🌹', True),
    ('Solano Almeida Vargas', 'Sentimentos. Pêsames a família enlutada. Solano Almeida Vargas.', False),
    ('Fabiane Galeão', 'Meus sentimentos a toda família e amigos', False),
    ('Neuza NobreBellomo', 'Que deus de  forças  e resignação,  a seus familiares e amigos e descanso eterno, a ele!', False),
    ('Sinda Silva', 'Meus sentimentos', False),
    ('Janine Dorow Couto', 'Sentimentos a família!', False),
    ('Igor Pena', 'Meus Pêsames! Não há jovem que o substitua.', False),
    ('Julia Zwahr', 'Meus sentimentos a família e amigos!', False),
    ('Paulo Bessa Gotuzzo', 'Meu sentimento aos familiares e amigos', False),
    ('Cerley Silva', 'Meus sentimentos 😔', False),
    ('Clenir Ione Pereira', 'Meus sentimentos aos familiares.', False),
    ('Ângela Treptow Sapper', 'Grande perda para Pelotas! Sentimentos aos familiares.', False),
    ('Alemão Carrett', 'Meus sentimentos aos familiares!!', False),
    ('Lauro Prates', 'Meu  pesar sentimentos', False),
    ('Ana Maria Cardoso Domingues', 'Meus sentimentos aos familiares e que Deus conforte o coração de todos.', False),
    ('Jorge Braga', 'Meus sentimentos aos familiares e amigos. Que a passagem seja em paz', False),
    ('Getúlio Dos Santos Diniz', 'Meus sentimentos aos familiares e amigos 💗🌹🙏🏻', False),
    ('Antonia Gelcirs Moreira Candia Gonçalves', 'Meus sentimentos a todos os familiares e amigos 😅😥💔', False),
    ('Maria Do Carmo', 'Meus sentimentos', False),
    ('Marly Raff', 'Meus sentimentos a todos familiares', False),
    ('Francisco Rodrigues Rodrigues Briao', 'Meus sentimentos aos amigos e familiares', False),
    ('Mariza Allende', 'Meus sentimentos  a família!', False),
    ('Maria Lucilia Costa', 'Meus pêsames  a toda a família,  que Deus o receba em Seu reino de amor.', False),
    ('Verinha Silveira', 'Meus sentimentos que ele descanse na paz do Senhor 🙏🙏🙏🙏', False),
    ('Tanyra Maraninchy', 'Que Deus lhe dê o descanso eterno', False),
    ('Cleo Da Conceição', 'Meus sentimentos', False),
    ('Claudia Rangel', 'Meus sentimentos a família e amigos', False),
]

facebook_url = 'https://www.facebook.com/clube.caixeiral.pelotas/posts/pfbid02KE7zcCLeocFSS8B6ugdcmaaCNUsWPBCV3RvrhtBjNtdmtg6ovqS5sdVeRWSwc7zwl'
club_instagram = 'https://www.instagram.com/p/Ddo2SLtRXNO/'
house_instagram = 'https://www.instagram.com/p/Ddo29QtiFqy/'
hora_instagram = 'https://www.instagram.com/ahoradosul/p/DdogKbBFsLH/'
hora_fb_main = 'https://www.facebook.com/ahoradosul/posts/pfbid02JjQ6vtqveGpqPRebTTaxKKsYe7GdYreUo35UWHvjCGhtSasFrScVsQ6eDyt5SSGcl'
hora_fb_link = 'https://www.facebook.com/ahoradosul/posts/pfbid0DryxU1zuK37UVzmGs8Qfh3WXDxLHyPGGF9rN6cRi7PAGwA2ZA8zmDGRU32qwZkfSl'
espeto_url = 'https://espetocorrido.com.br/luto-72/'
group_url = 'https://www.facebook.com/groups/2733586010195934/posts/4654538318100684/'
radio_url = 'https://www.facebook.com/radiotupanci/posts/pfbid035dJ8aLdTbhjBmhqgZdj35wWeY1dJNLXcYhXzi46dKfnpRA9JjiyA1FS6esTiw1NPl'
governor_url = 'https://x.com/EduardoLeite_/status/2102783199734644976'
mdb_url = 'https://mdb-rs.org.br/?publicacao=mdb_rs_lamenta_falecimento_do_emedebista_jose_maria_carvalho_da_silva-25802'

highlights = [
    ('Eduardo Leite · governador do RS',
     'Recebi com profundo pesar a notícia da morte do professor e ex-prefeito de Pelotas José Maria Carvalho da Silva, aos 91 anos. José Maria dedicou parte importante de sua vida ao serviço público e à educação. Vice-prefeito de Bernardo de Souza, assumiu a Prefeitura em 1987 e teve a responsabilidade de conduzir os destinos da nossa cidade em um período marcante de sua história. Como governador e, especialmente, como alguém que também teve a honra de ser prefeito de Pelotas, reconheço o valor de sua contribuição à vida pública do município e o compromisso que demonstrou com a comunidade pelotense. Neste momento de despedida, manifesto minha solidariedade aos familiares e amigos. Que encontrem conforto nas lembranças e no legado que ele deixa para Pelotas.', governor_url),
    ('MDB-RS · nota de pesar',
     'O Diretório Estadual lamentou a morte do ex-prefeito, destacou sua contribuição para Pelotas e para o Rio Grande do Sul e manifestou solidariedade a familiares, amigos e à comunidade pelotense.', mdb_url),
    ('Prefeitura de Pelotas · luto oficial',
     'O prefeito Fernando Marroni decretou três dias de luto oficial pela morte de José Maria Carvalho da Silva. A Prefeitura se solidarizou com a família e agradeceu os serviços prestados por ele.',
     'https://www.jornaltradicao.com.br/pelotas/geral/morre-aos-91-anos-o-ex-prefeito-de-pelotas-jose-maria-carvalho-da-silva/'),
    ('Casa de Cultura de Pelotas · homenagem',
     'A entidade homenageou José Maria como Embaixador da Cultura Pelotense e destacou sua atuação na promoção do patrimônio cultural e da identidade da cidade.', house_instagram),
    ('Clube Caixeiral de Pelotas · homenagem',
     'O clube lamentou a morte de seu ex-dirigente e ressaltou suas contribuições à preservação das tradições e à vida social e cultural da instituição.', club_instagram),
]

media = [
    ('A Hora do Sul', 'O veículo publicou a notícia do falecimento e registrou a trajetória de José Maria na Prefeitura, no BRDE, na educação e no Clube Caixeiral.', 'https://ahoradosul.com.br/conteudos/2026/09/23/morre-jose-maria-carvalho-ex-prefeito-de-pelotas/'),
    ('GZH Zona Sul', 'O jornal noticiou a morte, apresentou a trajetória do ex-prefeito e informou sobre o luto oficial de três dias decretado pelo município.', 'https://gauchazh.clicrbs.com.br/zona-sul/geral/noticia/2026/09/ex-prefeito-de-pelotas-jose-maria-carvalho-da-silva-morre-aos-91-anos-cmued0ata00yo013eoy7b8tfp.html'),
    ('Jornal Tradição', 'O veículo registrou a atuação de José Maria como engenheiro, professor, político e dirigente do Clube Caixeiral, além do decreto municipal de luto.', 'https://www.jornaltradicao.com.br/pelotas/geral/morre-aos-91-anos-o-ex-prefeito-de-pelotas-jose-maria-carvalho-da-silva/'),
    ('Diário da Manhã', 'O jornal publicou a notícia da morte e reproduziu a manifestação de pesar do governador Eduardo Leite.', 'https://www.diariodamanhapelotas.com.br/morre-o-ex-prefeito-jose-maria-carvalho-da-silva'),
]

instagram_comments = [
    ('elkearagon', 'Muito triste, o Zé foi um grande homem', 'https://www.instagram.com/p/Ddo2SLtRXNO/c/17901083643657367/'),
    ('mariaarzelinda', 'Meus sentimentos à família. 😢', 'https://www.instagram.com/p/Ddo2SLtRXNO/c/18179217067386310/'),
    ('helenarapeirano', 'Meus sentimentos aos familiares!', 'https://www.instagram.com/p/Ddo2SLtRXNO/c/18076156217712432/'),
    ('humbertomoralescavalcanti', '❤️❤️❤️❤️❤️❤️❤️❤️', 'https://www.instagram.com/p/Ddo29QtiFqy/c/18109046588267210/'),
    ('maneka_osorio', '❤️🙏🏻', 'https://www.instagram.com/p/Ddo29QtiFqy/c/18563159215075964/'),
]

sources = [
    ('Eduardo Leite · X', governor_url),
    ('MDB-RS · nota oficial', mdb_url),
    ('Clube Caixeiral · Facebook', facebook_url),
    ('Clube Caixeiral · Instagram', club_instagram),
    ('Casa de Cultura de Pelotas · Instagram', house_instagram),
    ('Jornal Tradição · luto oficial', 'https://www.jornaltradicao.com.br/pelotas/geral/morre-aos-91-anos-o-ex-prefeito-de-pelotas-jose-maria-carvalho-da-silva/'),
    ('A Hora do Sul · notícia e foto', 'https://ahoradosul.com.br/conteudos/2026/09/23/morre-jose-maria-carvalho-ex-prefeito-de-pelotas/'),
    ('GZH Zona Sul · notícia', 'https://gauchazh.clicrbs.com.br/zona-sul/geral/noticia/2026/09/ex-prefeito-de-pelotas-jose-maria-carvalho-da-silva-morre-aos-91-anos-cmued0ata00yo013eoy7b8tfp.html'),
    ('GZH · publicação no X', 'https://x.com/gzhdigital/status/2102818017805832433'),
    ('Diário da Manhã · manifestação de Eduardo Leite', 'https://www.diariodamanhapelotas.com.br/morre-o-ex-prefeito-jose-maria-carvalho-da-silva'),
    ('A Hora do Sul · Instagram', hora_instagram),
    ('A Hora do Sul · Facebook, notícia principal', hora_fb_main),
    ('A Hora do Sul · Facebook, link da reportagem', hora_fb_link),
    ('Espeto Corrido · comentários', espeto_url),
    ('Antiga Pelotas · Facebook', group_url),
    ('Rádio Tupanci · Facebook', radio_url),
]

# Comentários adicionais carregados diretamente na publicação do Instagram.
# Os primeiros 15 estão no resultado do Apify; IDs abaixo foram conferidos na interface em 24/09/2026.
instagram_extra = [
    ('osvaldoduartejunior', 'Meus sentimentos a todos os familiares 🙌🏿', '18117467959939939'),
    ('belmarvargashairdesign', 'Meus sentimentos a família, deixa um história de muito lavor .', '18094480610407919'),
    ('bonat.marisa', 'Meus sentimentos aos familiares! 😔', '18029234102903234'),
    ('selomarblodorn', 'Sentimentos a toda família 🙌', '17949239898051319'),
    ('lucinha.schlee', 'Sentimentos aos familiares e amigos 😢', '18371631628211182'),
    ('professoraclaudia11888', 'Meus sentimentos aos familiares e amigos.', '17912012826526722'),
    ('iolandanascente', 'Sentidos pêsames aos familiares e amigos', '18165184483430745'),
    ('zoraiamorales', 'Sentimentos a família e amigos.', '17874194499633571'),
    ('vivianesantos75', 'Meus sentimentos a família.', '18106068122077612'),
    ('simonegomiz', 'Meus sentimentos😢😢😢😢', '18144654808563931'),
    ('ernestoalme', 'Meus Sentimentos aos familiares e amigos 🙌', '18111014630600880'),
    ('norisfurtado', 'Meus sentimentos aos familiares e amigos.', '18115336654804828'),
    ('silviarbenites', 'Meus sentimentos a família! Que Deus os conforte!', '18017832683929311'),
    ('angelica.brusamarello', 'Meus sentimentos aos familiares e amigos', '17910243735549513'),
    ('cleber.ggoularte', 'Meus sentimentos a todos os familiares', '18106228700190794'),
    ('ffabianoconsultoria', 'Meus Sentimentos a Toda Família e Verdadeiros Amigos! Forte Abraço FFABIANO', '18615700060013279'),
    ('lori_zimpel', 'Sentimentos a Família .', '18085958222279578'),
    ('ricardo.rosa.7921', '🙏🙌🙏', '18029317946887776'),
    ('elisabetegdutra', 'Meus sentimentos aos familiares e amigos.', '18105663947625576'),
    ('fatima_celente', 'Nossos sentimentos', '18338942683258470'),
    ('ioniramallo', 'Meus sentimentos a família !', '18147626455501851'),
    ('marciacosta2815', '😢', '18075552380718756'),
    ('professoraclaudia11888', '😢😢😢😢😢😢', '17956113636018277'),
    ('isadora.marengo', '😢😢', '18624186808058165'),
    ('mariadagraca3582', 'Sentimentos aos Familiares', '18136972360545073'),
    ('fonsecaelizabethe', 'Deus abençoe amém', '18089193473215150'),
    ('pedro.trindade.718', 'Sentimentos aos familiares', '18102341411350782'),
    ('dmvet65', '🙌🙌🙌🔥🔥👏👏😢😢PÊSAMES A FAMILIA / ❤️🔥👏 QUE DESCANSE NA PAZ DE DEUS❤️❤️🙌🙌🙌👏👏😢😮😮😮😮😮😮😮😮😮😮😮😮😮😮😮😮😮😮😮😮😮😮😮😮😮😮', '18143279368541663'),
    ('mariavitorinasilva', '😢😢😢', '18101213135181014'),
    ('marilindarosario', '😢😢😢', '17911209204501021'),
    ('pauloluzdossantos', '😢', '18114193484009615'),
    ('sibilladieckmann', '😢', '18152496592478174'),
]

voices = [tuple(row) for row in json.loads(OUT.with_name('comments_data.json').read_text(encoding='utf-8'))]

# Recordações com detalhes pessoais abrem a nuvem; as demais conservam a
# distribuição estável, independente da ordem em que foram coletadas.
featured_order = [
    'Paulo Souza',
    'Joel Rocha',
    'humbertomoralescavalcanti',
    'Luiz Antonio Ribeiro Medeiros',
    'Ari DA Silva Caldeira',
    'Ruthe Nudilemom Peters',
    'Vilmar Canez',
    'Luiz Carlos Gautério Pinheiro',
    'Volne Dilli',
    'Geraldo Bohns',
    'Eduardo Krüger',
    'Mara Fredes',
    'Rubisnei Fonseca',
    'Maria Alice Herrmann',
]
featured_rank = {name: rank for rank, name in enumerate(featured_order)}
def voice_rank(voice):
    author, message, url, *_ = voice
    rank = featured_rank.get(author, len(featured_order))
    if author == 'humbertomoralescavalcanti' and 'grande amigo do meu pai' not in message:
        rank = len(featured_order)
    return rank, hashlib.sha1((author + message + url).encode()).hexdigest()

voices.sort(key=voice_rank)


def voice_card(author, message, url, source, reply=False, official=False, exact_quote=True, featured=False):
    digest = int(hashlib.sha1((author + message + url).encode()).hexdigest()[:4], 16)
    rot = (digest % 5) - 2
    long = len(message) > 95
    size = 'large' if official or long else ('tiny' if len(message) < 25 else 'medium')
    kind = ' official' if official else ' voice'
    if featured:
        kind += ' featured'
    label = 'Manifestação integral' if official and exact_quote else ('Síntese da manifestação' if official else source)
    if official and exact_quote:
        excerpt = 'Recebi com profundo pesar a notícia da morte do professor e ex-prefeito de Pelotas José Maria Carvalho da Silva, aos 91 anos. José Maria dedicou parte importante de sua vida ao serviço público e à educação.'
        return (f'<details class="bubble large official governor"><summary>'
                f'<span class="bubble-kicker">Eduardo Leite · governador do RS</span>'
                f'<span class="bubble-text excerpt">{escape(excerpt)}</span>'
                f'<span class="read-more closed">Leia a manifestação completa ↓</span>'
                f'<span class="read-more opened">Recolher manifestação ↑</span></summary>'
                f'<p class="full-message">{escape(message)}</p>'
                f'<a class="official-origin" href="{escape(url, quote=True)}" target="_blank" rel="noopener noreferrer">Publicação original ↗</a></details>')
    return (f'<a class="bubble {size}{kind}" style="--tilt:{rot}deg" href="{escape(url, quote=True)}" target="_blank" rel="noopener noreferrer" '
            f'aria-label="{escape(author, quote=True)}: {escape(message, quote=True)}. Abrir fonte">'
            f'<span class="bubble-kicker">{escape(label)}</span>'
            f'<span class="bubble-text">{escape(message)}</span>'
            f'<span class="bubble-author">{escape(author)} <span aria-hidden="true">↗</span></span></a>')

cards = []
official_positions = {3: 0, 20: 1, 45: 2, 90: 3, 135: 4}
for idx, voice in enumerate(voices):
    if idx in official_positions:
        author, message, url = highlights[official_positions[idx]]
        cards.append(voice_card(author, message, url, '', official=True, exact_quote=official_positions[idx] == 0))
    cards.append(voice_card(*voice, featured=idx < len(featured_order)))
cloud_html = '\n'.join(cards)
source_links = '\n'.join(f'<li><a href="{escape(u, quote=True)}" target="_blank" rel="noopener noreferrer">{escape(label)} <span aria-hidden="true">↗</span></a></li>' for label, u in sources)

OUT.write_text(f'''<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#f5f0e8">
  <title>José Maria Carvalho da Silva · Vozes</title>
  <style>
    * {{ box-sizing: border-box; }}
    html {{ background: #f5f0e8; scroll-behavior: smooth; }}
    body {{ margin: 0; color: #302927; font: 16px/1.45 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }}
    .shell {{ max-width: 1300px; margin: auto; padding: 24px 24px 80px; }}
    .hero {{ text-align: center; padding: 18px 0 34px; }}
    .hero img {{ display: block; width: min(100%, 640px); aspect-ratio: 1024/612; object-fit: cover; margin: auto; border-radius: 22px; box-shadow: 0 18px 46px #4e302b24; }}
    .eyebrow {{ margin: 30px 0 7px; color: #806953; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: .19em; }}
    h1 {{ margin: 0; font: 600 clamp(30px, 4vw, 54px)/1.05 Georgia, 'Times New Roman', serif; letter-spacing: -.03em; }}
    .subtitle {{ margin: 12px 0 0; color: #74685f; font-size: 15px; }}
    .count {{ display: inline-block; margin-top: 20px; padding: 8px 16px; border: 1px solid #b49a7c; border-radius: 99px; color: #74513e; font-size: 13px; font-weight: 700; letter-spacing: .03em; }}
    .cloud {{ display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 12px; padding: 12px 0 55px; }}
    .bubble {{ display: flex; flex-direction: column; justify-content: center; flex: 0 1 auto; width: 245px; min-height: 105px; padding: 17px 20px; border: 1px solid #e5dcd0; border-radius: 30px 30px 24px 30px; background: #fffefa; color: inherit; text-decoration: none; box-shadow: 0 3px 12px #60452e0b; transform: rotate(var(--tilt)); transition: transform .18s ease, box-shadow .18s ease; overflow-wrap: anywhere; }}
    .bubble:hover, .bubble:focus-visible {{ transform: translateY(-5px) rotate(0); box-shadow: 0 14px 30px #60452e24; outline: 2px solid #a67659; outline-offset: 2px; z-index: 2; }}
    .bubble:nth-child(7n + 2) {{ background: #f9e9df; border-color: #efd5c5; }}
    .bubble:nth-child(11n + 4) {{ background: #f3e5d3; border-color: #e8d2b8; }}
    .bubble:nth-child(13n + 5) {{ background: #eae8dc; border-color: #d8d6c4; }}
    .bubble.tiny {{ width: 176px; min-height: 94px; }}
    .bubble.medium {{ width: 260px; }}
    .bubble.large {{ width: 355px; min-height: 155px; }}
    .bubble.featured {{ background: #fff1df; border-color: #d9ad8f; box-shadow: 0 7px 23px #60452e19; }}
    .bubble.official {{ width: 430px; min-height: 180px; border-color: #72554a; background: #693f3d; color: #fff8ee; box-shadow: 0 10px 25px #57393430; transform: none; }}
    .bubble.official:nth-child(even) {{ background: #76513f; }}
    .bubble.official:hover, .bubble.official:focus-visible {{ transform: translateY(-5px); }}
    .governor {{ display: block; }}
    .governor summary {{ list-style: none; cursor: pointer; }}
    .governor summary::-webkit-details-marker {{ display: none; }}
    .governor summary:focus-visible {{ outline: 2px solid #f4d8bf; outline-offset: 4px; border-radius: 8px; }}
    .governor .full-message {{ margin: 15px 0 0; font: 500 16px/1.5 Georgia, 'Times New Roman', serif; }}
    .governor[open] .excerpt, .governor[open] .closed, .governor:not([open]) .opened {{ display: none; }}
    .read-more, .official-origin {{ display: inline-block; margin-top: 13px; color: #f0d8c9; font-size: 12px; font-weight: 700; }}
    .official-origin {{ text-decoration: underline; }}
    .bubble-kicker {{ display: block; margin-bottom: 8px; color: #927762; font-size: 10px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }}
    .bubble.official .bubble-kicker {{ color: #e6c7ac; }}
    .bubble-text {{ display: block; font: 500 16px/1.35 Georgia, 'Times New Roman', serif; }}
    .bubble.tiny .bubble-text {{ font-size: 16px; }}
    .bubble.large .bubble-text {{ font-size: 17px; }}
    .bubble.official .bubble-text {{ font-size: 17px; line-height: 1.45; }}
    .bubble-author {{ display: block; margin-top: 12px; color: #65584f; font-size: 12px; font-weight: 700; }}
    .bubble.official .bubble-author {{ color: #f0d8c9; }}
    .sources {{ max-width: 920px; margin: 30px auto 0; padding-top: 34px; border-top: 1px solid #d7c9bc; }}
    .sources h2 {{ margin: 0 0 16px; font: 600 28px Georgia, 'Times New Roman', serif; }}
    .sources ul {{ list-style: none; display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 10px 18px; margin: 0; padding: 0; }}
    .sources a {{ display: block; padding: 10px 13px; border-radius: 10px; background: #ebe4d9; color: #574537; font-size: 13px; text-decoration: none; }}
    .sources a:hover, .sources a:focus-visible {{ text-decoration: underline; }}
    .note {{ margin: 20px 0 0; color: #82766b; font-size: 12px; }}
    @media (max-width: 680px) {{ .shell {{ padding: 12px 12px 50px; }} .hero {{ padding-bottom: 22px; }} .hero img {{ border-radius: 14px; }} .cloud {{ gap: 9px; }} .bubble {{ max-width: 100%; width: calc(50% - 5px); padding: 13px 14px; border-radius: 20px; transform: none; }} .bubble.tiny, .bubble.medium {{ width: calc(50% - 5px); }} .bubble.large {{ width: 100%; }} .bubble.official {{ width: 100%; }} .bubble-text, .bubble.tiny .bubble-text {{ font-size: 14px; }} .bubble.large .bubble-text, .bubble.official .bubble-text {{ font-size: 16px; }} .sources ul {{ grid-template-columns: 1fr; }} }}
    @media (max-width: 350px) {{ .bubble, .bubble.tiny, .bubble.medium {{ width: 100%; }} }}
    @media (prefers-reduced-motion: reduce) {{ .bubble {{ transition: none; transform: none; }} }}
  </style>
</head>
<body>
  <main class="shell">
    <header class="hero">
      <img src="jose-maria.jpg" alt="José Maria Carvalho da Silva">
      <p class="eyebrow">Em memória</p>
      <h1>José Maria Carvalho da Silva</h1>
      <p class="subtitle">Pelotas · 23 de setembro de 2026 · uma cidade se despede</p>
      <span class="count">{len(voices)} comentários reunidos</span>
    </header>
    <section class="cloud" aria-label="Nuvem de comentários e manifestações">
{cloud_html}
    </section>
    <footer class="sources" aria-label="Fontes">
      <h2>Fontes</h2>
      <ul>
{source_links}
      </ul>
      <p class="note">Comentários públicos acessíveis em 24/09/2026. Cada mensagem abre sua publicação de origem. As notas institucionais resumidas estão identificadas como síntese. Alguns comentários não puderam ser recuperados pelas plataformas.</p>
    </footer>
  </main>
</body>
</html>
''', encoding='utf-8')
print(f'{len(voices)} comentários, {len(highlights)} manifestações, {len(sources)} fontes em {OUT}')
