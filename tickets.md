# Tickets: Integração Asaas (Sincronização, Cobranças e Webhooks)

Implementação modular e segura da integração com a API v3 do Asaas para o CRM Jurídico. Referência da especificação: [docs/spec-integracao-asaas-cobrancas.md](./docs/spec-integracao-asaas-cobrancas.md).

Work the **frontier**: any ticket whose blockers are all done. For a purely linear chain that means top to bottom.

## 1. Sincronização Bidirecional de Clientes com Asaas e Prevenção de Duplicidades

**What to build:** Permitir que o sistema sincronize clientes qualificados (com CPF/CNPJ) automaticamente com a API do Asaas ao salvar ou atualizar no CRM. O sistema consulta primeiro se o cliente já existe por CPF/CNPJ antes de criar um novo para evitar contas duplicadas no Asaas. O identificador `asaas_customer_id` retornado é gravado no cadastro do cliente e exibido na ficha do CRM com status de sincronização e feedback visual.

**Blocked by:** None — can start immediately

- [x] Adicionar coluna indexada `asaas_customer_id` na tabela `clientes` via migration.
- [x] Implementar módulo de domínio puro com validação algorítmica de CPF e CNPJ (dígitos verificadores) e sanitização de dados cadastrais.
- [x] Criar Edge Function `asaas-sync-customer` que busca por CPF/CNPJ (`GET /v3/customers?cpfCnpj=...`), cria (`POST /v3/customers`) ou atualiza (`POST /v3/customers/{id}`) e persiste o ID no banco via Service Role.
- [x] Integrar chamada de sincronização no salvamento e edição da ficha de clientes (`ClienteForm` e `ClienteDetalhe`), com toasts de sucesso/erro e badge do Asaas Customer ID.
- [x] Criar testes automatizados unitários em `src/test/asaas-dominio.test.ts` validando a checagem de documentos e higienização de payload.

## 2. Emissão e Visualização de Cobranças de Honorários (Pix, Boleto e Cartão Zero-PCI)

**What to build:** Permitir ao advogado emitir faturas avulsas ou parceladas de honorários diretamente na Ficha do Cliente e no Drawer do Caso no Funil Processual. A emissão gera cobranças no Asaas vinculadas ao cliente e ao caso com chave determinística de idempotência (`externalReference`), retornando instantaneamente na tela o QR Code dinâmico do Pix com código copia-e-cola, a linha digitável do boleto bancário e o link seguro da fatura do Asaas para pagamento com cartão de crédito sem risco PCI.

**Blocked by:** 1. Sincronização Bidirecional de Clientes com Asaas e Prevenção de Duplicidades

- [x] Criar tabela `cobrancas_asaas` com RLS restrito a advogados e índices de consulta (`cliente_id`, `caso_id`, `status`).
- [x] Implementar no domínio a geração de `externalReference` determinístico para evitar duplicidades por duplo clique ou reenvio.
- [x] Criar Edge Function `asaas-criar-cobranca` que dispara criação no Asaas (`/v3/payments`), busca QR Code Pix (`/v3/payments/{id}/pixQrCode`), linha digitável do boleto (`/v3/payments/{id}/identificationField`) e persiste a fatura no banco local.
- [x] Criar modal e interface de cobrança na ficha do cliente (`ClienteDetalhe`) e no Drawer do Caso (`DrawerCaso`), exibindo tabela de faturas, badge de status (Pendente, Paga, Vencida) e botões de ação rápida para copiar código Pix, copiar linha digitável e abrir link do cartão.
- [x] Criar testes automatizados de domínio cobrindo a formatação de valores, datas de vencimento e chave de idempotência.

## 3. Gestão de Assinaturas Recorrentes de Partido Mensal

**What to build:** Permitir ao advogado cadastrar contratos de honorários no modelo de partido mensal (assessoria recorrente contínua), gerando uma assinatura automática no Asaas que fatura o cliente mensalmente no dia escolhido e agrupa as parcelas geradas sob o identificador da assinatura no CRM.

