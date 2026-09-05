# Tickets: CRM Jurídico MVP

Quebra em fatias verticais (*tracer bullets*) com base na especificação [spec-crm-prd.md](./spec-crm-prd.md) e na issue principal [#1](https://github.com/bmalossi/adv-edvaldo-rodrigues/issues/1).

Trabalhe na **fronteira**: qualquer ticket cujos bloqueadores estejam concluídos.

---

## [#2 - 1. Fundação do Modelo de Acesso (RBAC) e Ficha Cadastral de Clientes](https://github.com/bmalossi/adv-edvaldo-rodrigues/issues/2)

**What to build:** Estruturar a autenticação e perfis com controle de acesso baseado em papéis (\dvogado\, \estagiario\, \secretaria\) e entregar o módulo de cadastro e gestão de Clientes. A interface deve permitir listar, pesquisar instantaneamente por CPF/CNPJ ou nome, e preencher a Qualificação Jurídica completa de Pessoa Física e Jurídica com validação de status do ciclo de vida (\lead\ a \tivo\).

**Blocked by:** None — can start immediately

- [ ] Perfis de usuário com papel (\dvogado\, \estagiario\, \secretaria\) integrados à sessão do Supabase Auth.
- [ ] Tabela e interface de listagem de Clientes com busca em tempo real por nome ou documento.
- [ ] Formulário de Qualificação Jurídica completa (PF com estado civil, profissão, RG, CPF, endereço; PJ com razão social, CNPJ, IE).
- [ ] Regra de integridade: campos de qualificação são opcionais para leads, mas validados ao mover para ativo.
- [ ] Teste automatizado validando a transição de status do cliente e consistência cadastral.

---

## [#3 - 2. Funil Comercial de Captação e Timeline de Interações](https://github.com/bmalossi/adv-edvaldo-rodrigues/issues/3)

**What to build:** Implementar a visualização em colunas (Funil Kanban) do ciclo de vida dos clientes (\lead\, \consulta\, \tivo\, \encerrado\) com capacidade de movimentar o cliente entre os estágios, além da aba de histórico cronológico na ficha do cliente para registro manual de interações (ligações telefônicas, WhatsApp, reuniões presenciais e notas internas).

**Blocked by:** [#2](https://github.com/bmalossi/adv-edvaldo-rodrigues/issues/2)

- [ ] Tela de Funil Kanban por estágios de relacionamento com contadores de clientes por coluna.
- [ ] Mecanismo de movimentação de estágio comercial com atualização em tempo real no banco.
- [ ] Timeline de interações na ficha do cliente permitindo adicionar registro com autor, data, canal e nota descritiva.
- [ ] Opção de agendamento de consulta com data/hora diretamente vinculada ao cliente.
- [ ] Teste automatizado validando a criação e ordenação cronológica das interações do cliente.

---

## [#4 - 3. Dossiê de Casos com Carteira Híbrida e Conexão ao JusTrack](https://github.com/bmalossi/adv-edvaldo-rodrigues/issues/4)

**What to build:** Implementar o módulo de Casos (demandas consultivas, extrajudiciais ou contenciosas vinculadas a um cliente) com controle de visibilidade da carteira (\colegiado\ vs. \privado\ com delegação de colaboradores) e relacionamento opcional de 1:N com processos judiciais já existentes no JusTrack monitorados pelo DataJud.

**Blocked by:** [#2](https://github.com/bmalossi/adv-edvaldo-rodrigues/issues/2)

- [ ] Tabela e interface de Casos com tipo de demanda (\judicial\, \extrajudicial\, \consultivo\), área do direito e status.
- [ ] Mecanismo de visibilidade (\colegiado\ acessível à equipe; \privado\ restrito ao responsável e colaboradores atribuídos via \caso_colaboradores\).
- [ ] Associação opcional de 1 ou mais processos CNJ existentes do JusTrack ao Caso.
- [ ] Dossiê visual do caso centralizando dados do cliente, processos conexos e notas.
- [ ] Teste automatizado validando a política de visibilidade privada versus colegiada.

---

## [#5 - 4. Isolamento de Contratos Financeiros e Honorários com RLS](https://github.com/bmalossi/adv-edvaldo-rodrigues/issues/5)

**What to build:** Implementar a gestão de termos pecuniários e contratos de honorários vinculados a um caso (valores fixos, parcelamento, percentual de êxito e dados bancários) em entidade isolada, estritamente blindada por Row-Level Security (RLS) para que apenas usuários com papel de advogado possam consultar ou editar valores.

**Blocked by:** [#4](https://github.com/bmalossi/adv-edvaldo-rodrigues/issues/4)

- [ ] Tabela \contratos_financeiros\ vinculada a \casos.id\.
- [ ] Políticas RLS no PostgreSQL restringindo \SELECT\, \INSERT\ e \UPDATE\ estritamente a usuários com \papel = 'advogado'\.
- [ ] Interface de gestão de honorários na ficha do caso visível apenas para advogados (completamente oculta e inacessível para estagiários e secretárias).
- [ ] Teste automatizado de RLS comprovando que consultas simulando perfil de estagiário recebem zero registros ou erro de permissão.

---

## [#6 - 5. Gestão de Agenda, Prazos Fatais e Tarefas Operacionais](https://github.com/bmalossi/adv-edvaldo-rodrigues/issues/6)

**What to build:** Implementar a interface de Agenda e Prazos com distinção estrita entre Prazos Fatais (com efeito preclusivo judicial) e Tarefas Operacionais (atribuíveis a colaboradores), incluindo visualização por calendário/lista e despacho de lembretes automáticos por e-mail com antecedência de 48h e 24h via Supabase Cron / Edge Function.

**Blocked by:** [#4](https://github.com/bmalossi/adv-edvaldo-rodrigues/issues/4)

- [ ] Tela de Agenda e Prazos com filtros por colaborador responsável, status (\pendente\, \em_execucao\, \concluido\) e tipo (\prazo_fatal\ vs \	arefa\).
- [ ] Destaque visual e de prioridade máxima para Prazos Fatais com indicação clara do tempo restante.
- [ ] Conclusão de tarefas e prazos com registro de data/hora e usuário executor.
- [ ] Rotina agendada (Supabase Cron / Edge Function) para verificação diária de prazos a vencer em 48h e 24h e envio de e-mails de alerta.
- [ ] Teste automatizado validando a query e filtragem de prazos nas janelas de alerta de 48h e 24h.

---

## [#7 - 6. Motor Client-Side de Emissão de Minutas e Documentos DOCX](https://github.com/bmalossi/adv-edvaldo-rodrigues/issues/7)

**What to build:** Implementar o motor de geração de documentos em formato \.docx\ processado inteiramente no navegador via \docxtemplater\ e \pizzip\. O módulo permitirá gerenciar templates padrão (Procuração, Contrato de Honorários, Notificações) com variáveis dinâmicas e preencher instantaneamente as informações da qualificação jurídica do cliente e dados do caso, gerando o arquivo pronto para download e edição.

**Blocked by:** [#2](https://github.com/bmalossi/adv-edvaldo-rodrigues/issues/2), [#4](https://github.com/bmalossi/adv-edvaldo-rodrigues/issues/4)

- [ ] Biblioteca de modelos padrão (\.docx\) cadastrados e armazenados no Supabase Storage com mapeamento de variáveis dinâmicas.
- [ ] Mecanismo client-side de substituição de variáveis (\
ome_cliente\, \cpf_cnpj\, \estado_civil\, \endereco\, \
umero_processo\, etc.) sem envio de dados para servidores terceiros.
- [ ] Botão de ação \"Gerar Documento\" na ficha do caso/cliente com seleção de modelo e download imediato do \.docx\ processado.
- [ ] Validação prévia de campos obrigatórios da qualificação civil antes de disparar a geração.
- [ ] Teste automatizado validando a injeção correta de dados em template \.docx\ de teste retornando buffer de arquivo íntegro.

---

## [#8 - 7. Sincronização de Documentos com Google Drive (Service Account)](https://github.com/bmalossi/adv-edvaldo-rodrigues/issues/8)

**What to build:** Implementar a integração com o Google Drive corporativo do escritório através de uma Google Cloud Service Account com permissão delegada na pasta raiz. O sistema criará programaticamente a estrutura hierárquica de pastas \/{Nome_Cliente_ID}/{Titulo_Caso_ID}/\, permitindo upload direto de arquivos probatórios na ficha do caso e abertura direta da pasta do caso no Google Drive.

**Blocked by:** [#4](https://github.com/bmalossi/adv-edvaldo-rodrigues/issues/4)

- [ ] Supabase Edge Function intermediando a autenticação via Service Account (JWT) com a Google Drive API v3.
- [ ] Criação automática da árvore de pastas \Cliente / Caso\ ao cadastrar novo caso.
- [ ] Upload de documentos jurídicos (\	ipo_documento\, metadados) vinculado ao caso e armazenado no Drive.
- [ ] Listagem de arquivos do caso com link para abertura direta no Google Drive web.
- [ ] Teste automatizado validando a lógica de montagem da árvore de pastas e registro de metadados em \documentos_casos\.
