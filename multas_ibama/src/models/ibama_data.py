import sqlite3
import os
import unicodedata
import pandas as pd
from typing import List, Dict, Any

class IbamaDatabase:
    def __init__(self):
        self.db_path = os.path.join(os.path.dirname(__file__), '..', 'database', 'ibama_data.db')
    
    def normalize_text(self, text: str) -> str:
        """Normaliza texto removendo acentos e convertendo para minúsculas"""
        if not text:
            return ""
        text = str(text)
        # Remove acentos
        text = unicodedata.normalize('NFD', text)
        text = ''.join(char for char in text if unicodedata.category(char) != 'Mn')
        return text.lower().strip()
    
    def search_by_name(self, name: str, limit: int = 100) -> List[Dict[str, Any]]:
        """Busca autos de infração por nome do infrator"""
        normalized_name = self.normalize_text(name)
        
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        
        query = """
        SELECT * FROM autos_infracao 
        WHERE NOME_NORMALIZADO LIKE ? 
        ORDER BY ANO DESC, VAL_AUTO_INFRACAO DESC
        LIMIT ?
        """
        
        cursor = conn.execute(query, (f'%{normalized_name}%', limit))
        results = [dict(row) for row in cursor.fetchall()]
        conn.close()
        
        return results
    
    def search_by_description(self, description: str, limit: int = 100) -> List[Dict[str, Any]]:
        """Busca autos de infração por descrição da infração"""
        normalized_desc = self.normalize_text(description)
        
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        
        query = """
        SELECT * FROM autos_infracao 
        WHERE DESC_NORMALIZADA LIKE ? OR DESC_INFRACAO_NORMALIZADA LIKE ?
        ORDER BY ANO DESC, VAL_AUTO_INFRACAO DESC
        LIMIT ?
        """
        
        cursor = conn.execute(query, (f'%{normalized_desc}%', f'%{normalized_desc}%', limit))
        results = [dict(row) for row in cursor.fetchall()]
        conn.close()
        
        return results
    
    def get_statistics(self, search_results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Gera estatísticas dos resultados de busca"""
        if not search_results:
            return {}
        
        df = pd.DataFrame(search_results)
        
        # Agrupa por nome e ano
        stats_by_name_year = df.groupby(['NOME_INFRATOR', 'ANO']).agg({
            'VAL_AUTO_INFRACAO': ['count', 'sum']
        }).reset_index()
        
        stats_by_name_year.columns = ['nome', 'ano', 'total_multas', 'valor_total']
        
        # Agrupa por nome (total geral)
        stats_by_name = df.groupby('NOME_INFRATOR').agg({
            'VAL_AUTO_INFRACAO': ['count', 'sum']
        }).reset_index()
        
        stats_by_name.columns = ['nome', 'total_multas', 'valor_total']
        
        return {
            'total_registros': len(search_results),
            'infratores_unicos': df['NOME_INFRATOR'].nunique(),
            'valor_total_geral': df['VAL_AUTO_INFRACAO'].sum(),
            'por_nome_e_ano': stats_by_name_year.to_dict('records'),
            'por_nome': stats_by_name.to_dict('records')
        }
    
    def get_sample_data(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Retorna uma amostra dos dados para teste"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        
        query = "SELECT * FROM autos_infracao ORDER BY RANDOM() LIMIT ?"
        cursor = conn.execute(query, (limit,))
        results = [dict(row) for row in cursor.fetchall()]
        conn.close()
        
        return results

