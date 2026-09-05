# Geração de Documentos Jurídicos Client-Side com docxtemplater

Decidimos adotar templates em formato .docx processados no frontend via biblioteca client-side (docxtemplater + pizzip). O sistema substitui marcadores dinâmicos da qualificação jurídica do cliente e dados do caso diretamente na máquina do usuário, gerando o arquivo .docx final para download e posterior exportação para PDF.

Alternativas consideradas:
- **Renderização de PDF em HTML/React (@react-pdf/renderer)**: descartada porque advogados frequentemente necessitam revisar e personalizar cláusulas antes do fechamento, o que o formato PDF estático inviabiliza.
- **Microserviço backend de conversão com LibreOffice/Puppeteer**: descartado para o MVP pela alta complexidade de infraestrutura e custo operacional desnecessário para um escritório de 4 usuários.
