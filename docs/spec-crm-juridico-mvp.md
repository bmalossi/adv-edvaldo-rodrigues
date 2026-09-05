# Especificação Técnica e Funcional — CRM Jurídico MVP

**Escritório:** Advocacia Dr. Edvaldo Rodrigues Ferreira  
**Time Alvo:** 2 Advogados, 1 Estagiário, 1 Secretária  
**Status:** Consolidado pós-Grill-me & Modelagem de Domínio  

---

## 1. Escopo Funcional Fechado do MVP

### 1.1 Gestão de Clientes e Funil Comercial
- **Cadastro unificado de Clientes** (Pessoa Física e Pessoa Jurídica) com controle de ciclo de vida (lead → consulta → tivo → encerrado).
- **Campos de Qualificação Jurídica completa** (nacionalidade, estado civil, profissão, RG, CPF/CNPJ, endereço residencial/comercial) opcionais na captação inicial e validados ao redigir documentos ou ajuizar demandas.
- **Histórico cronológico de interações** manuais (ligações, reuniões presenciais, conversas no WhatsApp).
- **Filtros e Visualizações:** Visão de Funil / Lista por estágio comercial e pesquisa instantânea por nome, CPF ou etiqueta.

### 1.2 Gestão de Casos e Conexão com Processos
- **Módulo de Casos**: Demandas consultivas, extrajudiciais ou contenciosas vinculadas a um cliente.
- **Relacionamento 1:N com a tabela processos** existente do JusTrack (um caso pode ter 0, 1 ou mais processos com monitoramento automático DataJud/n8n).
- **Visibilidade da Carteira configurável**: cada caso é marcado como privado (restrito ao responsável e colaboradores delegados) ou colegiado (visível para a equipe jurídica).

### 1.3 Agenda, Prazos Fatais e Tarefas
- **Registro de Prazos Fatais** (com data/hora preclusiva, tribunal e tipo de manifestação) e **Tarefas Operacionais** com responsável atribuído.
- **Lembretes automáticos por e-mail** (24h e 48h antes do vencimento) disparados via rotina agendada (Supabase Cron / Edge Function).

### 1.4 Geração Automática de Documentos
- **Processamento Client-Side de DOCX** via docxtemplater + pizzip.
- Upload e manutenção de **Modelos de Documentos** padrão (.docx com variáveis dinâmicas: {nome_cliente}, {cpf_cnpj}, {estado_civil}, {endereco}, {numero_processo}, etc.).
- Preenchimento em lote no navegador com 1 clique e download imediato do .docx pronto para edição e salvamento em PDF.

### 1.5 Integração com Google Drive
- Integração corporativa via **Google Cloud Service Account**.
- O escritório compartilha a pasta raiz com a Service Account.
- Criação automática da hierarquia de pastas: /{Nome_Cliente_ID}/{Titulo_Caso_ID}/.
- Upload e visualização de documentos armazenados diretamente no Google Drive através de Edge Functions intermediárias.

### 1.6 Segurança e Controle de Acesso (RBAC)
- 3 Papéis de Acesso: dvogado, estagiario, secretaria.
- **Isolamento de Contratos Financeiros/Honorários**: tabela dedicada com Row-Level Security (RLS) que bloqueia SELECT/INSERT/UPDATE para estagiários e secretárias.
- **LGPD & Retenção**: Exclusão física permitida para leads sem casos; arquivamento lógico com guarda obrigatória de 5 anos (Custódia Legal) para clientes contratados.

---

## 2. Modelo de Dados (PostgreSQL / Supabase)

### 2.1 Tabela perfis (Extensão de uth.users)
- id (uuid, PK, references uth.users.id)
- 
ome (text, not null)
- email (text, not null)
- papel (text, not null, check papel in ('advogado', 'estagiario', 'secretaria'))
- oab (text, nullable)
- 	elefone (text, nullable)
- tivo (boolean, default true)
- created_at / updated_at (timestamptz)

### 2.2 Tabela clientes
- id (uuid, PK, default gen_random_uuid())
- 	ipo_pessoa (text, not null, default 'PF', check 	ipo_pessoa in ('PF', 'PJ'))
- 
ome_razao_social (text, not null)
- 
ome_fantasia (text, nullable)
- cpf_cnpj (text, nullable)
- g_ie (text, nullable)
- 
acionalidade (text, nullable)
- estado_civil (text, nullable)
- profissao (text, nullable)
- email (text, nullable)
- 	elefone_whatsapp (text, not null)
- endereco_logradouro (text, nullable)
- endereco_numero (text, nullable)
- endereco_complemento (text, nullable)
- endereco_bairro (text, nullable)
- endereco_cidade (text, nullable)
- endereco_uf (text, nullable)
- endereco_cep (text, nullable)
- status_ciclo (text, not null, default 'lead', check status_ciclo in ('lead', 'consulta', 'ativo', 'encerrado'))
- origem_contato (text, nullable)
- observacoes_iniciais (text, nullable)
- isibilidade (text, not null, default 'colegiado', check isibilidade in ('colegiado', 'privado'))
- esponsavel_id (uuid, references perfis.id)
- google_drive_folder_id (text, nullable)
- deleted_at (timestamptz, nullable) -- Soft Delete para custódia legal
- created_at / updated_at (timestamptz)

