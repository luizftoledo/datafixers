import pandas as pd
import glob
import sqlite3
import unicodedata
import os

def normalize_text(text):
    """Normaliza texto removendo acentos e convertendo para minúsculas"""
    if pd.isna(text):
        return ""
    text = str(text)
    # Remove acentos
    text = unicodedata.normalize('NFD', text)
    text = ''.join(char for char in text if unicodedata.category(char) != 'Mn')
    return text.lower().strip()

def process_ibama_data():
    """Processa os dados do IBAMA e cria banco SQLite"""
    print("Iniciando processamento dos dados...")
    
    # Lista todos os arquivos CSV
    csv_files = glob.glob("data/auto_infracao_ano_*.csv")
    csv_files.sort()
    
    if not csv_files:
        print("Nenhum arquivo CSV encontrado. Execute primeiro o download_data.py")
        return
    
    all_data = []
    
    for file in csv_files:
        print(f"Processando {file}...")
        try:
            # Lê o CSV
            df = pd.read_csv(file, sep=';', encoding='utf-8', low_memory=False)
            
            # Extrai o ano do nome do arquivo
            year = os.path.basename(file).split('_')[-1].replace('.csv', '')
            df['ANO'] = year
            
            # Seleciona apenas as colunas necessárias
            columns_needed = [
                'NUM_AUTO_INFRACAO', 'NOME_INFRATOR', 'CPF_CNPJ_INFRATOR',
                'VAL_AUTO_INFRACAO', 'DES_AUTO_INFRACAO', 'DES_INFRACAO',
                'DAT_HORA_AUTO_INFRACAO', 'MUNICIPIO', 'UF', 'DS_BIOMAS_ATINGIDOS',
                'DES_LOCAL_INFRACAO', 'TIPO_MULTA', 'GRAVIDADE_INFRACAO', 'ANO'
            ]
            
            # Verifica quais colunas existem no arquivo
            existing_columns = [col for col in columns_needed if col in df.columns]
            df_selected = df[existing_columns].copy()
            
            # Adiciona colunas normalizadas para busca
            if 'NOME_INFRATOR' in df_selected.columns:
                df_selected['NOME_NORMALIZADO'] = df_selected['NOME_INFRATOR'].apply(normalize_text)
            
            if 'DES_AUTO_INFRACAO' in df_selected.columns:
                df_selected['DESC_NORMALIZADA'] = df_selected['DES_AUTO_INFRACAO'].apply(normalize_text)
            
            if 'DES_INFRACAO' in df_selected.columns:
                df_selected['DESC_INFRACAO_NORMALIZADA'] = df_selected['DES_INFRACAO'].apply(normalize_text)
            
            # Converte valor da multa para float
            if 'VAL_AUTO_INFRACAO' in df_selected.columns:
                df_selected['VAL_AUTO_INFRACAO'] = df_selected['VAL_AUTO_INFRACAO'].astype(str).str.replace(',', '.').astype(float, errors='ignore')
            
            all_data.append(df_selected)
            
        except Exception as e:
            print(f"Erro ao processar {file}: {e}")
            continue
    
    # Concatena todos os dataframes
    print("Consolidando dados...")
    consolidated_df = pd.concat(all_data, ignore_index=True)
    
    # Remove linhas com nome vazio
    consolidated_df = consolidated_df.dropna(subset=['NOME_INFRATOR'])
    
    print(f"Total de registros processados: {len(consolidated_df)}")
    
    # Cria diretório do banco se não existir
    os.makedirs("src/database", exist_ok=True)
    
    # Cria banco SQLite
    conn = sqlite3.connect('src/database/ibama_data.db')
    
    # Salva os dados no banco
    consolidated_df.to_sql('autos_infracao', conn, if_exists='replace', index=False)
    
    # Cria índices para otimizar buscas
    cursor = conn.cursor()
    
    # Índices para busca por nome
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_nome_normalizado ON autos_infracao(NOME_NORMALIZADO)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_nome_infrator ON autos_infracao(NOME_INFRATOR)')
    
    # Índices para busca por descrição
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_desc_normalizada ON autos_infracao(DESC_NORMALIZADA)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_desc_infracao_normalizada ON autos_infracao(DESC_INFRACAO_NORMALIZADA)')
    
    # Índices para relatórios
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_ano ON autos_infracao(ANO)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_valor ON autos_infracao(VAL_AUTO_INFRACAO)')
    
    conn.commit()
    conn.close()
    
    print("Banco de dados criado com sucesso em src/database/ibama_data.db")

if __name__ == "__main__":
    process_ibama_data()

