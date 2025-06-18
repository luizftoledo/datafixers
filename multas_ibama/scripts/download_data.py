import os
import urllib.request
import zipfile

def download_ibama_data():
    """Baixa os dados do IBAMA"""
    print("Baixando dados do IBAMA...")
    
    url = "https://dadosabertos.ibama.gov.br/dados/SIFISC/auto_infracao/auto_infracao/auto_infracao_csv.zip"
    filename = "auto_infracao_csv.zip"
    
    # Cria diretório de dados se não existir
    os.makedirs("data", exist_ok=True)
    
    # Baixa o arquivo
    urllib.request.urlretrieve(url, f"data/{filename}")
    print(f"Arquivo {filename} baixado com sucesso!")
    
    # Extrai o arquivo
    with zipfile.ZipFile(f"data/{filename}", 'r') as zip_ref:
        zip_ref.extractall("data/")
    
    print("Dados extraídos com sucesso!")
    
    # Remove o arquivo zip
    os.remove(f"data/{filename}")
    print("Arquivo zip removido.")

if __name__ == "__main__":
    download_ibama_data()

