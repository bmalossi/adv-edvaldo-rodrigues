# Especificação de Funcionalidade: Integração Asaas (Sincronização, Cobranças e Webhooks)

## Problem Statement

Atualmente, o escritório de advocacia gerencia seus clientes, leads e processos através do CRM interno, mas todo o processo de emissão de cobranças de honorários (Pix, boleto ou cartão) e controle de adimplemento é realizado de forma manual e desconectada externamente no Asaas.

Isso gera fricção operacional para a equipe jurídica:
1. Advogados e secretárias precisam redigitar manualmente os dados do cliente (Nome, CPF/CNPJ, E-mail, Celular) no painel do Asaas.
2. A emissão de cobranças de entrada ou parcelas depende de navegação fora do CRM, tornando lenta a entrega da chave Pix ou linha digitável ao cliente no momento do fechamento.
3. Não há conciliação automática: quando o cliente paga uma fatura, a equipe precisa checar o extrato bancário manualmente e lembrar de mover o cliente de Lead para Ativo e o Caso para a fase de execução no Funil Processual.
4. Falta de idempotência e validação robusta pode ocasionar cadastros duplicados de clientes no Asaas ou duplicidade de cobranças.

## Solution

Uma integração nativa e automatizada entre o CRM Jurídico e a API v3 do Asaas que:
1. Sincroniza o cliente com o Asaas no momento de seu cadastro ou atualização qualificada, reaproveitando cadastros prévios por CPF/CNPJ.
2. Permite ao advogado emitir cobranças de honorários (Pix, Boleto e Cartão de Crédito) de forma avulsa, parcelada ou por assinatura recorrente diretamente na ficha do cliente e no Drawer do Caso.
3. Disponibiliza instantaneamente na tela o QR Code dinâmico do Pix, código copia-e-cola, linha digitável do boleto e link seguro para pagamento com cartão de crédito (Zero-PCI).
4. Processa notificações assíncronas do Asaas via Webhook autenticado, atualizando o status da fatura, promovendo o cliente para "Ativo", avançando o caso para a etapa de "Fechamento" e registrando a liquidação na Timeline de Interações do cliente.

## User Stories

1. As an Advogado, I want the system to automatically synchronize client data (Name, CPF/CNPJ, Email, Mobile Phone) with Asaas when saving a qualified client, so that I don't have to duplicate client records manually in the gateway.
2. As an Advogado, I want the system to check if a customer already exists in Asaas by CPF/CNPJ before creating a new one, so that no duplicate customer accounts are created in the payment gateway.
3. As an Advogado, I want to see the Asaas Customer ID linked to the client's file in the CRM, so that I have certainty and traceability of the external integration.
4. As an Advogado, I want strict CPF and CNPJ validation before attempting synchronization, so that invalid document errors are caught immediately in the UI with clear feedback.
5. As an Advogado, I want to generate a Pix charge for case fees directly from the client's file or case drawer, so that I can immediately display and copy the Pix QR Code and copy-paste code to send to the client via WhatsApp.
6. As an Advogado, I want to generate a bank slip (Boleto Bancário) charge with due date and installment options, so that I can provide the barcode line and bank slip PDF link to the client.
7. As an Advogado, I want to generate a Credit Card fee invoice link, so that the client can safely input their credit card credentials on Asaas's hosted PCI-compliant payment page without the law firm storing sensitive card data.
8. As an Advogado, I want to set up recurring monthly subscriptions (Partido Mensal) in Asaas, so that monthly advisory retainers are billed automatically every month.
9. As an Advogado, I want fee charges to be tied to a deterministic external reference (`externalReference`), so that accidental double-clicking or duplicate submissions do not generate double charges on Asaas.
10. As an Advogado, I want to see a list of all fee charges and invoices associated with a client and case in the CRM, including status badges (Pending, Paid, Overdue, Cancelled), so that I have complete visibility over client financial status.
11. As an Advogado, I want to see a clear visual indicator whenever the system is running in Asaas Sandbox (test mode), so that I never confuse simulated transactions with real financial operations.
12. As a Sistema / Webhook Listener, I want to receive `PAYMENT_RECEIVED` and `PAYMENT_CONFIRMED` webhook events securely verified with the `asaas-access-token` header, so that fraudulent or unauthorized webhook calls are rejected.
13. As a Sistema / Webhook Listener, I want the system to automatically promote the client's lifecycle status from "Lead" or "Em Consulta" to "Ativo" upon payment confirmation, so that the client portfolio is updated without manual intervention.
14. As a Sistema / Webhook Listener, I want the system to automatically advance the case from initial negotiation/proposal stages to "Fechamento" upon payment confirmation, so that the procedural Kanban accurately reflects paid retainers.
15. As a Sistema / Webhook Listener, I want the system to automatically register an interaction in the client's timeline when a payment is received, so that all collaborators have an immutable audit trail of the settlement.
16. As an Advogado, I want the system to flag a charge as "Vencida" and record an alert on the client's timeline upon receiving `PAYMENT_OVERDUE`, so that I can take appropriate collection actions without breaking the active case workflow.
17. As an Advogado, I want to cancel an unpaid pending charge in Asaas directly from the CRM, so that obsolete or renegotiated proposals are invalidated.
18. As an Administrador, I want all financial operations and invoices to be shielded by Row-Level Security (RLS) restricting financial views and actions to attorneys and administrators, so that clerks and interns cannot access fee amounts.

