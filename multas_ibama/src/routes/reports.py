from flask import Blueprint, request, jsonify
from src.models.ibama_data import IbamaDatabase
import json

reports_bp = Blueprint('reports', __name__)
db = IbamaDatabase()

@reports_bp.route('/reports/statistics', methods=['POST'])
def generate_statistics():
    """Gera relatório estatístico baseado nos resultados de busca"""
    try:
        data = request.get_json()
        search_results = data.get('results', [])
        
        if not search_results:
            return jsonify({'error': 'Resultados de busca são obrigatórios'}), 400
        
        stats = db.get_statistics(search_results)
        
        return jsonify({
            'success': True,
            'statistics': stats
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@reports_bp.route('/reports/summary', methods=['POST'])
def generate_summary():
    """Gera resumo jornalístico baseado nos resultados de busca"""
    try:
        data = request.get_json()
        search_results = data.get('results', [])
        search_term = data.get('search_term', '')
        
        if not search_results:
            return jsonify({'error': 'Resultados de busca são obrigatórios'}), 400
        
        # Gera estatísticas para o resumo
        stats = db.get_statistics(search_results)
        
        # Cria resumo jornalístico
        summary = generate_journalistic_summary(search_results, stats, search_term)
        
        return jsonify({
            'success': True,
            'summary': summary
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def generate_journalistic_summary(results, stats, search_term):
    """Gera um resumo em estilo jornalístico"""
    if not results:
        return "Nenhum resultado encontrado para a busca realizada."
    
    # Dados básicos
    total_registros = stats.get('total_registros', 0)
    infratores_unicos = stats.get('infratores_unicos', 0)
    valor_total = stats.get('valor_total_geral', 0)
    
    # Análise temporal
    anos = sorted(list(set([r.get('ANO', '') for r in results if r.get('ANO')])))
    periodo = f"entre {anos[0]} e {anos[-1]}" if len(anos) > 1 else f"em {anos[0]}" if anos else "período não especificado"
    
    # Principais infratores
    por_nome = stats.get('por_nome', [])
    principais_infratores = sorted(por_nome, key=lambda x: x.get('valor_total', 0), reverse=True)[:3]
    
    # Tipos de infrações mais comuns
    tipos_infracao = {}
    for result in results:
        tipo = result.get('DES_INFRACAO', 'Não especificado')
        if tipo in tipos_infracao:
            tipos_infracao[tipo] += 1
        else:
            tipos_infracao[tipo] = 1
    
    principais_tipos = sorted(tipos_infracao.items(), key=lambda x: x[1], reverse=True)[:3]
    
    # Estados mais afetados
    estados = {}
    for result in results:
        uf = result.get('UF', 'Não especificado')
        if uf in estados:
            estados[uf] += 1
        else:
            estados[uf] = 1
    
    principais_estados = sorted(estados.items(), key=lambda x: x[1], reverse=True)[:3]
    
    # Constrói o resumo
    summary = f"""
**Análise dos Autos de Infração Ambiental - IBAMA**

A busca por "{search_term}" revelou {total_registros} autos de infração ambiental {periodo}, envolvendo {infratores_unicos} diferentes infratores. O valor total das multas aplicadas soma R$ {valor_total:,.2f}.

**Principais Infratores:**
"""
    
    for i, infrator in enumerate(principais_infratores, 1):
        nome = infrator.get('nome', 'Nome não informado')
        total_multas = infrator.get('total_multas', 0)
        valor = infrator.get('valor_total', 0)
        summary += f"{i}. {nome}: {total_multas} infrações, R$ {valor:,.2f} em multas\n"
    
    summary += f"""
**Tipos de Infrações Mais Frequentes:**
"""
    
    for i, (tipo, quantidade) in enumerate(principais_tipos, 1):
        summary += f"{i}. {tipo}: {quantidade} ocorrências\n"
    
    summary += f"""
**Estados Mais Afetados:**
"""
    
    for i, (estado, quantidade) in enumerate(principais_estados, 1):
        summary += f"{i}. {estado}: {quantidade} infrações\n"
    
    summary += f"""
**Contexto:**
Os dados revelam um padrão de infrações ambientais que demonstra a necessidade de maior fiscalização e conscientização. As multas aplicadas refletem a gravidade dos danos causados ao meio ambiente, com valores que variam conforme a extensão e o impacto das infrações.

A concentração de infrações em determinados estados e tipos específicos de violações indica áreas que requerem atenção especial das autoridades ambientais. O período analisado mostra a evolução temporal das infrações, permitindo identificar tendências e padrões de comportamento.
"""
    
    return summary.strip()

