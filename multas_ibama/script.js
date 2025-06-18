// Configuração da API - CORRIGIDA
const API_BASE_URL = 'https://zmhqivcgk5o8.manus.space/api';

// Estado da aplicação
let currentResults = [];
let currentSearchTerm = '';
let nameSuggestions = [];
let selectedNames = [];

// Elementos DOM
const searchNameInput = document.getElementById('searchName');
const searchDescriptionInput = document.getElementById('searchDescription');
const resultLimitSelect = document.getElementById('resultLimit');
const searchBtn = document.getElementById('searchBtn');
const clearBtn = document.getElementById('clearBtn');
const resultsSection = document.getElementById('resultsSection');
const resultsCount = document.getElementById('resultsCount');
const resultsTable = document.getElementById('resultsTable');
const generateReportBtn = document.getElementById('generateReportBtn');
const generateSummaryBtn = document.getElementById('generateSummaryBtn');
const reportSection = document.getElementById('reportSection');
const reportContent = document.getElementById('reportContent');
const summarySection = document.getElementById('summarySection');
const summaryContent = document.getElementById('summaryContent');
const loading = document.getElementById('loading');
const suggestionsSection = document.getElementById('suggestionsSection');
const suggestionsList = document.getElementById('suggestionsList');
const searchSelectedBtn = document.getElementById('searchSelectedBtn');
const backToSearchBtn = document.getElementById('backToSearchBtn');

// Tooltip para descrições
let currentTooltip = null;

// Event listeners
searchBtn.addEventListener('click', performInitialSearch);
clearBtn.addEventListener('click', clearSearch);
generateReportBtn.addEventListener('click', generateReport);
generateSummaryBtn.addEventListener('click', generateSummary);
searchSelectedBtn.addEventListener('click', searchSelectedNames);
backToSearchBtn.addEventListener('click', backToSearch);

// Permite busca com Enter
searchNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') performInitialSearch();
});

searchDescriptionInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') performInitialSearch();
});

// Funções principais
async function performInitialSearch() {
    const name = searchNameInput.value.trim();
    const description = searchDescriptionInput.value.trim();
    
    if (!name && !description) {
        alert('Por favor, digite um nome ou descrição para buscar.');
        return;
    }
    
    // Se for busca por nome, mostrar sugestões primeiro
    if (name && !description) {
        await showNameSuggestions(name);
    } else {
        // Se for busca por descrição ou combinada, buscar diretamente
        await performDirectSearch();
    }
}

async function showNameSuggestions(name) {
    showLoading(true);
    hideResults();
    hideSuggestions();
    
    try {
        const response = await fetch(`${API_BASE_URL}/search/name/suggestions?name=${encodeURIComponent(name)}&limit=50`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.suggestions.length > 0) {
            nameSuggestions = data.suggestions;
            selectedNames = [];
            displayNameSuggestions(data.suggestions);
            showSuggestions();
        } else {
            alert('Nenhuma sugestão encontrada para este nome.');
        }
    } catch (error) {
        console.error('Erro ao buscar sugestões:', error);
        alert('Erro ao buscar sugestões. Verifique sua conexão.');
    } finally {
        showLoading(false);
    }
}

function displayNameSuggestions(suggestions) {
    suggestionsList.innerHTML = '';
    
    suggestions.forEach((suggestion, index) => {
        const suggestionItem = document.createElement('div');
        suggestionItem.className = 'suggestion-item';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `suggestion-${index}`;
        checkbox.value = suggestion.nome;
        checkbox.addEventListener('change', updateSelectedNames);
        
        const label = document.createElement('label');
        label.htmlFor = `suggestion-${index}`;
        label.innerHTML = `
            <div class="suggestion-name">${suggestion.nome}</div>
            <div class="suggestion-stats">
                ${suggestion.total_infracoes} infrações • 
                ${suggestion.valor_total.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                })}
            </div>
        `;
        
        suggestionItem.appendChild(checkbox);
        suggestionItem.appendChild(label);
        suggestionsList.appendChild(suggestionItem);
    });
}

function updateSelectedNames() {
    const checkboxes = suggestionsList.querySelectorAll('input[type="checkbox"]:checked');
    selectedNames = Array.from(checkboxes).map(cb => cb.value);
    
    const searchButton = document.getElementById('searchSelectedBtn');
    searchButton.disabled = selectedNames.length === 0;
    searchButton.textContent = selectedNames.length > 0 
        ? `🔍 Buscar ${selectedNames.length} nome(s) selecionado(s)`
        : '🔍 Selecione pelo menos um nome';
}

