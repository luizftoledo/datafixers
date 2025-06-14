// Stories data
const stories = [
    {
        id: 1,
        tags: ['REVISTA PIAUÍ'],
        title: 'Unknown deforestation agents',
        image: 'images/deforicmbio.png',
        description: 'We found out that almost half environmental embargoes in Brazil have no name on it, meaning that the government didn\'t know who was responsible for deforestation in that area. By cross-referencing public datasets, we were able to identify some of these agents.',
        links: [
            { text: 'Read the story (Portuguese only)', url: 'https://piaui.folha.uol.com.br/desmatamento-amazonia-embargos-icmbio/' }
        ]
    },
    {
        id: 2,
        tags: ['MONGABAY'],
        title: 'The harsh, dangerous gig of seizing thousands of illegal cattle in the Amazon',
        image: 'images/mongaba24.png',
        description: 'This story explains how tracking illegal cattle in the Amazon is possible through GTA, a document issued by state agencies, and why they try to hide those documents from civil society.',
        links: [
            { text: 'Read the story (English)', url: 'https://news.mongabay.com/2024/06/the-harsh-dangerous-gig-of-seizing-thousands-of-illegal-cattle-in-the-amazon' }
        ]
    },
    {
        id: 3,
        tags: ['AMBIENTAL MEDIA'],
        title: 'Majority of Amazon fire and deforestation fines in 12 Brazilian cities',
        image: 'images/ambi.png',
        description: 'This significant concentration of environmental infractions in a small fraction of the region highlights critical areas of concern in the Amazon. The data reveals patterns and hotspots of environmental violations, offering insights for further investigation and policy action.',
        links: [
            { text: 'Read the story (Portuguese only)', url: 'https://ambiental.media/mais-da-metade-das-multas-por-fogo-e-desmatamento-na-amazonia-aconteceram-em-apenas-12-municipios/' }
        ]
    },
    {
        id: 4,
        tags: ['REVISTA PIAUÍ'],
        title: 'Land Grabbing in the heart of Brasília',
        image: 'images/gril_df.jpeg',
        description: 'We investigated how, with the support of politicians, individuals are invading Brazil\'s conservation units, deforesting, and profiting from the sale of plots in the Distrito Federal, near the Congress and Palácio do Planalto.',
        links: [
            { text: 'Read the story (Portuguese only)', url: 'https://piaui.folha.uol.com.br/distrito-federal-grileiros-car-brasilia/' }
        ]
    },
    {
        id: 5,
        tags: ['REVISTA PIAUÍ'],
        title: 'Land Grabbing, Gold Mining, and Cocaine Trade in the Amazon',
        image: 'images/pogado.jpeg',
        description: 'This investigation, written in Portuguese, uncovers a scheme in the Amazon region called "agropó" that combines land grabbing, illegal mining, and international cocaine trafficking. The investigation reveals that wealthy landowners, such as Janio Oliveira, have been involved in this lucrative criminal network.',
        links: [
            { text: 'Read the story (Portuguese only)', url: 'https://piaui.folha.uol.com.br/quero-meter-dinheiro-e-no-agropo/' }
        ]
    },
    {
        id: 6,
        tags: ['INFOAMAZONIA', 'PULITZER CENTER', 'ARMANDO.INFO'],
        title: 'Amazon Underworld',
        image: 'images/soldier.jpeg',
        description: 'A 1-year cross-border series of articles that mapped the presence of organized crime groups in the Amazon region and reported on the field about the impacts of their actions. Data Fixers coordinated the data analysis and obtained the documents needed for the stories.',
        links: [
            { text: 'Visit the project page', url: 'https://amazonunderworld.org/' }
        ]
    },
    {
        id: 7,
        tags: ['ICIJ', 'PODER 360', 'AGÊNCIA PÚBLICA', 'REVISTA PIAUÍ'],
        title: 'Deforestation Inc.',
        image: 'images/defor.jpeg',
        description: 'An International Consortium of Investigative Journalists (ICIJ)-led cross-border investigation exposes how a lightly regulated sustainability industry overlooks forest destruction and human rights violations when granting environmental certifications. Data Fixers coordinated the data analysis and obtained the documents needed for the Brazilian stories.',
        links: [
            { text: 'Visit the project page', url: 'https://www.icij.org/investigations/deforestation-inc/' },
            { text: 'Read more about this project (English)', url: 'https://brown.columbia.edu/after-six-months-data-fixers-achieves-100-mentions-and-new-cross-border-investigations/' },
            { text: 'Read the story (Portuguese)', url: 'https://piaui.folha.uol.com.br/madeireiras-com-selo-de-sustentabilidade-receberam-multas-milionarias-do-ibama/' }
        ]
    },
    {
        id: 8,
        tags: ['GLOBAL WITNESS', 'REPÓRTER BRASIL'],
        title: 'How public agencies hinder access to information about the beef cattle chain',
        image: 'images/gadao.jpg',
        description: 'In partnership with NGO Global Witness, Data Fixers has investigated how government agencies use several strategies to withhold data about the cattle chain in Brazil, making it harder to investigate companies.',
        links: [
            { text: 'Read an english version', url: 'https://reporterbrasil.org.br/2023/07/how-public-agencies-hinder-access-to-information-about-the-beef-cattle-chain/' },
            { text: 'Read the story in Portuguese', url: 'https://reporterbrasil.org.br/2023/07/como-orgaos-publicos-dificultam-o-acesso-a-informacoes-sobre-o-caminho-do-gado/' }
        ]
    },
    {
        id: 9,
        tags: ['REVISTA PIAUÍ'],
        title: 'The worst land grabber in the Amazon',
        image: 'images/masson.jpeg',
        description: 'The Brazilian magazine Piauí has published a profile on Altino Masson, a man who has illegally seized 458,000 hectares of public lands, an area equivalent to three times the size of the city of São Paulo. This story is based on a data analysis conducted by Data Fixers and the Center for Climate Crime Analysis (CCCA), which used data from the Cadastro Ambiental Rural (CAR), as well as Ibama\'s environmental fines data and other sources.',
        links: [
            { text: 'Read the article in Portuguese', url: 'https://piaui.folha.uol.com.br/materia/como-maior-grileiro-altino-masson-se-apossou-de-terra-publica-amazonia/' }
        ]
    },
    {
        id: 10,
        tags: ['OCCRP', 'REVISTA PIAUÍ'],
        title: 'A world heritage site under attack in Brazil',
        image: 'images/madeire.jpeg',
        description: 'This story was supported by Earth News Network/Internews. Brazilwood is being driven to extinction by an industry not often associated with organized crime: classical music. Known for its density and strength, the wood is crafted into bows that are used to play stringed instruments such as violins and cellos around the world. Forensic tests on a sample of the confiscated wood, obtained by reporters, show it was logged in the Pau Brazil National Park.',
        links: [
            { text: 'Read the article in Portuguese', url: 'https://piaui.folha.uol.com.br/materia/pau-brasil-extincao-arcos-violino/' },
            { text: 'English version', url: 'https://www.occrp.org/en/investigations/a-world-heritage-site-under-attack-in-brazil' }
        ]
    },
    {
        id: 11,
        tags: ['OCCRP', 'REVISTA PIAUÍ'],
        title: 'The Brazilian Bow Makers Under Investigation For Dealing in Endangered Wood',
        image: 'images/madeire.jpeg',
        description: 'A 2-month cross-border investigation in the US, UK and Brazil about a group of bowmakers suspicious of trafficking an endangered brazilian wood to make violin and cello bows.',
        links: [
            { text: 'Read the English version', url: 'https://www.occrp.org/en/investigations/the-brazilian-bow-makers-under-investigation-for-dealing-in-endangered-wood' },
            { text: 'Read the story in Portuguese (part 1)', url: 'https://piaui.folha.uol.com.br/materia/arcos-de-violino-feitos-com-pau-brasil-contrabandeado/' },
            { text: 'Read the story in Portuguese (part 2)', url: 'https://piaui.folha.uol.com.br/materia/como-madeira-brasileira-protegida-vira-arco-de-violino-nos-eua/' }
        ]
    },
    {
        id: 12,
        tags: ['BRAZILIAN REPORT', 'REVISTA PIAUÍ'],
        title: 'How Brazil\'s environmental agency lost R$ 1 billion in environmental fines',
        image: 'images/ibama.jpeg',
        description: 'An investigation about how environmental fines disappeared from Brazil\'s environmental agency office, Ibama, helping several environmental offenders save money and continue deforestation in the Amazon.',
        links: [
            { text: 'Read the story in English', url: 'https://brazilian.report/liveblog/2022/04/07/brazil-environmental-agency-lost-billion-fines/' },
            { text: 'Read the story in Portuguese', url: 'https://piaui.folha.uol.com.br/materia/como-o-ibama-perdeu-r-1-bilhao-em-multas-ambientais/' }
        ]
    },
    {
        id: 13,
        tags: ['REVISTA PIAUÍ'],
        title: 'As artimanhas criminais de um austríaco',
        image: 'images/austriaco_gold_laundering.jpeg',
        description: 'We did webscraping of government and judicial data to support investigation into gold laundering.',
        links: [
            { text: 'Read the story (Portuguese only)', url: 'https://piaui.folha.uol.com.br/materia/as-artimanhas-criminais-de-um-austriaco/' }
        ]
    },
    {
        id: 14,
        tags: ['AGÊNCIA PÚBLICA'],
        title: 'Autorização de limpeza de pasto mascara e legaliza desmatamento ilegal',
        image: 'images/deforestation_generic.jpg',
        description: 'We elaborated all information requests and organized the data to support investigation into illegal deforestation authorized by local governments.',
        links: [
            { text: 'Read the story (Portuguese only)', url: 'https://apublica.org/2025/04/autorizacao-de-limpeza-de-pasto-mascara-e-legaliza-desmatamento-ilegal/' }
        ]
    },
    {
        id: 15,
        tags: ['REPÓRTER BRASIL'],
        title: 'Autuados por trabalho escravo receberam mais de R$ 1 bilhão em isenções fiscais',
        image: 'images/slave_labor_tax_exemptions.jpeg',
        description: 'We analyzed data showing tax exemptions from the Brazilian government to companies prosecuted for slave labor.',
        links: [
            { text: 'Read the story (Portuguese only)', url: 'https://reporterbrasil.org.br/2024/07/autuados-trabalho-escravo-1-bilhao-isencoes-fiscais/' }
        ]
    }
];

