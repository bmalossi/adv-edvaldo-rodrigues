# Glossário de Domínio — CRM JusTrack (ADVBOX Model)

## Entidades e Conceitos Principais

### Caso / Processo (Entidade Central do Funil)
Representa a demanda jurídica ou atendimento de um cliente. Um cliente pode possuir múltiplos Casos/Processos no escritório simultaneamente, cada um em uma Fase e Etapa próprias.

### Fase do Processo (Abas do Funil)
Os grandes estágios do ciclo de vida processual e negocial no escritório:
- **Negociação**: Atendimento inicial, análise de viabilidade, propostas e fechamento de contrato.
- **Consultoria**: Atuação consultiva, pareceres, acordos e notificações extrajudiciais.
- **Administrativo**: Requerimentos e defesas perante órgãos públicos (INSS, Prefeituras, Procon, Receita, etc.).
- **Judicial**: Ações distribuídas em 1º grau de jurisdição.
- **Recursal**: Recursos em 2º grau e Tribunais Superiores.
- **Execução**: Cumprimento de sentença, cálculos, penhoras e recebimentos judiciais.
- **Financeiro**: Processamento de honorários, RH e liquidações internas.
- **Arquivamento**: Processos findos, transitados em julgado ou cancelados.

### Etapa (Colunas do Funil)
Passos específicos dentro de uma Fase. Cada coluna possui contadores de processos e cards ordenados. O sistema permite ao usuário adicionar novas etapas dinamicamente através do botão `+ Adicionar outra ETAPA`.

### Visibilidade e Compartilhamento
- **Privado (Padrão)**: O processo e o cliente são visíveis e editáveis exclusivamente pelo usuário criador/responsável.
- **Público / Colegiado**: Visível para toda a equipe do escritório.
- **Compartilhado pontual**: O responsável pode conceder acesso de leitura ou edição a colaboradores específicos.