async function searchSelectedNames() {
    if (selectedNames.length === 0) {
        alert('Selecione pelo menos um nome para buscar.');
        return;
    }
    
    showLoading(true);
    hideSuggestions();
    
    try {
        const limit = parseInt(resultLimitSelect.value);
        
        const response = await fetch(`${API_BASE_URL}/search/name/selected`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                names: selectedNames,
                limit: limit
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            currentResults = data.results;
            currentSearchTerm = selectedNames.join(', ');
            displayResults(data.results);
        } else {
            alert('Erro na busca: ' + data.error);
        }
    } catch (error) {
        console.error('Erro na busca:', error);
        alert('Erro ao realizar busca. Verifique sua conexão.');
    } finally {
        showLoading(false);
    }
}

async function performDirectSearch() {
    const name = searchNameInput.value.trim();
    const description = searchDescriptionInput.value.trim();
    const limit = parseInt(resultLimitSelect.value);
    
    showLoading(true);
    hideResults();
    hideSuggestions();
    
    try {
        let url = `${API_BASE_URL}/search/combined?limit=${limit}`;
        if (name) url += `&name=${encodeURIComponent(name)}`;
        if (description) url += `&description=${encodeURIComponent(description)}`;
        
        currentSearchTerm = name || description;
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            currentResults = data.results;
            displayResults(data.results);
        } else {
            alert('Erro na busca: ' + data.error);
        }
    } catch (error) {
        console.error('Erro na busca:', error);
        alert('Erro ao realizar busca. Verifique sua conexão.');
    } finally {
        showLoading(false);
    }
}

function displayResults(results) {
    if (results.length === 0) {
        resultsCount.textContent = 'Nenhum resultado encontrado';
        resultsTable.innerHTML = '<p class="text-center">Nenhum resultado encontrado para os critérios de busca.</p>';
    } else {
        resultsCount.textContent = `${results.length} resultado(s) encontrado(s)`;
        
        const table = document.createElement('table');
        table.className = 'results-table';
        
        // Cabeçalho
        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr>
                <th>Nome/Empresa</th>
                <th>Valor da Multa</th>
                <th>Ano</th>
                <th>Município/UF</th>
                <th>Descrição da Infração</th>
                <th>Ações</th>
            </tr>
        `;
        table.appendChild(thead);
        
        // Corpo da tabela
        const tbody = document.createElement('tbody');
        results.forEach((result, index) => {
            const row = document.createElement('tr');
            
            const valor = parseFloat(result.VAL_AUTO_INFRACAO || 0);
            const valorFormatado = valor.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL'
            });
            
            const descricaoCompleta = result.DES_AUTO_INFRACAO || result.DES_INFRACAO || 'Não informado';
            const descricaoTruncada = descricaoCompleta.length > 50 
                ? descricaoCompleta.substring(0, 50) + '...' 
                : descricaoCompleta;
            
            row.innerHTML = `
                <td class="nome">${result.NOME_INFRATOR || 'Não informado'}</td>
                <td class="valor">${valorFormatado}</td>
                <td>${result.ANO || 'N/A'}</td>
                <td>${(result.MUNICIPIO || 'N/A')} / ${(result.UF || 'N/A')}</td>
                <td class="descricao" data-full-text="${descricaoCompleta}">
                    ${descricaoTruncada}
                </td>
                <td class="acoes">
                    <button class="btn-lai" onclick="gerarSolicitacaoLAI(${index})" title="Solicitar cópia via LAI">
                        📄 LAI
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
        table.appendChild(tbody);
        
        resultsTable.innerHTML = '';
        resultsTable.appendChild(table);
        
        // Adicionar event listeners para tooltips
        addTooltipListeners();
    }
    
    showResults();
}

function gerarSolicitacaoLAI(index) {
    const result = currentResults[index];
    
    // Extrair dados necessários
    const numeroProcesso = result.NUM_AUTO_INFRACAO || result.NUMERO_AUTO || 'número não informado';
    const dataAuto = result.DAT_AUTO_INFRACAO || result.DATA_AUTO || 'data não informada';
    const nomeAutuado = result.NOME_INFRATOR || 'nome não informado';
    const cpfCnpj = result.CPF_CNPJ || result.DOCUMENTO || 'CPF/CNPJ não informado';
    
    // Formatar data se necessário
    let dataFormatada = dataAuto;
    if (dataAuto && dataAuto !== 'data não informada') {
        try {
            const data = new Date(dataAuto);
            if (!isNaN(data.getTime())) {
                dataFormatada = data.toLocaleDateString('pt-BR');
            }
        } catch (e) {
            // Manter data original se não conseguir formatar
        }
    }
    
    // Gerar texto da solicitação
    const textoSolicitacao = `Solicito, por favor, acesso ao auto de infração e processo administrativo referente ao número ${numeroProcesso}, da data ${dataFormatada}, cujo autuado é ${nomeAutuado}, CPF/CNPJ ${cpfCnpj}.

Reforçamos que a CGU já indicou que autos de infração são documentos de interesse público. Caso haja informações pontuais, basta tarjá-los e enviar o restante.`;

    // Mostrar modal com o texto
    mostrarModalLAI(textoSolicitacao);
}

