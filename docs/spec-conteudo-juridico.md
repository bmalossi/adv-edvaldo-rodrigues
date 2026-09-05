# Especificação Funcional e Técnica — Conteúdo Jurídico (Sistema de Artigos)

## Problem Statement

O escritório de advocacia Dr. Edvaldo Rodrigues Ferreira necessita expandir sua autoridade jurídica digital, educar clientes em potencial sobre riscos contratuais e empresariais, e melhorar seu posicionamento orgânico em mecanismos de busca (SEO) e motores de resposta de inteligência artificial (GEO/AEO). Atualmente, o site institucional possui páginas institucionais estáticas e um sistema interno de gestão de processos (JusTrack), mas carece de um canal editorial dinâmico onde o advogado possa publicar orientações jurídicas, categorizadas pelas áreas de atuação do escritório, com gestão de rascunhos, agendamento de publicações e métricas de audiência, tudo centralizado sob a mesma autenticação administrativa sem sobrecarregar a experiência de navegação existente.

## Solution

Implementação de um ecossistema editorial completo ("Conteúdo Jurídico"), composto por:
1. **Vitrine Pública de Conteúdo Jurídico**:
   - Uma seção visual de destaque na página inicial com os três artigos publicados mais recentes, integrada harmonicamente antes da chamada de contato corporativo.
   - Uma página de listagem geral com paginação e filtros dinâmicos por categoria (correspondendo às áreas de atuação do escritório).
   - Páginas individuais de leitura ricas, com cabeçalho editorial de prestígio (autor, inscrição na OAB, tempo de leitura estimado, categoria), imagem de capa em destaque, renderização segura do texto formatado, seção de artigos relacionados e dados estruturados Schema.org (`Article`) integrados à entidade do escritório.
2. **Painel de Gestão Editorial Integrado**:
   - Uma aba dedicada de Conteúdo Jurídico dentro do painel administrativo existente (JusTrack), protegida pelo login unificado do escritório.
   - Tabela de controle de artigos com busca em tempo real, filtros por categoria e status temporal (Rascunho, Agendado, Publicado) e métricas de visualizações.
   - Editor de texto rico estilo CMS com barra de ferramentas completa, controle de link permanente (slug) protegido, upload direto e inserção por URL de imagens com armazenamento otimizado no Cloudflare R2, agendamento de data/hora futura e pré-visualização segura em nova aba com salvamento automático.

## User Stories