### 2.3 Tabela interacoes_cliente
- id (uuid, PK, default gen_random_uuid())
- cliente_id (uuid, not null, references clientes.id on delete cascade)
- utor_id (uuid, not null, references perfis.id)
- 	ipo (text, not null, check 	ipo in ('ligacao', 'reuniao', 'whatsapp', 'email', 'nota_interna'))
- descricao (text, not null)
- data_interacao (timestamptz, default now())
- created_at (timestamptz)

### 2.4 Tabela casos
- id (uuid, PK, default gen_random_uuid())
- cliente_id (uuid, not null, references clientes.id on delete restrict)
- 	itulo (text, not null)
- descricao (text, nullable)
- rea_direito (text, not null) -- Trabalhista, Cível, Previdenciário, etc.
- 	ipo_demanda (text, not null, check 	ipo_demanda in ('judicial', 'extrajudicial', 'consultivo'))
- status (text, not null, default 'em_andamento', check status in ('analise', 'em_andamento', 'aguardando_documentos', 'concluido', 'arquivado'))
- isibilidade (text, not null, default 'colegiado', check isibilidade in ('colegiado', 'privado'))
- esponsavel_id (uuid, not null, references perfis.id)
- google_drive_folder_id (text, nullable)
- created_at / updated_at (timestamptz)

### 2.5 Tabela caso_colaboradores (Delegações em Casos Privados)
- id (uuid, PK, default gen_random_uuid())
- caso_id (uuid, not null, references casos.id on delete cascade)
- perfil_id (uuid, not null, references perfis.id on delete cascade)
- permissao (text, not null, default 'editor', check permissao in ('leitor', 'editor'))

### 2.6 Tabela contratos_financeiros (Blindada por RLS para Advogados)
- id (uuid, PK, default gen_random_uuid())
- caso_id (uuid, not null, unique, references casos.id on delete cascade)
- 	ipo_honorario (text, not null, check 	ipo_honorario in ('fixo', 'exito', 'misto', 'mensal'))
- alor_total (numeric(12,2), nullable)
- alor_entrada (numeric(12,2), nullable)
- 
umero_parcelas (integer, default 1)
- percentual_exito (numeric(5,2), nullable)
- condicoes_pagamento (text, nullable)
- dados_bancarios (text, nullable)
- created_at / updated_at (timestamptz)

### 2.7 Tabela prazos_tarefas
- id (uuid, PK, default gen_random_uuid())
- caso_id (uuid, not null, references casos.id on delete cascade)
- processo_id (uuid, nullable, references processos.id on delete set null)
- 	ipo (text, not null, check 	ipo in ('prazo_fatal', 'tarefa'))
- 	itulo (text, not null)
- descricao (text, nullable)
- data_hora_limite (timestamptz, not null)
- tribuido_a (uuid, not null, references perfis.id)
- status (text, not null, default 'pendente', check status in ('pendente', 'em_execucao', 'concluido', 'cancelado'))
- prioridade (text, not null, default 'media', check prioridade in ('baixa', 'media', 'alta', 'urgente'))
- 
otificado_24h (boolean, default false)
- 
otificado_48h (boolean, default false)
- concluido_em (timestamptz, nullable)
- concluido_por (uuid, nullable, references perfis.id)
- created_at / updated_at (timestamptz)

### 2.8 Tabela modelos_documentos
- id (uuid, PK, default gen_random_uuid())
- 
ome (text, not null)
- descricao (text, nullable)
- categoria (text, not null) -- Procuração, Contrato de Honorários, Notificação, etc.
- rquivo_template_url (text, not null) -- Caminho do .docx no Supabase Storage
- ariaveis_disponiveis (jsonb, not null) -- Ex: ["nome_cliente", "cpf_cnpj", "valor_honorarios"]
- criado_por (uuid, references perfis.id)
- created_at / updated_at (timestamptz)

### 2.9 Tabela documentos_casos
- id (uuid, PK, default gen_random_uuid())
- caso_id (uuid, not null, references casos.id on delete cascade)
- 
ome_arquivo (text, not null)
- mime_type (text, not null)
- 	amanho_bytes (bigint, not null)
- google_drive_file_id (text, not null)
- google_drive_web_url (text, not null)
- 	ipo_documento (text, not null, default 'anexo', check 	ipo_documento in ('procuracao', 'contrato', 'peticao', 'comprovante', 'anexo'))
- enviado_por (uuid, references perfis.id)
- created_at (timestamptz)

---

## 3. Arquitetura Técnica Proposta

