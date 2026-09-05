# Política de Retenção e Exclusão Diferenciada (LGPD vs. Estatuto da Advocacia)

Decidimos implementar uma política de ciclo de exclusão de dados com tratamento diferenciado no banco de dados conforme a existência de relação jurídica material:

1. **Leads sem casos ou contratos vinculados**: exclusão física completa (Hard Delete) dos registros e eventuais arquivos quando solicitado pelo titular ou descartado pela equipe comercial.
2. **Clientes com casos, procurações ou contratos**: proibição de exclusão física imediata via regras de integridade relacional (ON DELETE RESTRICT) e uso de arquivamento lógico (Soft Delete). Os dados pessoais ficam retidos sob as bases legais do Art. 7º, II (cumprimento de obrigação legal) e VI (exercício regular de direitos) da LGPD, resguardando o prazo prescricional de 5 anos estipulado pelo Estatuto da OAB e Código Civil.

Alternativas consideradas:
- **Hard Delete irrestrito com CASCADE**: descartado por expor os advogados a graves riscos de responsabilidade ética e perda de lastro probatório para prestação de contas.
- **Anonimização prematura de clientes**: descartada por inviabilizar a conferência de eventuais litígios e auditorias fiscais durante o período prescricional.
