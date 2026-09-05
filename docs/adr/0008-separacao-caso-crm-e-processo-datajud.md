# Separação entre Caso do CRM e Processo Judicial DataJud

Decidimos modelar a entidade casos no CRM como o agrupador superior das demandas do cliente (sejam consultivas, extrajudiciais ou litigiosas), mantendo uma relação de 1 para N (opcional) com a tabela processos já existente do JusTrack.

- Prazos, tarefas, minutas, modelos de documentos e a pasta do Google Drive são vinculados diretamente ao caso.
- O monitoramento de movimentações judiciais via DataJud/n8n continua operando na tabela processos, agora apontando opcionalmente para um caso_id.
- Casos extrajudiciais ou em fase de acordo pré-processual podem existir e ser operados no CRM sem a necessidade de um número CNJ.

Alternativas consideradas:
- **Evolução direta da tabela processos com CNJ nulo**: descartada por poluir a lógica do robô de monitoramento DataJud com demandas puramente consultivas e administrativas do escritório.
