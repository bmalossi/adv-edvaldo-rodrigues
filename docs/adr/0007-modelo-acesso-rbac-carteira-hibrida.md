# Modelo de Controle de Acesso RBAC com Carteira Híbrida (Privada/Colegiada)

> **Status: SUPERSEDED** por [ADR 0013 — Transição para RBAC Dinâmico com Tabelas de Perfis e Permissões](file:///c:/Users/sorai/Desktop/Bruno/Projetos/adv-edvaldo-rodrigues-main/docs/adr/0013-rbac-dinamico-roles-permissions.md)

Decidimos adotar um controle de acesso baseado em papéis ( dvogado, estagiario, secretaria) com modelo de carteira híbrida configurável por registro: cada Cliente ou Caso/Processo possui um indicador de visibilidade (privado ou colegiado).

- Em modo **privado**, o acesso é restrito ao profissional responsável e aos colaboradores expressamente delegados ao caso/cliente.
- Em modo **colegiado**, o registro fica visível para toda a banca técnica do escritório, mantendo-se sempre o mascaramento de dados financeiros e contratuais sensíveis para o papel de estagiário via Row-Level Security (RLS).
- O papel de **secretária** mantém escopo restrito a captação, triagem inicial e agendamentos, sem acesso ao mérito processual reservado.

Alternativas consideradas:
- **Visibilidade 100% aberta/colegiada**: descartada para preservar segredos de negócios e clientes de carteira pessoal de cada sócio.
- **Isolamento 100% estrito por advogado**: descartada por engessar a colaboração diária e a cobertura de prazos quando um advogado precisa atuar no processo do outro.
