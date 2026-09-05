## Problem Statement

O escritório de advocacia Dr. Edvaldo Rodrigues Ferreira (composto por 2 advogados, 1 estagiário e 1 secretária) possui um fluxo de trabalho operacional e comercial descentralizado: o controle de clientes e leads é feito de maneira manual ou informal, a qualificação jurídica de partes para elaboração de procurações e contratos de honorários exige retrabalho de digitação em modelos Word avulsos, os arquivos de casos ficam dispersos sem uma padronização na nuvem e o controle de prazos e tarefas corre o risco de desatenção. Além disso, estagiários e secretárias precisam colaborar no atendimento e confecção de minutas, mas sem que tenham acesso a dados financeiros sigilosos de contratos e honorários.

## Solution

Implementar uma extensão administrativa integrada ao painel existente do JusTrack (AdminLayout), contendo um CRM Jurídico completo com:
1. Gestão unificada de clientes e ciclo de vida (lead → consulta → tivo → encerrado) com qualificação jurídica completa;
2. Dossiê de casos (consultivos, extrajudiciais ou contenciosos) com conexão 1:N aos processos judiciais monitorados no DataJud;
3. Agenda com gestão de prazos fatais e tarefas com notificações automáticas por e-mail;
4. Motor client-side de geração de documentos em formato .docx com preenchimento automático a partir do cadastro do cliente/caso;
5. Integração centralizada com Google Drive do escritório via Google Cloud Service Account;
6. Controle de acesso baseado em papéis (RBAC) com isolamento rigoroso de contratos financeiros para advogados via RLS e conformidade de retenção de dados com a LGPD e o Estatuto da OAB.

## User Stories

1. Como secretária, quero cadastrar rapidamente um novo lead com nome e WhatsApp para que a equipe jurídica tenha ciência do novo contato comercial.
2. Como secretária, quero registrar uma anotação de ligação ou mensagem de WhatsApp no histórico do cliente para que todos saibam o contexto da conversa.
3. Como secretária, quero agendar uma consulta inicial com data e hora para que o advogado responsável organize seu calendário de atendimentos.
4. Como advogado, quero visualizar o funil de clientes por estágios (lead, consulta, ativo, encerrado) para acompanhar a taxa de conversão e gargalos de atendimento.
5. Como advogado, quero mover um cliente de "lead" para "consulta" e depois para "ativo" com um clique para refletir a contratação do escritório.
6. Como advogado, quero preencher a qualificação jurídica detalhada de uma Pessoa Física (nacionalidade, estado civil, profissão, RG, CPF, endereço completo) para alimentar as procurações e petições sem redigitação.
7. Como advogado, quero preencher a qualificação jurídica de uma Pessoa Jurídica (razão social, CNPJ, inscrição estadual, sócio representante) para atendimento a empresas.
8. Como advogado ou estagiário, quero criar um novo Caso vinculado a um cliente com tipo de demanda (judicial, extrajudicial ou consultivo) para organizar o trabalho técnico contratado.
9. Como advogado, quero definir a visibilidade de um caso como "privado" para que apenas eu e os colaboradores explicitamente delegados tenham acesso aos autos e notas.
10. Como advogado, quero definir a visibilidade de um caso como "colegiado" para que toda a equipe jurídica possa colaborar na elaboração das peças.
11. Como advogado ou estagiário, quero vincular um ou mais processos judiciais (com número CNJ existente no JusTrack) a um Caso para centralizar movimentações e dados processuais no dossiê do cliente.
12. Como advogado, quero cadastrar os termos do contrato financeiro de honorários (valor fixo, parcelas, percentual de êxito e dados bancários) em um caso para controlar os recebíveis do escritório.
13. Como estagiário, quero consultar um caso colegiado para redigir peças e anexar documentos sem ter acesso ou visibilidade aos valores dos honorários advocatícios combinados com o cliente.
14. Como secretária, quero visualizar os dados básicos de contato do cliente para agendar reuniões sem ter acesso ao mérito confidencial de processos reservados ou dados financeiros.
15. Como advogado ou estagiário, quero cadastrar um Prazo Fatal com data e horário limite preclusivo para garantir que nenhum prazo de contestação, recurso ou manifestação seja perdido.
16. Como advogado ou estagiário, quero cadastrar uma Tarefa Operacional interna (ex.: recolher guias, juntar certidões, revisar procuração) atribuindo a um colaborador para dividir o trabalho da banca.
17. Como advogado ou estagiário, quero receber lembretes automáticos por e-mail 48h e 24h antes do vencimento de um prazo fatal para não depender exclusivamente de checagens manuais diárias.
18. Como advogado ou estagiário, quero marcar uma tarefa ou prazo como concluído para que a equipe saiba que a pendência foi sanada.
19. Como advogado, quero gerenciar modelos padrão de documentos em .docx (Procuração Geral, Contrato de Honorários, Notificação Extrajudicial) com variáveis dinâmicas demarcadas prontas para injeção.
20. Como advogado ou estagiário, quero selecionar um modelo de documento e clicar em "Gerar Documento" para baixar instantaneamente o .docx preenchido com a qualificação civil do cliente e os dados do caso.
21. Como advogado, quero abrir o .docx gerado no meu editor de texto preferido (Word / LibreOffice / Google Docs) para realizar ajustes finos de redação antes de colher a assinatura do cliente.
22. Como advogado ou estagiário, quero fazer upload de um documento probatório ou peça assinada na ficha do caso para que ele seja automaticamente enviado para a pasta do cliente/caso no Google Drive do escritório.
23. Como usuário do escritório, quero acessar um link direto para a pasta sincronizada do caso no Google Drive para consultar ou incluir arquivos pesados quando necessário.
24. Como titular de dados (lead prospecção que não fechou contrato), quero solicitar a exclusão de meus dados de contato para que o escritório purgue meu cadastro em conformidade com a LGPD.
25. Como advogado do escritório, quero que o sistema impeça a exclusão física inadvertida de clientes que possuem contratos firmados ou casos em andamento, mantendo o arquivamento sob custódia legal protegida por 5 anos conforme exigência da OAB e do Código Civil.

