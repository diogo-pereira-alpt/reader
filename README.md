# Excel Reader - AI Initiatives

Uma aplicação web moderna para leitura e visualização de dados de iniciativas de IA a partir de arquivos Excel.

## 🚀 Funcionalidades

- **Upload Drag & Drop**: Interface intuitiva para upload de arquivos Excel
- **Leitura Inteligente**: Detecção automática de cabeçalhos e estruturas de dados
- **Visualização Dual**: Modos de tabela e visualização individual
- **Filtros Avançados**: Sistema de filtros por múltiplos campos
- **Export PDF**: Exportação individual ou em lote para PDF
- **Interface Responsiva**: Design moderno e responsivo

## 🛠️ Tecnologias

- **Next.js 14** - Framework React para produção
- **TypeScript** - Tipagem estática
- **Tailwind CSS** - Framework de estilos
- **shadcn/ui** - Componentes de interface
- **XLSX** - Leitura de arquivos Excel
- **jsPDF** - Geração de PDFs

## 📊 Formato de Dados Suportado

A aplicação é otimizada para ler arquivos Excel com as seguintes colunas:
- WS (Workspace)
- Aligned/Prioritised
- Initiative Name
- Initiative Description
- Feasibility
- Risks
- Estimated Impact
- Initiative Owner
- Main Area
- Archetypes
- Initiative Name Ideation Session
- Initiative Description Ideation Session

## 🚀 Como Usar

1. Acesse a aplicação
2. Faça upload do seu arquivo Excel (.xlsx ou .xls)
3. Visualize os dados em formato de tabela ou individual
4. Use os filtros para encontrar iniciativas específicas
5. Exporte para PDF conforme necessário

## 🔧 Desenvolvimento Local

```bash
# Clone o repositório
git clone https://github.com/diogo-pereira-alpt/reader.git

# Instale as dependências
npm install

# Execute em modo de desenvolvimento
npm run dev

# Build para produção
npm run build
```

## 📝 Deploy

A aplicação é automaticamente deployada no GitHub Pages através de GitHub Actions sempre que há um push para a branch main.

## 📄 Licença

Este projeto está sob a licença MIT.