`
[ Frontend: React / TypeScript / Vite / Tailwind ]
  ├── Shell Unificado: AdminLayout.tsx
  │     ├── JusTrack (/admin, /admin/processos, /admin/notificacoes)
  │     ├── Conteúdo Jurídico (/admin/artigos/*)
  │     └── CRM Jurídico (/admin/crm/*)
  │           ├── /clientes (Funil Kanban & Tabela com busca)
  │           ├── /clientes/:id (Ficha completa, interações, casos)
  │           ├── /casos & /casos/:id (Dossiê, prazos, docs Drive)
  │           ├── /agenda (Prazos Fatais e Tarefas)
  │           └── /modelos (Gerador DOCX client-side)
  └── Motor Client-Side de Minutas: docxtemplater + pizzip + file-saver

[ Backend & Dados: Supabase ]
  ├── PostgreSQL Database com RLS rígido por papel (perfis.papel)
  │     └── RLS restringe contratos_financeiros a advogados
  ├── Supabase Storage (Bucket privado para modelos base de .docx)
  ├── Supabase Edge Functions:
  │     ├── drive-auth-service (Gerencia Service Account JWT & API Google Drive)
  │     ├── drive-sync (Cria pastas Cliente/Caso e faz upload/download)
  │     └── cron-prazo-notifier (Rotina matinal de despacho de lembretes por e-mail)
  └── Triggers / Constraints:
        └── Integridade relacional impedindo exclusão física de clientes com casos

[ Integrações Externas ]
  ├── Google Cloud Console: Service Account com Drive API v3 ativada
  ├── Provedor Transacional de E-mail (Resend / SMTP)
  └── JusTrack / DataJud / n8n (Monitoramento processual já ativo)
`

---

## 4. Plano de Fases e Entregáveis

| Fase | Entregáveis | Critérios de Aceite |
| :--- | :--- | :--- |
| **Fase 1: Fundação do Banco & RBAC** | Migrations PostgreSQL (perfis, clientes, casos, contratos_financeiros, prazos_tarefas), RLS configurado, tipos TypeScript. | Migrations rodando sem erros; RLS validado bloqueando estagiário em dados financeiros. |
| **Fase 2: Gestão de Clientes & Funil** | Telas de Funil Kanban e Tabela de Clientes, formulário com validação de Qualificação Jurídica, timeline de interações. | Cadastro completo de PF/PJ; transição fluida entre estágios do ciclo de vida; busca instantânea. |
| **Fase 3: Casos, Prazos & Agenda** | Dossiê do Caso, associação 1:N com processos do JusTrack, calendário/lista de prazos fatais e tarefas com status. | Criação de caso judicial/extrajudicial; vinculação opcional a processo CNJ existente; listagem de prazos da semana. |
| **Fase 4: Motor de Documentos DOCX** | Gerenciador de modelos .docx, parser de variáveis dinâmicas, tela de emissão de procuração e contrato de honorários. | Download imediato de documento preenchido com dados do cliente com 1 clique no navegador. |
| **Fase 5: Google Drive & Lembretes** | Edge Functions para Service Account Google Drive (criação de pastas e uploads); Cron function para avisos de prazos por e-mail. | Pastas criadas na árvore correta no Drive do escritório; e-mail de alerta de prazo recebido com sucesso. |

---

## 5. Matriz de Riscos e Mitigações

1. **Risco de Quota ou Latência na API do Google Drive**
   - *Mitigação:* Armazenar os IDs e URLs das pastas e arquivos localmente no PostgreSQL; o frontend só invoca a API do Drive em ações de upload, download ou abertura direta, sem fazer listagens síncronas em massa na inicialização de telas.
2. **Risco de Corrupção de Tags no DOCX (docxtemplater)**
   - *Mitigação:* Fornecer no sistema um validador de sintaxe para os modelos .docx e pré-cadastrar os modelos padrão do escritório (Procuração Geral para o Foro, Contrato de Honorários Cíveis e Trabalhistas).
3. **Risco de Perda de Prazo Fatal**
   - *Mitigação:* Notificações em camadas: (1) alerta destacado em vermelho no dashboard ao logar; (2) lembrete matinal automático por e-mail 48h e 24h antes; (3) registro de confirmação de leitura/conclusão da tarefa.
4. **Risco de Vazamento de Honorários para Estagiários**
   - *Mitigação:* Tabela de dados financeiros isolada fisicamente e protegida por RLS no nível do PostgreSQL.

---

## 6. Checklist de Segurança e LGPD Aplicável

- [x] **Autenticação Centralizada**: Uso do Supabase Auth com senhas criptografadas e tokens JWT assinados.
- [x] **Row-Level Security (RLS)**: Todas as novas tabelas possuem RLS habilitado, garantindo que usuários não autenticados não tenham acesso.
- [x] **Controle de Acesso Baseado em Papéis (RBAC)**: Proteção em nível de banco para tabelas e rotas sensíveis aos perfis dvogado, estagiario e secretaria.
- [x] **Custódia Legal (5 anos)**: Proibição de Hard Delete em clientes com serviços e contratos celebrados (Art. 7º, II e VI da LGPD).
- [x] **Exclusão do Titular para Prospecções**: Exclusão definitiva permitida para leads sem vínculos jurídicos.
- [x] **Service Account com Escopo Mínimo**: A credencial do Google Drive fica restrita à pasta compartilhada com a Service Account no backend, sem acesso a outros diretórios privados da conta dos advogados.
- [x] **Registro de Auditoria**: Campos created_by, updated_at, concluido_por presentes em tarefas, prazos e movimentações documentais.