## Implementation Decisions

### 1. Architectural Shape & Security Boundaries
- The frontend client application (React SPA) will NEVER communicate directly with the Asaas API to ensure `ASAAS_API_KEY` is not exposed in the browser.
- All outbound communication with Asaas runs in backend serverless functions (Supabase Edge Functions in Deno/TypeScript).
- The Asaas Webhook receiver endpoint will run in a dedicated Edge Function (`asaas-webhook`) validating incoming requests via the secret `asaas-access-token` header.

### 2. Modules Built and Modified
- **Domain Layer (`domain/crm/asaas`)**:
  - Pure functions for payload validation (CPF/CNPJ, email, phone with DDD, currency amounts).
  - Generators for deterministic `externalReference` idempotency keys.
  - State transition reducers for webhook events (`PAYMENT_RECEIVED`, `PAYMENT_CONFIRMED`, `PAYMENT_OVERDUE`).
- **Database Layer (`supabase/migrations`)**:
  - Alteration to `clientes` table: add `asaas_customer_id TEXT` with unique partial index.
  - New table `cobrancas_asaas`: stores individual installments or recurring charges, invoice links, Pix payloads, and Asaas identifiers.
  - Strict Row-Level Security (RLS) policies allowing access only to attorneys/administrators and service-role execution.
- **Backend Edge Functions Layer (`supabase/functions/`)**:
  - `asaas-sync-customer`: receives client ID, looks up customer by CPF/CNPJ via `GET /v3/customers?cpfCnpj=...`, creates or updates the customer, and persists `asaas_customer_id`.
  - `asaas-criar-cobranca`: receives client ID, case ID, fee details (type, amount, due date, installments), calls Asaas `/v3/payments` or `/v3/subscriptions`, retrieves Pix/Boleto data, and inserts the invoice record.
  - `asaas-webhook`: handles Asaas webhook events, verifies the webhook token, updates invoice status, triggers client lifecycle promotion, advances case Kanban stage, and appends a timeline interaction.
- **User Interface Layer (`components/crm` & `pages/admin`)**:
  - `ClienteDetalhe.tsx`: New dedicated "Financeiro & Asaas" card/tab displaying linked invoices, quick action buttons (Copy Pix, Copy Barcode, Open Invoice URL), and a "Nova Cobrança" button.
  - `DrawerCaso.tsx`: Financial summary section showing case fees, charges, and quick issuance button.
  - `ModalNovaCobrancaAsaas.tsx`: Modal dialog for configuring payment method (Pix, Boleto, Cartão de Crédito), installments, amount, due date, and immediately displaying generated payment credentials upon success.
  - Form validation hardening: strict mask and algorithmic validation for CPF/CNPJ, phone, CEP, and email.

### 3. Data Schema Contract (Prototype Reference)

