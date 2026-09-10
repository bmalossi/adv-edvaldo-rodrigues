# 0013. Transição para RBAC Dinâmico com Tabelas de Perfis e Permissões

## Status
Aceito (Supersede [ADR 0007 — Modelo de Controle de Acesso RBAC com Carteira Híbrida](file:///c:/Users/sorai/Desktop/Bruno/Projetos/adv-edvaldo-rodrigues-main/docs/adr/0007-modelo-acesso-rbac-carteira-hibrida.md))

## Contexto
O modelo anterior de controle de acesso ([ADR 0007](file:///c:/Users/sorai/Desktop/Bruno/Projetos/adv-edvaldo-rodrigues-main/docs/adr/0007-modelo-acesso-rbac-carteira-hibrida.md)) utilizava um tipo enumerado estático no PostgreSQL (`papel_usuario: 'advogado' | 'estagiario' | 'secretaria'`), com checagens espalhadas por condicionais no frontend e políticas RLS fixas.

Com o crescimento da banca e a necessidade de customização granular (ex.: sócios com visualização financeira irrestrita, advogados associados com restrições pontuais, secretárias com poderes de agendamento mas sem acesso a peças, e perfis híbridos/personalizados pelo Administrador), o enum rígido revelou-se insuficiente:
1. Adicionar ou calibrar permissões exigia migrations estruturais de banco e alterações no código-fonte.
2. Não era possível criar perfis customizados ou delegar autorizações sem mudar o papel do colaborador.
3. Não havia trilha de auditoria administrativa sobre alterações de privilégios.
4. O isolamento de honorários advocatícios dependia exclusivamente de verificações baseadas em strings de papel fixo.

## Decisão
Decidimos substituir o enum estático por um sistema completo de **RBAC Dinâmico** baseado em tabelas relacionais, com enforcement em dupla camada (Row-Level Security no Supabase e guards declarativos no React).

### Componentes Arquiteturais

1. **Schema Relacional (`roles` e `permissions`):**
   - Tabela `roles`: armazena os perfis de acesso (`id`, `nome`, `descricao`, `is_default`, `created_at`). Perfis padrão de fábrica (`Administrador`, `Sócio`, `Advogado Associado`, `Estagiário/Assistente`) recebem `is_default = true` e são protegidos contra exclusão física.
   - Tabela `permissions`: mapeia permissões atômicas vinculadas a uma role (`id`, `role_id`, `modulo`, `acao`), com constraint UNIQUE `(role_id, modulo, acao)`.
   - Foreign Key em `perfis`: coluna `role_id UUID REFERENCES roles(id)` tornando-se NOT NULL, substituindo definitivamente a coluna `papel` e o enum `papel_usuario`.

2. **Enforcement em Dupla Camada:**
   - **Camada de Banco (PostgreSQL / RLS):** Função `has_permission(p_modulo text, p_acao text) RETURNS boolean` executada com `SECURITY DEFINER` e cache na sessão do PostgreSQL. Todas as policies de RLS do CRM (`clientes`, `casos`, `contratos_financeiros`, `pendencias_crm`, `templates_minutas`, `documentos_emitidos_crm` etc.) consultam `has_permission()` para conceder SELECT, INSERT, UPDATE ou DELETE.
   - **Camada de Aplicação (React / TypeScript):** `RBACContext` carrega o perfil e todas as permissões do usuário em query única com join; hooks `usePermission(modulo, acao)` e componente declarativo `<PermissionGuard modulo="..." acao="...">` controlam a renderização condicional de botões e seções sensíveis na interface. Rotas de navegação utilizam `<ProtectedRoute requires={{ modulo, acao }}>`.

3. **Auditoria Administrativa (`audit_log`):**
   - Tabela dedicada que registra todas as mutações sobre `roles`, `permissions` e atribuições de usuários em `perfis`, com captura do `old_value` e `new_value` em formato JSONB, além de triggers automatizados de auditoria.

4. **Ciclo de Vida de Credenciais e Governança:**
   - Soft rule impedindo a exclusão ou remoção de privilégios do último usuário com papel de Administrador (`check_last_admin()`).
   - Provisionamento de novos colaboradores com senha temporária e flag `must_change_password = true`, interceptando a navegação inicial para a tela obrigatória `/admin/trocar-senha`.

## Alternativas Descartadas

- **Expandir o enum `papel_usuario` (ex.: adicionar `socio`, `paralegal`):** Descartada por manter a rigidez estrutural; qualquer alteração de permissão continuaria exigindo alterações em dezenas de policies SQL e novos deploys de frontend.
- **Multi-papel (relação N:N entre usuários e roles):** Descartada para o escopo atual por introduzir complexidade desnecessária na resolução de conflitos de permissões (unions vs subtrações) em um escritório de advocacia boutique, onde o modelo de papel único com matriz granular de permissões atende plenamente aos requisitos de governança.
- **Autorização puramente no frontend (API Gateway/BFF sem RLS):** Descartada veementemente por violar os princípios de segurança em profundidade e expor dados sigilosos a inspeção de rede ou chamadas diretas ao cliente Supabase.

## Consequências

### Positivas
- **Flexibilidade Total:** O Administrador do escritório pode criar e ajustar perfis em tempo real diretamente pela interface web em `/admin/configuracoes`.
- **Segurança em Profundidade:** Mesmo que uma requisição contorne o frontend, o banco de dados bloqueia o acesso via RLS caso o usuário não possua a permissão requerida.
- **Rastreabilidade e Compliance:** Toda concessão, revogação de acessos e mutações de papéis ficam registradas em `audit_log`, atendendo a boas práticas de governança e LGPD.
- **Experiência Limpa:** Usuários com perfis operacionais (como Estagiários) visualizam interfaces limpas, sem botões ou ações que não podem executar.

### Mitigações e Cuidados
- **Proteção dos Perfis Padrão:** Triggers e validações impedem que perfis de fábrica sejam excluídos ou que o escritório fique sem nenhum Administrador ativo.
- **Desempenho de Consultas RLS:** A função `has_permission()` utiliza índices eficientes em `(role_id, modulo, acao)` e cache em memória durante a sessão da transação, evitando sobrecarga nas consultas relacionais.
