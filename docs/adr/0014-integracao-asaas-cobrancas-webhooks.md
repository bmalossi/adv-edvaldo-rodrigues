# Integração com Asaas para Sincronização de Clientes, Cobrança de Honorários e Webhooks

Decidimos integrar o CRM Jurídico ao gateway Asaas através de Supabase Edge Functions para sincronizar cadastros de clientes, emitir cobranças de honorários (Pix, Boleto e Cartão de Crédito) e processar liquidações via Webhook.

A sincronização de clientes ocorre no cadastro/atualização de clientes qualificados (com CPF/CNPJ), realizando busca prévia no Asaas para reaproveitar cadastros prévios e evitar duplicidades. A geração de faturas é segregada na tabela `cobrancas_asaas` e vinculada ao Contrato de Honorários/Caso, com chave de idempotência (`externalReference`). Para pagamentos via cartão de crédito, delegamos a captura à fatura segura do Asaas (`invoiceUrl`), garantindo padrão Zero-PCI sem custódia de dados bancários pelo CRM.

O Webhook do Asaas é recebido por uma Edge Function autenticada (`asaas-webhook`), promovendo o cliente para `ativo` e avançando o caso para `Fechamento` no Funil Processual automaticamente ao receber `PAYMENT_RECEIVED` ou `PAYMENT_CONFIRMED`.

Considered Options:
- **Disparo de cobrança a cada salvamento de cliente**: descartada por gerar faturas indevidas em atualizações de dados básicos (como endereço ou telefone) ou em leads em triagem.
- **Formulário de cartão de crédito nativo no CRM**: descartada pelo risco e custo de conformidade PCI-DSS.
- **Chamada direta da API Asaas pelo frontend SPA**: descartada pelo risco de exposição da `ASAAS_API_KEY` nas requisições do navegador.
