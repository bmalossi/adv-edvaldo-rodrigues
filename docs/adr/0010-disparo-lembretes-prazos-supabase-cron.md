# Agendamento e Disparo de Lembretes de Prazos via Supabase Scheduled Edge Function

Decidimos gerenciar os disparos de lembretes de prazos e tarefas utilizando rotinas agendadas (Supabase Cron / Scheduled Edge Function) acionando o serviço de e-mail transacional (ex.: Resend/SMTP).

A função executa diariamente em horário matutino parametrizado (ex.: 07:00), identifica os prazos em aberto nas janelas de 48h e 24h para os colaboradores responsáveis/delegados e enfileira/dispara as notificações com registro em log.

Alternativas consideradas:
- **Cron periódico externo no n8n**: descartada para manter as regras de negócio de prazos e agenda encapsuladas na aplicação principal, reduzindo acoplamento a orquestradores externos.
- **Apenas avisos em tela sem e-mail**: descartada por expor o escritório ao risco de perda de prazo fatal processual caso os colaboradores não acessem o painel no dia.
