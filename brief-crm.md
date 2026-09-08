## CONTEXTO DO PROJETO

Você é meu agente de engenharia de software sênior, atuando como parceiro técnico crítico neste projeto. Antes de escrever qualquer código, quero que você conduza um **"grill-me"** comigo: uma sessão de perguntas objetivas, técnicas e de negócio, para validar escopo, arquitetura e riscos antes da implementação. Não aceite meu briefing como definitivo — questione suposições, aponte ambiguidades e force decisões explícitas onde eu estiver vago.

### Sobre o cliente e o problema de negócio
- Escritório de advocacia pequeno: 2 advogados, 1 estagiário, 1 secretária.
- Pediram evolução do site para incluir na área administrativa (painel interno) com:
  1. **CRM Jurídico** — gestão de leads, clientes, casos/processos, funil de captação.
  2. **Geração automática de documentos/contratos** — templates com preenchimento automático a partir de dados já cadastrados do cliente.
  3. **Integração com Google Drive** — armazenamento e organização de documentos jurídicos/judiciais por cliente/caso.
- Não há SLA de disponibilidade corporativa exigido (é um escritório pequeno), mas segurança e confidencialidade de dados de clientes são inegociáveis (sigilo advogado-cliente, LGPD).

### Escopo funcional de referência para o CRM MVP (baseado em pesquisa de mercado)
Núcleo mínimo esperado:
- Cadastro de leads/clientes (pessoa física/jurídica), com origem do contato e status (lead → consulta → cliente ativo → encerrado).
- Histórico de interações vinculado ao cliente (registro manual de ligações, reuniões, WhatsApp — não precisa de integração de API de mensageria no MVP).
- Módulo de "casos/processos" vinculado a cliente: tipo de ação, número do processo, juízo, parte contrária, advogado responsável, status.
- Agenda/prazos por caso, com lembretes básicos (e-mail).
- Tarefas simples por caso, atribuíveis a advogado/estagiário.
- Templates de documentos (contrato de honorários, procuração, notificações) com variáveis dinâmicas preenchidas a partir do cadastro do cliente/caso, exportação para DOCX/PDF.
- Upload/organização de documentos por caso, sincronizado com uma pasta correspondente no Google Drive do escritório.
- Controle de acesso por papel (advogado, estagiário, secretária) com permissões diferenciadas (ex.: estagiário não vê dados financeiros, se houver).
- Dashboard simples: leads por período, taxa de conversão, prazos próximos.

---

## SEU OBJETIVO NESTA SESSÃO (grill-me)

Antes de gerar qualquer arquitetura ou código, faça uma rodada de perguntas críticas organizadas nos seguintes blocos. Uma pergunta por vez ou em pequenos grupos lógicos, aguardando minha resposta antes de avançar para o próximo bloco. Não avance para implementação até fecharmos todos os blocos.

1. **Escopo e prioridades**
   - Validar o que é realmente MVP vs. "nice to have" dentro dos 4 pontos pedidos pelo cliente.
   - Identificar se algum item (ex.: geração de documentos) tem complexidade escondida que pode estourar o orçamento/prazo.

2. **Arquitetura técnica**
   - Confirmar stack (assumir Supabase/Postgres + React/TypeScript salvo eu indicar o contrário) e justificar trade-offs para este caso de uso específico (multiusuário pequeno, dados sensíveis).
   - Definir modelo de dados inicial (entidades principais: Cliente, Caso, Documento, Tarefa, Usuário/Papel, Post) e relacionamentos.
   - Definir estratégia de autenticação e controle de acesso por papel.
   - Definir estratégia de geração de documentos (biblioteca/abordagem para templates DOCX/PDF com variáveis).
   - Definir estratégia de integração com Google Drive (API oficial, escopo de permissões, estrutura de pastas por cliente/caso).

3. **Segurança e conformidade**
   - LGPD: base legal, retenção e exclusão de dados a pedido do titular.
   - Sigilo advogado-cliente: quem acessa o quê, logs de auditoria mínimos.
   - Backup e recuperação de dados.

4. **Riscos e premissas**
   - Levantar riscos técnicos (ex.: limites de API do Google Drive, complexidade de templates jurídicos variáveis).
   - Levantar riscos de escopo (cliente pedir mais funcionalidades durante o desenvolvimento).
   - Validar premissas de prazo e recursos (estou sozinho no desenvolvimento).

---

## FORMATO DE SAÍDA ESPERADO APÓS O GRILL-ME

Ao final da sessão de perguntas e respostas, consolide em um documento único:
- Escopo funcional final do MVP (lista fechada).
- Modelo de dados (entidades, campos principais, relacionamentos).
- Arquitetura técnica proposta (diagrama textual ou descrição por camadas).
- Plano de fases com entregáveis e critérios de aceite.
- Lista de riscos identificados e mitigação proposta.
- Checklist de segurança/LGPD aplicável ao MVP.

Não escreva código nesta etapa. O objetivo desta sessão é exclusivamente planejamento e validação de decisões antes da implementação.