```sql
-- Schema contract for cobrancas_asaas
CREATE TABLE IF NOT EXISTS public.cobrancas_asaas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
    caso_id UUID REFERENCES public.casos(id) ON DELETE SET NULL,
    contrato_financeiro_id UUID REFERENCES public.contratos_financeiros(id) ON DELETE SET NULL,
    asaas_payment_id TEXT UNIQUE,
    asaas_subscription_id TEXT,
    tipo_cobranca TEXT NOT NULL CHECK (tipo_cobranca IN ('PIX', 'BOLETO', 'CREDIT_CARD', 'UNDEFINED')),
    forma TEXT NOT NULL CHECK (forma IN ('avista', 'parcelado', 'assinatura')),
    status TEXT NOT NULL DEFAULT 'PENDING',
    valor NUMERIC(12,2) NOT NULL,
    valor_liquido NUMERIC(12,2),
    data_vencimento DATE NOT NULL,
    data_pagamento TIMESTAMPTZ,
    invoice_url TEXT,
    bank_slip_url TEXT,
    pix_qrcode_image TEXT,
    pix_copia_cola TEXT,
    linha_digitavel TEXT,
    external_reference TEXT UNIQUE,
    numero_parcela INTEGER DEFAULT 1,
    total_parcelas INTEGER DEFAULT 1,
    raw_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cobrancas_asaas_cliente ON public.cobrancas_asaas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_cobrancas_asaas_caso ON public.cobrancas_asaas(caso_id);
CREATE INDEX IF NOT EXISTS idx_cobrancas_asaas_status ON public.cobrancas_asaas(status);
```

### 4. Idempotency and Anti-Duplication Strategy
- **Customer Deduplication**: Prior to calling `POST /v3/customers`, query `GET /v3/customers?cpfCnpj={cleanedCpfCnpj}`. If an existing customer record is returned, reuse its ID and perform `POST /v3/customers/{id}` to update details.
- **Payment Idempotency**: Payments carry an `externalReference` constructed as `caso_{casoId}_contrato_{contratoId}_p{parcela}`. If a charge with this reference exists in `cobrancas_asaas` in `PENDING` status, the service returns the existing charge instead of creating a redundant one.

### 5. Credit Card Handling (Zero-PCI)
- For credit card payments, the system does NOT collect or transmit credit card PAN, CVV, or expiration date in local forms.
- The system emits a charge with `billingType: 'CREDIT_CARD'` (or `UNDEFINED`) and redirects/links the user to the Asaas hosted payment page (`invoiceUrl`).

## Testing Decisions

### What Makes a Good Test
- Tests must verify external behavior and business outcomes, not internal mock hierarchies.
- Pure domain logic (validation, status transitions, payload building) should be tested deterministically with Vitest without network mocks.
- Testing should verify that:
  1. Valid and invalid CPFs and CNPJs are correctly identified.
  2. Idempotency keys are deterministically generated.
  3. Webhook status transitions correctly promote client lifecycle and case stages.
  4. RBAC rules block unauthorized roles from viewing or creating fee charges.

### Modules Tested
- `src/test/asaas-dominio.test.ts`:
  - Algorithmic validation of CPF and CNPJ.
  - Idempotency key generation.
  - State transition handler for `PAYMENT_CONFIRMED`, `PAYMENT_RECEIVED`, and `PAYMENT_OVERDUE`.
- `src/test/financeiro-dominio.test.ts`:
  - Permission checks for financial actions and fee viewing.

### Prior Art
- Follows the existing domain test pattern established in `src/test/cliente-dominio.test.ts`, `src/test/caso-dominio.test.ts`, and `src/test/financeiro-dominio.test.ts`.

## Out of Scope

- Split de pagamentos complexo entre múltiplos advogados ou contas de terceiros no Asaas.
- Maquininha física de cartão de crédito (POS).
- Cobrança judicial automatizada de devedores via protesto de cartório através de API.
- Gestão de notas fiscais municipais automáticas (NFS-e Asaas) no escopo inicial.

## Further Notes

- API Keys do Asaas e Webhook Tokens são configurados como secrets das Edge Functions (`ASAAS_API_KEY`, `ASAAS_ENVIRONMENT`, `ASAAS_WEBHOOK_TOKEN`).
- O sistema suporta alternância suave entre Sandbox (`https://sandbox.asaas.com/api/v3`) e Produção (`https://api.asaas.com/v3`).
- Decisão arquitetural registrada no [ADR 0014](file:///c:/Users/sorai/Desktop/Bruno/Projetos/adv-edvaldo-rodrigues-main/docs/adr/0014-integracao-asaas-cobrancas-webhooks.md).
