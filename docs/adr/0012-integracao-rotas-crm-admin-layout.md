# Integração Modular do CRM Jurídico no AdminLayout Existente

Decidimos acomodar o CRM Jurídico como uma seção de primeiro nível dedicada dentro da barra de navegação existente (AdminLayout.tsx), sob o prefixo de rotas /admin/crm/* (clientes, casos, genda, modelos).

Essa arquitetura preserva a autenticação única via Supabase Auth, o design system já estabelecido no painel e permite controlar a visibilidade dos links de navegação de acordo com o papel do colaborador logado (dvogado, estagiario, secretaria).

Alternativas consideradas:
- **Painel/Aplicação separada em outro subdomínio ou rota base**: descartada por exigir múltiplos logins e fragmentar a experiência operacional do escritório.
