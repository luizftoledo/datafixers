# 🌿 Consulta de Autos de Infração IBAMA

Sistema web para consulta e análise dos dados de fiscalização ambiental do IBAMA (Instituto Brasileiro do Meio Ambiente e dos Recursos Naturais Renováveis).

## 📋 Funcionalidades

- **Busca por Nome/Empresa**: Pesquise autos de infração por nome de pessoa física ou jurídica (case-insensitive, sem acentos)
- **Busca por Descrição**: Pesquise por palavras-chave na descrição das infrações
- **Relatórios Estatísticos**: Gere relatórios detalhados com estatísticas dos resultados
- **Resumos Jornalísticos**: Crie resumos em estilo jornalístico com IA sobre as infrações encontradas
- **Interface Responsiva**: Design moderno e responsivo para desktop e mobile

## 🚀 Demo

Acesse o sistema em funcionamento: [datafixers.org/multas_ibama](https://datafixers.org/multas_ibama)

## 📊 Dados

O sistema utiliza dados oficiais do IBAMA disponibilizados em:
- **Fonte**: [Dados Abertos IBAMA - Fiscalização](https://dadosabertos.ibama.gov.br/dataset/fiscalizacao-auto-de-infracao)
- **Período**: 1977-2025
- **Total de registros**: 688.251 autos de infração
- **Infratores únicos**: 425.294
- **Valor total das multas**: R$ 105.645.326.259,01

## 🛠️ Tecnologias

### Backend
- **Python 3.11+**
- **Flask** - Framework web
- **SQLite** - Banco de dados
- **Pandas** - Processamento de dados
- **Flask-CORS** - Suporte a CORS

### Frontend
- **HTML5/CSS3/JavaScript**
- **Design responsivo**
- **Interface moderna com gradientes**

## 📦 Instalação

### Pré-requisitos
- Python 3.11 ou superior
- Git

### Passo a passo

1. **Clone o repositório**
```bash
git clone https://github.com/luizftoledo/datafixers.git
cd datafixers/multas_ibama
```

2. **Crie um ambiente virtual**
```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
# ou
venv\Scripts\activate  # Windows
```

3. **Instale as dependências**
```bash
pip install -r requirements.txt
```

4. **Baixe e processe os dados**
```bash
python scripts/download_data.py
python scripts/process_data.py
```

5. **Execute o servidor**
```bash
python src/main.py
```

6. **Acesse o sistema**
Abra seu navegador em: `http://localhost:5000`

## 📁 Estrutura do Projeto

```
multas_ibama/
├── src/
│   ├── main.py              # Aplicação Flask principal
│   ├── models/
│   │   └── ibama_data.py    # Modelo de dados
│   ├── routes/
│   │   ├── search.py        # Rotas de busca
│   │   └── reports.py       # Rotas de relatórios
│   ├── static/
│   │   ├── index.html       # Interface principal
│   │   ├── styles.css       # Estilos CSS
│   │   └── script.js        # JavaScript
│   └── database/
│       └── ibama_data.db    # Banco SQLite
├── scripts/
│   ├── download_data.py     # Script para baixar dados
│   └── process_data.py      # Script para processar dados
├── requirements.txt         # Dependências Python
└── README.md               # Este arquivo
```

## 🔍 Como Usar

### Busca por Nome
1. Digite o nome da pessoa ou empresa no campo "Buscar por Nome/Empresa"
2. Clique em "🔍 Buscar"
3. Visualize os resultados na tabela

### Busca por Descrição
1. Digite palavras-chave da infração no campo "Buscar por Descrição da Infração"
2. Clique em "🔍 Buscar"
3. Visualize os resultados na tabela

### Gerar Relatório
1. Após realizar uma busca, clique em "📊 Gerar Relatório"
2. Visualize estatísticas detalhadas:
   - Total de registros e infratores únicos
   - Valor total das multas
   - Resumo por infrator
   - Detalhamento por ano

### Resumo Jornalístico
1. Após realizar uma busca, clique em "📝 Resumo Jornalístico"
2. Leia um resumo em estilo jornalístico gerado por IA com:
   - Principais infratores
   - Tipos de infrações mais frequentes
   - Estados mais afetados
   - Contexto e análise

## 🌐 Deploy

### Opção 1: Heroku
```bash
# Instale o Heroku CLI
# Crie um app no Heroku
heroku create seu-app-name

# Configure as variáveis de ambiente
heroku config:set FLASK_ENV=production

# Faça o deploy
git push heroku main
```

### Opção 2: Vercel
```bash
# Instale o Vercel CLI
npm i -g vercel

# Faça o deploy
vercel
```

### Opção 3: Docker
```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 5000

CMD ["python", "src/main.py"]
```

## 📈 API Endpoints

### Busca
- `GET /api/search/name?name={nome}&limit={limite}` - Busca por nome
- `GET /api/search/description?description={desc}&limit={limite}` - Busca por descrição
- `GET /api/search/combined?name={nome}&description={desc}&limit={limite}` - Busca combinada

### Relatórios
- `POST /api/reports/statistics` - Gera estatísticas
- `POST /api/reports/summary` - Gera resumo jornalístico

### Exemplo de uso da API
```javascript
// Busca por nome
fetch('/api/search/name?name=SILVA&limit=100')
  .then(response => response.json())
  .then(data => console.log(data));

// Gerar relatório
fetch('/api/reports/statistics', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ results: searchResults })
})
  .then(response => response.json())
  .then(data => console.log(data));
```

## 🤝 Contribuindo

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 📞 Contato

- **Autor**: Luiz Toledo
- **GitHub**: [@luizftoledo](https://github.com/luizftoledo)
- **Projeto**: [DataFixers](https://datafixers.org)

## 🙏 Agradecimentos

- **IBAMA** - Pelos dados abertos de fiscalização ambiental
- **Comunidade Python** - Pelas excelentes bibliotecas utilizadas
- **Contribuidores** - Por melhorias e sugestões

---

**Nota**: Este é um projeto independente para fins educacionais e de transparência. Não possui vinculação oficial com o IBAMA.