// Gallery functionality
let currentStoryIndex = 0;
const totalStories = stories.length;

function renderStory(index) {
    const story = stories[index];
    const container = document.getElementById('galleryContainer');
    
    const tagsHtml = story.tags.map(tag => `<span class="tag">${tag}</span>`).join('');
    const linksHtml = story.links.map(link => 
        `<a href="${link.url}" class="btn-secondary" target="_blank">${link.text}</a>`
    ).join('');
    
    container.innerHTML = `
        <div class="story-item active">
            <div class="story-tags">
                ${tagsHtml}
            </div>
            <h3>${story.title}</h3>
            <div class="story-image">
                <img src="${story.image}" alt="${story.title}">
            </div>
            <p>${story.description}</p>
            <div class="story-links">
                ${linksHtml}
            </div>
        </div>
    `;
}

function changeStory(direction) {
    currentStoryIndex += direction;
    
    // Handle boundaries
    if (currentStoryIndex < 0) {
        currentStoryIndex = totalStories - 1;
    } else if (currentStoryIndex >= totalStories) {
        currentStoryIndex = 0;
    }
    
    // Update display
    renderStory(currentStoryIndex);
    updateCounter();
    updateButtons();
}

function updateCounter() {
    document.getElementById('currentStory').textContent = currentStoryIndex + 1;
    document.getElementById('totalStories').textContent = totalStories;
}

