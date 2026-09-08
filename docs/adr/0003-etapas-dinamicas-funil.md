# ADR 0003: Funis com Etapas Dinâmicas por Escritório e Proteção de Exclusão

## Contexto
O escritório opera com 8 grandes fases processuais (Negociação, Consultoria, Administrativo, Judicial, Recursal, Execução, Financeiro e Arquivamento). Cada fase contém colunas de etapas padrão pré-carregadas no sistema e necessita de flexibilidade para que a banca crie novas etapas personalizadas conforme tipos de demandas específicas.

## Decisão
Decidimos que a configuração das etapas das colunas será compartilhada por todo o escritório (nível global/organização), persistida na tabela `public.etapas_funil_processos`, permitindo a criação de novas colunas customizadas via interface (`+ Adicionar outra ETAPA`).
Colunas padrão do sistema são imutáveis contra deleção acidental, e colunas personalizadas só podem ser excluídas se não possuírem processos ativos alocados nelas (garantindo integridade referencial e evitando processos órfãos).

## Consequências
- A banca mantém padronização no fluxo de trabalho e métricas entre advogados.
- Elimina redundâncias de configuração individual entre usuários.
- Segurança operacional: processos não somem por deleção inadvertida de coluna.