function mostrarModalLAI(texto) {
    // Criar modal
    const modal = document.createElement('div');
    modal.className = 'modal-lai';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>📄 Solicitação via Lei de Acesso à Informação</h3>
                <button class="modal-close" onclick="fecharModalLAI()">&times;</button>
            </div>
            <div class="modal-body">
                <p><strong>Texto da solicitação:</strong></p>
                <textarea id="textoLAI" readonly>${texto}</textarea>
                <div class="modal-actions">
                    <button class="btn btn-primary" onclick="copiarTextoLAI()">
                        📋 Copiar Texto
                    </button>
                    <a href="https://falabr.cgu.gov.br/" target="_blank" class="btn btn-success">
                        🌐 Abrir FalaBR (CGU)
                    </a>
                </div>
                <div class="modal-info">
                    <p><strong>Como usar:</strong></p>
                    <ol>
                        <li>Clique em "Copiar Texto" para copiar a solicitação</li>
                        <li>Clique em "Abrir FalaBR (CGU)" para acessar o site oficial</li>
                        <li>Registre sua solicitação no site da CGU</li>
                        <li>Cole o texto copiado no campo de descrição</li>
                    </ol>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Adicionar event listener para fechar clicando fora
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            fecharModalLAI();
        }
    });
}

function copiarTextoLAI() {
    const textarea = document.getElementById('textoLAI');
    textarea.select();
    textarea.setSelectionRange(0, 99999); // Para dispositivos móveis
    
    try {
        document.execCommand('copy');
        alert('Texto copiado para a área de transferência!');
    } catch (err) {
        // Fallback para navegadores mais novos
        navigator.clipboard.writeText(textarea.value).then(() => {
            alert('Texto copiado para a área de transferência!');
        }).catch(() => {
            alert('Erro ao copiar. Selecione o texto manualmente e use Ctrl+C.');
        });
    }
}

function fecharModalLAI() {
    const modal = document.querySelector('.modal-lai');
    if (modal) {
        modal.remove();
    }
}

function addTooltipListeners() {
    const descricaoCells = document.querySelectorAll('.descricao');
    
    descricaoCells.forEach(cell => {
        const fullText = cell.getAttribute('data-full-text');
        const displayText = cell.textContent.trim();
        
        // Só adiciona tooltip se o texto foi truncado
        if (fullText && fullText !== displayText && fullText.length > displayText.length) {
            cell.addEventListener('mouseenter', (e) => showTooltip(e, fullText));
            cell.addEventListener('mouseleave', hideTooltip);
            cell.addEventListener('mousemove', updateTooltipPosition);
        }
    });
}

function showTooltip(event, text) {
    hideTooltip(); // Remove tooltip anterior se existir
    
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.textContent = text;
    
    document.body.appendChild(tooltip);
    currentTooltip = tooltip;
    
    // Posiciona o tooltip
    updateTooltipPosition(event);
    
    // Mostra o tooltip com animação
    setTimeout(() => {
        tooltip.classList.add('show');
    }, 10);
}

function updateTooltipPosition(event) {
    if (!currentTooltip) return;
    
    const tooltip = currentTooltip;
    const rect = tooltip.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    let left = event.pageX + 10;
    let top = event.pageY - rect.height - 10;
    
    // Ajusta se sair da tela pela direita
    if (left + rect.width > viewportWidth) {
        left = event.pageX - rect.width - 10;
    }
    
    // Ajusta se sair da tela por cima
    if (top < window.pageYOffset) {
        top = event.pageY + 10;
    }
    
    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';
}

function hideTooltip() {
    if (currentTooltip) {
        currentTooltip.remove();
        currentTooltip = null;
    }
}