## Implementation Decisions

- **Módulos no Frontend**: Expansão do AdminLayout com nova seção de rotas /admin/crm/* (/clientes, /clientes/:id, /casos, /casos/:id, /agenda, /modelos).
- **Entidade Única de Contato**: O domínio utiliza Cliente como entidade única para todo o funil, diferenciando estágios através do enum status_ciclo: lead | consulta | ativo | encerrado. A qualificação civil é opcional na entrada e validada nos pontos de uso.
- **Diferenciação de Caso e Processo**: A entidade casos agrupa todas as demandas de um cliente e possui relacionamento relacional 1:N opcional com a tabela processos pré-existente do JusTrack.
- **Isolamento de Contratos Financeiros (RBAC/RLS)**: Dados pecuniários e termos de pagamento são segregados na tabela contratos_financeiros com RLS no PostgreSQL permitindo operações de SELECT, INSERT e UPDATE exclusivamente para o papel dvogado.
- **Motor Client-Side de Minutas**: A geração de documentos .docx é processada inteiramente no navegador via docxtemplater e pizzip, gerando arquivos editáveis para download imediato.
- **Armazenamento no Google Drive**: Uploads e árvore de diretórios /{Cliente}/{Caso}/ são gerenciados por uma Google Cloud Service Account com permissões na pasta raiz do escritório, orquestrada por Supabase Edge Functions.
- **Disparo de Lembretes de Prazos**: Uma Supabase Scheduled Edge Function executa diariamente às 07:00 da manhã, identificando prazos a vencer em 24h e 48h e disparando os e-mails transacionais.
- **Retenção e Exclusão LGPD**: Hard Delete é implementado apenas para leads sem vínculos contratuais. Clientes com casos ou procurações usam Soft Delete com custódia de 5 anos via integridade relacional ON DELETE RESTRICT.

## Testing Decisions

- **Definição de Bom Teste**: Testes devem validar comportamentos externos observáveis e regras de negócio invariantes, e não a implementação interna de componentes ou hooks.
- **Módulos a Testar**:
  1. *Motor de Geração DOCX*: Validação da injeção de variáveis de qualificação jurídica em arquivo template .docx gerando o buffer válido.
  2. *Regras de Transição de Ciclo de Vida do Cliente*: Validação de transição de lead para ativo e verificação dos requisitos de qualificação jurídica antes de emissão de minutas.
  3. *Políticas de Isolamento Financeiro (RBAC)*: Validação de que consultas simulando perfis de estagiário e secretária não retornam registros da tabela contratos_financeiros.
  4. *Lógica de Janela de Prazos*: Validação do filtro de prazos que aciona os alertas de 24h e 48h.
- **Prior Art**: Integração com a suíte de testes Vitest já configurada no projeto em src/test/.

## Out of Scope

- Integração nativa com APIs de mensageria ativa do WhatsApp (como disparos de campanhas automatizadas em massa); as interações com WhatsApp no MVP são registradas manualmente pela equipe.
- Assinatura eletrônica embutida na plataforma (DocuSign / Gov.br API no MVP); os advogados utilizam seus certificados digitais ou portais governamentais externos sobre os PDFs gerados.
- Emissão de notas fiscais de serviços jurídicos e boletos bancários integrados a gateways no MVP.

## Further Notes

- A stack tecnológica adotada é React 18, TypeScript, Tailwind CSS, Supabase (PostgreSQL, Auth, Storage, Edge Functions), docxtemplater, pizzip e Google Drive API v3.
- Os modelos de documentos padrão serão armazenados em um bucket privado no Supabase Storage e sincronizados na inicialização da aplicação.
