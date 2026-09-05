# Isolamento de Dados Financeiros e Honorários em Tabela Própria com RLS Rigoroso

Decidimos segregar todos os dados pecuniários, parcelas, percentuais de êxito e condições de pagamento em uma entidade dedicada (contratos_financeiros / honorarios), em vez de incluir colunas financeiras na tabela casos.

Essa segregação física permite aplicar políticas declarativas de Row-Level Security (RLS) no PostgreSQL, restringindo operações de SELECT, INSERT e UPDATE exclusivamente a usuários com papel dvogado. Colaboradores com papel de estagiário ou secretária não têm acesso a dados contratuais e valores nem por inspeção de requisições ou queries de API.

Alternativas consideradas:
- **Campos de honorários embutidos na tabela casos**: descartada por exigir views protegidas ou column-level security mais complexos de auditar e suscetíveis a vazamentos acidentais em consultas relacionais do frontend.
