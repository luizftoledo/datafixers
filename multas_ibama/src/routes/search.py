from flask import Blueprint, request, jsonify
from src.models.ibama_data import IbamaDatabase

search_bp = Blueprint('search', __name__)
db = IbamaDatabase()

@search_bp.route('/search/name', methods=['GET'])
def search_by_name():
    """Endpoint para busca por nome"""
    name = request.args.get('name', '')
    limit = int(request.args.get('limit', 100))
    
    if not name:
        return jsonify({'error': 'Nome é obrigatório'}), 400
    
    try:
        results = db.search_by_name(name, limit)
        return jsonify({
            'success': True,
            'total': len(results),
            'results': results
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@search_bp.route('/search/description', methods=['GET'])
def search_by_description():
    """Endpoint para busca por descrição"""
    description = request.args.get('description', '')
    limit = int(request.args.get('limit', 100))
    
    if not description:
        return jsonify({'error': 'Descrição é obrigatória'}), 400
    
    try:
        results = db.search_by_description(description, limit)
        return jsonify({
            'success': True,
            'total': len(results),
            'results': results
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@search_bp.route('/search/combined', methods=['GET'])
def search_combined():
    """Endpoint para busca combinada por nome e descrição"""
    name = request.args.get('name', '')
    description = request.args.get('description', '')
    limit = int(request.args.get('limit', 100))
    
    if not name and not description:
        return jsonify({'error': 'Nome ou descrição é obrigatório'}), 400
    
    try:
        results = []
        
        if name:
            name_results = db.search_by_name(name, limit)
            results.extend(name_results)
        
        if description:
            desc_results = db.search_by_description(description, limit)
            # Remove duplicatas baseado no número do auto
            existing_autos = {r.get('NUM_AUTO_INFRACAO') for r in results}
            for result in desc_results:
                if result.get('NUM_AUTO_INFRACAO') not in existing_autos:
                    results.append(result)
        
        # Limita o resultado final
        results = results[:limit]
        
        return jsonify({
            'success': True,
            'total': len(results),
            'results': results
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@search_bp.route('/sample', methods=['GET'])
def get_sample():
    """Endpoint para obter dados de amostra"""
    limit = int(request.args.get('limit', 10))
    
    try:
        results = db.get_sample_data(limit)
        return jsonify({
            'success': True,
            'total': len(results),
            'results': results
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

