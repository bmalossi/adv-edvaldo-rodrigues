# Glossário de Domínio — CRM Jurídico / Gestão Processual

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

## RBAC — Perfis e Permissões

### Perfil de Acesso (Role)
Conjunto nomeado de permissões atribuído a um usuário do sistema. Define as capacidades operacionais e os limites de acesso de cada colaborador dentro do CRM.

### Permissão
Autorização atômica que vincula um Módulo a uma Ação específica (ex.: `clientes.criar`, `financeiro.visualizar`). Cada perfil de acesso agrega uma lista explícita de permissões concedidas.

### Módulo
Área funcional delimitada do sistema sobre a qual incide o controle de autorização:
- `clientes`: Gestão da carteira, leads e contatos.
- `casos`: Dossiê de demandas judiciais, extrajudiciais e consultivas.
- `agenda`: Compromissos, audiências, reuniões e prazos fatais.
- `documentos`: Geração de minutas, contratos e declarações.
- `financeiro`: Contratos de honorários, valores e condições de pagamento.
- `relatorios`: Backups do sistema, exportações e métricas gerenciais.
- `usuarios`: Gestão de contas de colaboradores e credenciais.
- `perfis_acesso`: Configuração de papéis e governança de permissões.

### Ação
Operação que um usuário pode executar sobre determinado Módulo:
- `visualizar`: Leitura e consulta de dados e telas do módulo.
- `criar`: Inserção de novos registros.
- `editar`: Atualização de informações existentes.
- `excluir`: Remoção física ou lógica de registros.

### Perfil Padrão de Fábrica
Perfil predefinido do sistema fornecido na instalação inicial (`Administrador`, `Sócio`, `Advogado Associado`, `Estagiário/Assistente`). Possui a flag `is_default = true`, servindo como template base imutável e protegido contra exclusão acidental.

### Log de Auditoria
Registro histórico imutável das ações administrativas sensíveis realizadas sobre usuários e perfis de acesso, contendo data/hora, autor da alteração, entidade afetada e o comparativo dos valores anteriores e novos.

### Senha Temporária
Credencial provisória gerada pelo Administrador no momento da criação da conta de um colaborador, utilizada exclusivamente para o primeiro acesso ao sistema.

### Troca Forçada de Senha
Mecanismo de segurança que intercepta a navegação do usuário após a autenticação, exigindo a definição imediata de uma nova senha pessoal antes de liberar o acesso aos módulos operacionais do CRM.

## SEO, Prerender e Descoberta por IAs

### Speculation Rules API
Recurso nativo do Chromium para progressive enhancement de navegação. Permite pré-carregar (`prefetch`) ou renderizar completamente em background (`prerender`) páginas de destino com base em regras declarativas em JSON (`/public/speculationrules.json` e `<script type="speculationrules">`). Acelera a transição entre páginas aproximando o LCP de zero para visitantes reais, sem quebrar navegadores sem suporte.

### Prerender Estático (Build-Time)
Geração automatizada de snapshots HTML completos durante a etapa de build (`vite.config.ts`) para rotas públicas institucionais fixas (`/`, `/areas-de-atuacao`, `/sobre`, `/contato`, `/calculadora`, `/conteudo-juridico`, etc.). Garante que motores de busca tradicionais (Googlebot, Bing) e crawlers de IA (GPTBot, ClaudeBot, PerplexityBot) recebam o conteúdo, metadados Open Graph e schemas JSON-LD no primeiro byte, sem depender da execução de JavaScript client-side.

### Sitemap Dinâmico (`/api/sitemap`)
Função server-side/edge que gera o feed XML canônico (`/sitemap.xml`) sob demanda, consultando o banco de dados Supabase para agregar todas as publicações com status publicado aos links estáticos do escritório. Elimina a necessidade de atualizações manuais no sitemap a cada novo artigo criado no CMS.

### LegalScholarlyArticle
Subtipo especializado de `Article` da Schema.org aplicado aos artigos jurídicos do escritório. Sinaliza a motores de busca e modelos de linguagem generativa que o texto possui teor técnico-jurídico acadêmico ou doutrinário, incluindo campos semânticos estruturados como autoria (`Person/Attorney`), assunto principal (`about`), menções a teses e ramos do direito (`mentions`) e vínculo com o portal do escritório (`isPartOf`).