async function generateReport() {
    if (currentResults.length === 0) {
        alert('Nenhum resultado disponível para gerar relatório.');
        return;
    }
    
    showLoading(true);
    
    try {
        const response = await fetch(`${API_BASE_URL}/reports/statistics`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                results: currentResults
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            displayReport(data.statistics);
        } else {
            alert('Erro ao gerar relatório: ' + data.error);
        }
    } catch (error) {
        console.error('Erro ao gerar relatório:', error);
        alert('Erro ao gerar relatório. Verifique sua conexão.');
    } finally {
        showLoading(false);
    }
}

function displayReport(stats) {
    const statsHtml = `
        <div class="stats-grid">
            <div class="stat-card">
                <h4>Total de Registros</h4>
                <div class="value">${stats.total_registros || 0}</div>
            </div>
            <div class="stat-card">
                <h4>Infratores Únicos</h4>
                <div class="value">${stats.infratores_unicos || 0}</div>
            </div>
            <div class="stat-card">
                <h4>Valor Total das Multas</h4>
                <div class="value">${(stats.valor_total_geral || 0).toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                })}</div>
            </div>
        </div>
        
        <h4>Resumo por Infrator:</h4>
        <div class="results-container">
            <table class="results-table">
                <thead>
                    <tr>
                        <th>Nome/Empresa</th>
                        <th>Total de Multas</th>
                        <th>Valor Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${(stats.por_nome || []).map(item => `
                        <tr>
                            <td class="nome">${item.nome}</td>
                            <td>${item.total_multas}</td>
                            <td class="valor">${(item.valor_total || 0).toLocaleString('pt-BR', {
                                style: 'currency',
                                currency: 'BRL'
                            })}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        
        <h4>Detalhamento por Ano:</h4>
        <div class="results-container">
            <table class="results-table">
                <thead>
                    <tr>
                        <th>Nome/Empresa</th>
                        <th>Ano</th>
                        <th>Quantidade</th>
                        <th>Valor Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${(stats.por_nome_e_ano || []).map(item => `
                        <tr>
                            <td class="nome">${item.nome}</td>
                            <td>${item.ano}</td>
                            <td>${item.total_multas}</td>
                            <td class="valor">${(item.valor_total || 0).toLocaleString('pt-BR', {
                                style: 'currency',
                                currency: 'BRL'
                            })}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
    
    reportContent.innerHTML = statsHtml;
    reportSection.style.display = 'block';
    reportSection.scrollIntoView({ behavior: 'smooth' });
}

async function generateSummary() {
    if (currentResults.length === 0) {
        alert('Nenhum resultado disponível para gerar resumo.');
        return;
    }
    
    showLoading(true);
    
    try {
        const response = await fetch(`${API_BASE_URL}/reports/summary`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                results: currentResults,
                search_term: currentSearchTerm
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            displaySummary(data.summary);
        } else {
            alert('Erro ao gerar resumo: ' + data.error);
        }
    } catch (error) {
        console.error('Erro ao gerar resumo:', error);
        alert('Erro ao gerar resumo. Verifique sua conexão.');
    } finally {
        showLoading(false);
    }
}

function displaySummary(summary) {
    // Converte markdown simples para HTML
    const htmlSummary = summary
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>');
    
    summaryContent.innerHTML = `<div class="summary-content"><p>${htmlSummary}</p></div>`;
    summarySection.style.display = 'block';
    summarySection.scrollIntoView({ behavior: 'smooth' });
}

function clearSearch() {
    searchNameInput.value = '';
    searchDescriptionInput.value = '';
    resultLimitSelect.value = '100';
    hideResults();
    hideReports();
    hideSuggestions();
    hideTooltip();
    currentResults = [];
    currentSearchTerm = '';
    nameSuggestions = [];
    selectedNames = [];
}

function backToSearch() {
    hideSuggestions();
    selectedNames = [];
    nameSuggestions = [];
}

function showResults() {
    resultsSection.style.display = 'block';
}

function hideResults() {
    resultsSection.style.display = 'none';
    hideReports();
}

function hideReports() {
    reportSection.style.display = 'none';
    summarySection.style.display = 'none';
}

function showSuggestions() {
    suggestionsSection.style.display = 'block';
}

function hideSuggestions() {
    suggestionsSection.style.display = 'none';
}

function showLoading(show) {
    loading.style.display = show ? 'block' : 'none';
}

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    console.log('Sistema de Consulta IBAMA carregado');
    console.log('API_BASE_URL configurada para:', API_BASE_URL);
    
    // Remove tooltips quando clicar fora
    document.addEventListener('click', hideTooltip);
    
    // Remove tooltips quando rolar a página
    window.addEventListener('scroll', hideTooltip);
});

