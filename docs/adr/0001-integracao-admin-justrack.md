# Integração do Módulo de Artigos no Painel Administrativo JusTrack

Decidimos integrar o módulo de Conteúdo Jurídico (Artigos) dentro do painel administrativo existente (`AdminLayout`), compartilhando o sistema de autenticação `/login` e a sessão Supabase Auth atual, porém organizando a interface com uma separação clara entre a aba/visão do JusTrack (Processos, Notificações) e a aba/visão de Artigos (`/admin/artigos`, `/admin/artigos/novo`, `/admin/artigos/:id/editar`).

Essa decisão foi tomada para preservar o fluxo de login já em produção e evitar conflitos com o dashboard de processos em `/admin`, proporcionando uma navegação isolada e limpa para as rotinas editoriais sem fragmentar os acessos do escritório.
