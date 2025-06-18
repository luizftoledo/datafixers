// Configuração da API
const API_BASE_URL = window.location.origin + '/api';

// Estado da aplicação
let currentResults = [];
let currentSearchTerm = '';

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

// Event listeners
searchBtn.addEventListener('click', performSearch);
clearBtn.addEventListener('click', clearSearch);
generateReportBtn.addEventListener('click', generateReport);
generateSummaryBtn.addEventListener('click', generateSummary);

// Permite busca com Enter
searchNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') performSearch();
});

searchDescriptionInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') performSearch();
});

// Funções principais
async function performSearch() {
    const name = searchNameInput.value.trim();
    const description = searchDescriptionInput.value.trim();
    const limit = parseInt(resultLimitSelect.value);
    
    if (!name && !description) {
        alert('Por favor, digite um nome ou descrição para buscar.');
        return;
    }
    
    showLoading(true);
    hideResults();
    
    try {
        let url = `${API_BASE_URL}/search/combined?limit=${limit}`;
        if (name) url += `&name=${encodeURIComponent(name)}`;
        if (description) url += `&description=${encodeURIComponent(description)}`;
        
        currentSearchTerm = name || description;
        
        const response = await fetch(url);
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
            </tr>
        `;
        table.appendChild(thead);
        
        // Corpo da tabela
        const tbody = document.createElement('tbody');
        results.forEach(result => {
            const row = document.createElement('tr');
            
            const valor = parseFloat(result.VAL_AUTO_INFRACAO || 0);
            const valorFormatado = valor.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL'
            });
            
            row.innerHTML = `
                <td class="nome">${result.NOME_INFRATOR || 'Não informado'}</td>
                <td class="valor">${valorFormatado}</td>
                <td>${result.ANO || 'N/A'}</td>
                <td>${(result.MUNICIPIO || 'N/A')} / ${(result.UF || 'N/A')}</td>
                <td class="descricao" title="${result.DES_AUTO_INFRACAO || result.DES_INFRACAO || 'Não informado'}">
                    ${result.DES_AUTO_INFRACAO || result.DES_INFRACAO || 'Não informado'}
                </td>
            `;
            tbody.appendChild(row);
        });
        table.appendChild(tbody);
        
        resultsTable.innerHTML = '';
        resultsTable.appendChild(table);
    }
    
    showResults();
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
    currentResults = [];
    currentSearchTerm = '';
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

function showLoading(show) {
    loading.style.display = show ? 'block' : 'none';
}

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    console.log('Sistema de Consulta IBAMA carregado');
});

