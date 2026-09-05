# Armazenamento de Imagens via Cloudflare R2 com Fallback de URL Direta

Decidimos adotar o Cloudflare R2 para armazenamento de imagens de capa e corpo de artigos, gerando URLs assinadas de PUT através de uma Supabase Edge Function (`generate-upload-url`), com suporte adicional no editor para inserção via URL direta.

Essa arquitetura elimina custos de tráfego de saída (egress fees), mantém as credenciais do R2 protegidas exclusivamente no ambiente de secrets da Edge Function, e o fallback de URL direta garante que a equipe editorial e o desenvolvimento consigam criar conteúdos e validar o layout visual antes mesmo do provisionamento final do bucket e chaves no Cloudflare.