function updateButtons() {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    
    // Always enable buttons for circular navigation
    prevBtn.disabled = false;
    nextBtn.disabled = false;
}

// Initialize gallery
document.addEventListener('DOMContentLoaded', function() {
    renderStory(0);
    updateCounter();
    updateButtons();
    
    // Add keyboard navigation
    document.addEventListener('keydown', function(e) {
        if (e.key === 'ArrowLeft') {
            changeStory(-1);
        } else if (e.key === 'ArrowRight') {
            changeStory(1);
        }
    });
});

// Navigation items click handlers
document.addEventListener('DOMContentLoaded', function() {
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach((item, index) => {
        item.addEventListener('click', function() {
            const sections = ['stories-section', 'dashboards-section', 'partnerships-section', 'about-section'];
            const targetSection = document.querySelector(`.${sections[index]}`);
            
            if (targetSection) {
                targetSection.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
});


// Video gallery functions
let currentVideoIndex = 0;
const totalVideos = 5;

function changeVideo(direction) {
    const videos = document.querySelectorAll('.video-item');
    videos[currentVideoIndex].classList.remove('active');
    
    currentVideoIndex += direction;
    
    if (currentVideoIndex >= totalVideos) {
        currentVideoIndex = 0;
    } else if (currentVideoIndex < 0) {
        currentVideoIndex = totalVideos - 1;
    }
    
    videos[currentVideoIndex].classList.add('active');
    document.getElementById('currentVideo').textContent = currentVideoIndex + 1;
}

// Add keyboard navigation for videos
document.addEventListener('keydown', function(e) {
    if (e.key === 'ArrowLeft') {
        changeVideo(-1);
    } else if (e.key === 'ArrowRight') {
        changeVideo(1);
    }
});

