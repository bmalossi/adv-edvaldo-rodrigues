# Incremento de Visualizações de Artigos via RPC Security Definer

Decidimos implementar a contagem de visualizações de artigos através de uma stored function PostgreSQL (`increment_article_views`) configurada com `SECURITY DEFINER` e exposta via Supabase RPC para os papéis `anon` e `authenticated`.

Essa abordagem evita a concessão de privilégios de `UPDATE` a usuários anônimos na tabela `articles` (preservando o isolamento rígido de RLS), previne condições de corrida em acessos simultâneos através de operações aritméticas atômicas no banco de dados e permite invocações não bloqueantes pelo frontend cliente com proteção contra cliques repetidos via `sessionStorage`.