1. Como visitante do site institucional, quero visualizar os 3 artigos mais recentes na página inicial, para tomar conhecimento rápido sobre orientações jurídicas preventivas relevantes para meu negócio.
2. Como visitante interessado em um tema específico, quero filtrar os artigos por categoria na página de Conteúdo Jurídico, para encontrar rapidamente orientações sobre Direito Empresarial, Civil, Família, Trabalhista, Criminal, Previdenciário ou Militar.
3. Como visitante que consome artigos no smartphone, quero navegar por uma listagem paginada e responsiva de 9 artigos por página, para que o carregamento da lista seja rápido e fluido.
4. Como leitor de um artigo individual, quero ver claramente a categoria, o título, o nome do autor com sua OAB e a data de publicação no cabeçalho, para ter confiança técnica e institucional na autoria do texto.
5. Como leitor com pouco tempo disponível, quero visualizar a estimativa do tempo de leitura em minutos no topo do artigo, para planejar meu tempo de leitura.
6. Como leitor que chegou ao final do artigo, quero ver recomendações de até 3 artigos relacionados da mesma área temática, para continuar consumindo conteúdos pertinentes do escritório.
7. Como leitor que identificou uma necessidade jurídica em sua empresa durante a leitura, quero encontrar uma faixa de contato rápido ao término do artigo, para solicitar uma consulta diretamente com o advogado via WhatsApp.
8. Como leitor com necessidades especiais ou leitor de tela, quero que todas as imagens de capa possuam textos alternativos (alt) descritivos, para compreender o significado das imagens contextuais.
9. Como mecanismo de busca (Googlebot) e agente de IA, quero encontrar metadados semânticos Open Graph e JSON-LD de `Article` vinculados à entidade jurídica raiz do escritório, para indexar e citar adequadamente os conteúdos nas pesquisas.
10. Como administrador do escritório, quero acessar o gerenciamento de Conteúdo Jurídico utilizando as mesmas credenciais do painel JusTrack, para não precisar memorizar múltiplos acessos ou alternar de plataforma.
11. Como administrador, quero visualizar claramente no menu lateral a separação entre a rotina de processos judiciais (JusTrack) e a rotina editorial (Conteúdo Jurídico), para manter o foco organizado na tarefa do momento.
12. Como autor editorial, quero criar um novo artigo digitando um título que gere automaticamente um slug amigável para SEO, para poupar tempo na estruturação da URL.
13. Como autor editorial, quero que o slug gerado permaneça bloqueado contra alterações involuntárias após a publicação, para garantir que links compartilhados e indexados não quebrem no futuro.
14. Como autor editorial, quero desbloquear manualmente a edição do slug quando tiver real intenção de renomear a URL, para manter controle deliberado sobre os links permanentes.
15. Como autor editorial, quero redigir o artigo em um editor de texto rico com títulos H2/H3, negrito, itálico, listas, citações e hiperlinks, para estruturar o texto com hierarquia visual elegante.
16. Como autor editorial, quero fazer upload de imagens de capa e imagens inline diretamente pelo editor com envio transparente para o Cloudflare R2, para evitar custos de banda de saída.
17. Como autor editorial, quero poder inserir imagens fornecendo uma URL direta externa caso o serviço de armazenamento ainda esteja em configuração, para não interromper a produção do conteúdo.
18. Como autor editorial, quero salvar artigos em estado de rascunho sem preenchimento de data de publicação, para revisar o texto com calma antes de exibi-lo ao público.
19. Como autor editorial, quero agendar a publicação de um artigo definindo data e hora futura, para que o conteúdo seja liberado automaticamente no momento programado sem requerer intervenção manual.
20. Como autor editorial, quero clicar em "Visualizar" no editor e ter o artigo salvo como rascunho automaticamente antes de abrir a página pública em uma nova aba, para validar exatamente a experiência real do leitor.
21. Como administrador inspecionando um rascunho ou artigo agendado na página pública, quero visualizar uma barra de aviso destacada no topo informando que aquele conteúdo está invisível para o público externo, para ter segurança jurídica sobre o que está online.
22. Como visitante anônimo tentando acessar diretamente a URL de um rascunho, quero receber uma resposta de página não encontrada (404), para que conteúdos incompletos nunca vazem publicamente.
23. Como administrador, quero duplicar um artigo existente com um clique, para usá-lo como base estrutural de novos artigos similares.
24. Como administrador, quero excluir um artigo mediante confirmação prévia, para evitar remoções acidentais da base de dados.
25. Como administrador, quero acompanhar a contagem total de visualizações de cada artigo no painel, para mensurar quais temas jurídicos despertam maior interesse do público.
26. Como leitor acessando a página de um artigo, quero que a contagem de visualizações seja incrementada de forma atômica e silenciosa em segundo plano, sem travamentos na renderização do conteúdo.

## Implementation Decisions

- **Módulo de Navegação e Layout Administrativo**:
  - O painel unificado em rota protegida receberá uma divisão explícita em sua barra de navegação: uma seção dedicada ao gerenciamento de processos e movimentações judiciais (JusTrack) e outra seção dedicada ao Conteúdo Jurídico (listagem de artigos e criação de novos artigos).
  - O fluxo de login atual em formulário de autenticação por e-mail e senha e o hook de sessão são compartilhados integralmente.
