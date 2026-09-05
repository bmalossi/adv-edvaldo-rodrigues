# Integração com Google Drive via Service Account Centralizada

Decidimos integrar o armazenamento de documentos do CRM ao Google Drive do escritório utilizando uma Service Account da Google Cloud Console, com a pasta raiz compartilhada pelo escritório com o e-mail da conta de serviço. As Supabase Edge Functions fazem o intermédio: criam automaticamente a árvore de pastas /{Cliente}/{Caso}/ e executam upload/download de forma transparente para os usuários do painel.

Alternativas consideradas:
- **OAuth2 por usuário**: descartado por gerar conflito de propriedade de arquivos entre os quatro perfis do escritório (advogado, estagiário, secretária) e exigir gerenciamento de refresh tokens com telas de consentimento recorrentes.
- **Links manuais de pasta**: descartado por não garantir consistência de nomenclatura nem automação de arquivamento por cliente/caso.