**Blocked by:** 2. Emissão e Visualização de Cobranças de Honorários (Pix, Boleto e Cartão Zero-PCI)

- [x] Suportar tipo de faturamento recorrente (`assinatura`) em `cobrancas_asaas` e modelo de domínio com periodicidade mensal (`cycle: 'MONTHLY'`).
- [x] Expandir a Edge Function `asaas-criar-cobranca` para criar assinaturas recorrentes via `/v3/subscriptions` quando a modalidade for partido mensal.
- [x] Adicionar opção de "Assinatura Recorrente / Partido Mensal" no modal de cobrança com definição de dia de vencimento mensal e forma preferencial.
- [x] Exibir badge e card destacado de assinatura recorrente ativa na ficha do cliente e no caso.
- [x] Criar testes automatizados de domínio validando o cálculo de datas de vencimento e payload de assinaturas.

## 4. Webhook de Liquidação e Transição Automática de Etapas no Funil

**What to build:** Endpoint de webhook público e seguro que recebe notificações de pagamento em tempo real do Asaas. Ao receber a confirmação de liquidação (`PAYMENT_RECEIVED` ou `PAYMENT_CONFIRMED`), o sistema atualiza a fatura local para Paga, promove o cliente automaticamente de Lead/Consulta para Ativo, avança o caso no Funil Processual para a etapa de Fechamento e registra um log auditável na timeline do cliente. Em caso de vencimento (`PAYMENT_OVERDUE`), sinaliza a cobrança e gera alerta na timeline sem bloquear o processo.

**Blocked by:** 2. Emissão e Visualização de Cobranças de Honorários (Pix, Boleto e Cartão Zero-PCI)

- [x] Criar Edge Function pública `asaas-webhook` validando autenticidade via cabeçalho `asaas-access-token`.
- [x] Implementar reducer de transição de status no domínio para mapear eventos do Asaas para estados do CRM e do Funil.
- [x] Executar atualização de status em `cobrancas_asaas` com data e valor liquidado via service role.
- [x] Promover `clientes.status_ciclo` de `lead`/`consulta` para `ativo`.
- [x] Mover casos em etapa de negociação inicial para a etapa "Fechamento" no Funil Processual.
- [x] Inserir registro automático de interação na timeline do cliente (`interacoes_cliente`) com valor, meio de pagamento e recibo.
- [x] Tratar evento `PAYMENT_OVERDUE` atualizando status para vencido e gerando alerta na timeline.
- [x] Criar testes automatizados unitários do reducer de transições do webhook.

## 5. Hardening de Formulários, Máscaras e Gestão de Ambiente Sandbox

**What to build:** Aplicar refinamentos de robustez e experiência de usuário (/impeccable harden) no CRM: validações reativas e máscaras em tempo real em CPF/CNPJ, CEP e telefone, mensagens de erro claras traduzidas para o usuário quando o Asaas rejeitar uma requisição, e sinalizador visual evidente indicando quando o sistema estiver operando em ambiente Sandbox (testes) para evitar enganos com faturamento real.

**Blocked by:** 2. Emissão e Visualização de Cobranças de Honorários (Pix, Boleto e Cartão Zero-PCI), 4. Webhook de Liquidação e Transição Automática de Etapas no Funil

- [x] Implementar máscara visual e validação inline em tempo real de CPF (11 dígitos), CNPJ (14 dígitos), CEP e Celular no `ClienteForm` e modais financeiros.
- [x] Adicionar badge visual de advertência `[Modo Sandbox / Testes]` no card financeiro do CRM quando a variável de ambiente for sandbox.
- [x] Implementar parser de erros da API do Asaas que converte códigos de erro técnicos em orientações claras em português para o advogado.
- [x] Bloqueio de cliques múltiplos com feedback visual de carregamento nos botões de emissão e sincronização.
- [x] Executar suíte completa de testes de regressão garantindo cobertura de 100% dos novos fluxos de domínio.