- **Modelagem de Dados e Armazenamento no Banco**:
  - O esquema do banco de dados conterá tabelas para categorias, tags, artigos e a relação muitos-para-muitos entre artigos e tags.
  - A visibilidade e o status dos artigos são determinados puramente pelo campo de data de publicação com fuso horário (`published_at`): nulo equivale a rascunho; data estritamente futura equivale a agendado; data presente ou anterior equivale a publicado.
  - As políticas de segurança no nível de linha (RLS) garantem que usuários anônimos e autenticados leiam apenas artigos cuja data de publicação já tenha sido atingida, enquanto usuários autenticados possuem privilégio amplo de leitura, criação, alteração e exclusão.
  - O seed inicial do banco conterá as sete áreas de atuação institucional do escritório como categorias ativas, além dos três artigos de referência apresentados no mockup inicial publicados com conteúdo completo.
  - Os artigos armazenam o conteúdo em formato estruturado para reedição no editor e em formato HTML pré-processado para renderização pública de alta performance.
- **Armazenamento de Imagens**:
  - Integração com Cloudflare R2 por meio de uma função serverless intermediária no Supabase que emite URLs pré-assinadas com método PUT e tempo de expiração curto para clientes autenticados.
  - O frontend realiza o envio direto do arquivo binário para o endpoint do R2 após validar tipo de mídia permitido (JPEG, PNG, WebP) e tamanho máximo de 5MB.
  - O editor aceitará de forma complementar a atribuição de imagens através de URLs públicas diretas, tratando graciosamente ausência ou falha de credenciais do serviço de armazenamento.
- **Contagem Atômica de Visualizações**:
  - O incremento de visualizações é realizado através de uma rotina no banco de dados com privilégio elevado de execução (`SECURITY DEFINER`), permitida para chamadas do cliente público, garantindo atomicidade matemática sem conceder permissão de alteração de dados da tabela de artigos para visitantes.
  - O frontend utiliza armazenamento de sessão do navegador para prevenir contagens espúrias durante recarregamentos sucessivos da mesma página.
- **Sanitização e Segurança do HTML Público**:
  - Todo o código HTML de artigos renderizado publicamente passa por sanitização estrita de nós e atributos antes da injeção no DOM, prevenindo injeções de scripts maliciosos.
- **Integração de SEO e Schemas**:
  - O cabeçalho das páginas públicas de artigos emite metatags dinâmicas de título, descrição, autor, dados Open Graph e bloco de dados estruturados Schema.org do tipo `Article`, conectado à entidade principal de serviço jurídico do escritório.

## Testing Decisions

- **O que constitui um bom teste**:
  - Testes devem verificar o comportamento externo observável do sistema (respostas de rotas, renderização visual de estados e contratos de banco) em vez de acoplamento com variáveis internas de estado ou implementações privadas.
- **Costura Principal de Teste (Highest Testing Seam)**:
  - **Nível de Interface e Rota (UI & Router Seam)**:
    - Verificação de renderização da seção de artigos recentes na Home quando há artigos e ocultamento quando não há.
    - Verificação do fluxo de filtros e paginação na listagem pública.
    - Verificação da renderização do artigo detalhado (metadados, cabeçalho com autor e OAB, tipografia e CTA).
    - Verificação de proteção de rota: redirecionamento de usuários deslogados para login ao tentar acessar rotas administrativas de artigos.
  - **Validação de Build Contínuo**:
    - Execução do comando de build de produção do projeto ao final de cada etapa para assegurar integridade completa do TypeScript e do empacotamento de dependências.

## Out of Scope

- Área pública de comentários aberta a leitores anônimos.
- Sistema de múltiplos usuários/redatores com níveis distintos de permissão (ex.: revisor vs autor) — todos os advogados autenticados no escritório possuem acesso pleno de administração.
- Sistema de newsletter ou disparo automático de e-mails para lista de inscritos.
- Integração de feeds RSS automáticos nesta primeira versão.

## Further Notes

- Todas as nomenclaturas técnicas e de interface adotam o vocabulário oficial registrado no glossário de domínio do projeto (`CONTEXT.md`).
- A transição visual da seção de artigos na Home respeita integralmente a paleta de cores institucional (azul-marinho profundo `#0D1B30` e dourado `#C9A961`), posicionando-se exatamente acima da faixa de chamada telefônica institucional conforme a identidade visual aprovada.
