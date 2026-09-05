# Conteúdo Jurídico (Artigos)

Repositório e sistema de publicação de artigos e orientações jurídicas do escritório Dr. Edvaldo Rodrigues Ferreira.

## Linguagem

**Artigo**:
Publicação editorial jurídica com título, resumo, conteúdo estruturado, categoria, tags, autoria e status de publicação.
_Avoid_: Post, notícia, matéria, texto

**Conteúdo Jurídico**:
Denominação pública e institucional para a seção de artigos e orientações informativas do escritório.
_Avoid_: Blog, notícias, dicas

**Status de Publicação**:
Estado temporal de visibilidade do artigo derivado exclusivamente do campo `published_at` (Rascunho se nulo, Agendado se futuro, Publicado se presente ou passado).
_Avoid_: Estado do post, status booleano, flag is_published

**Imagem de Capa**:
Elemento visual principal exibido no card da listagem e no topo da página de leitura do artigo.
_Avoid_: Thumbnail, banner, foto de destaque

**Texto Alternativo (Alt)**:
Descrição textual da imagem de capa para acessibilidade e otimização para mecanismos de busca.
_Avoid_: Legenda, descrição da imagem

**Categoria**:
Eixo temático principal do artigo, correspondendo primordialmente a uma das 7 áreas de atuação do escritório.
_Avoid_: Seção, assunto, tema

**Tag**:
Termo livre indexador para conectar assuntos transversais entre múltiplos artigos.
_Avoid_: Palavra-chave, marcador, rótulo

**Autor**:
Identificação do profissional responsável pelo artigo, composto por nome e número de inscrição na OAB, com padrão no titular do escritório mas editável para coautores.
_Avoid_: Criador, redator, usuário

**Slug**:
Identificador textual legível e único na URL do artigo, gerado a partir do título inicial e protegido contra alterações acidentais pós-publicação.
_Avoid_: Link permanente, permalink, caminho

**Pré-visualização**:
Modo de visualização na rota pública exclusivo para administradores autenticados inspecionarem artigos em estado de rascunho ou agendados antes da liberação pública.
_Avoid_: Teste, rascunho público, preview interno

## CRM Jurídico

### Linguagem

**Cliente**:
Pessoa física ou jurídica registrada no sistema, independentemente da fase em que se encontra no relacionamento com o escritório (de potencial interessado a caso encerrado).
_Avoid_: Lead (como entidade separada), contato, prospecto, usuário

**Ciclo de Vida do Cliente**:
Estágio operacional e comercial do cliente no escritório, compreendendo os estados: `lead` (prospecção inicial), `consulta` (atendimento/reunião agendada ou realizada), `ativo` (contrato firmado com processo ou demanda em andamento) e `encerrado` (serviços concluídos ou arquivados).
_Avoid_: Status do lead, funil isolado, fase de venda

**Qualificação Jurídica**:
Conjunto completo de dados civis ou societários do cliente (nacionalidade, estado civil, profissão, RG, CPF/CNPJ, endereço) necessários para a redação de instrumentos jurídicos e procurações.
_Avoid_: Cadastro de usuário, dados de perfil

**Pasta do Caso**:
Diretório virtual sincronizado na árvore do Google Drive organizado segundo a hierarquia `Cliente / Caso`, sob custódia da pasta raiz do escritório.
_Avoid_: Pasta local, diretório do usuário, repositório de arquivos

**Documento Jurídico**:
Arquivo digital produzido (peça, contrato, procuração) ou recebido (notificação, comprovante, documento probatório) associado a um cliente e/ou caso.
_Avoid_: Anexo genérico, upload, arquivo temporário

**Modelo de Documento**:
Arquivo `.docx` padronizado contendo a estrutura base de uma peça ou contrato com variáveis dinâmicas demarcadas prontas para injeção de dados.
_Avoid_: Template, minuta avulsa, formulário

**Variável de Substituição**:
Marcador delimitado no modelo de documento correspondente a um atributo da qualificação jurídica do cliente ou do caso (ex.: `{nome_cliente}`, `{numero_processo}`).
_Avoid_: Tag, placeholder, curinga

**Visibilidade da Carteira**:
Classificação de acesso a um cliente ou caso entre `colegiado` (disponível para a equipe do escritório conforme o papel de cada colaborador) e `privado` (restrito ao responsável direto e aos colaboradores explicitamente delegados).
_Avoid_: Status público/privado, flag compartilhado

**Papel de Acesso**:
Nível hierárquico e funcional atribuído a um membro da equipe (`advogado`, `estagiario`, `secretaria`), determinante das permissões de leitura, mutação de dados e acesso a informações financeiras e contratuais.
_Avoid_: Cargo, perfil genérico, role

**Caso**:
Unidade fundamental de trabalho jurídico contratado ou sob consulta (consultivo, extrajudicial ou contencioso), agrupando documentos, tarefas, prazos e eventuais processos judiciais de um cliente.
_Avoid_: Pasta física, pasta de processo, demanda avulsa

**Processo Judicial**:
Ação contenciosa registrada nos tribunais sob um número único do CNJ, com tramitação e movimentações monitoradas automaticamente pelo sistema via DataJud.
_Avoid_: Caso (quando usado como sinônimo exclusivo de processo), número de distribuição

**Exclusão do Titular**:
Procedimento de remoção imediata de dados cadastrais aplicável exclusivamente a cadastros na fase de `lead` que não originaram instrumentos jurídicos ou casos contratuais.
_Avoid_: Exclusão irrestrita, delete geral, expurgo cego

**Custódia Legal**:
Estado de arquivamento protegido mantido para clientes com casos e serviços prestados, assegurando a integridade probatória pelo prazo decadencial e prescricional de 5 anos nos termos da legislação aplicável.
_Avoid_: Soft delete comum, rascunho de cliente

**Prazo Fatal**:
Data e horário limite com efeito preclusivo, vinculada a um caso ou processo, cujo descumprimento acarreta prejuízo processual irreversível.
_Avoid_: Lembrete simples, data de vencimento genérica

**Tarefa Operacional**:
Atividade interna atribuível a um membro da equipe (elaborar minuta, protocolar petição, recolher guia, atender cliente) sem efeito preclusivo autônomo.
_Avoid_: To-do genérico, pendência

**Contrato Financeiro**:
Pactuação pecuniária de honorários advocatícios (fixos, parcelados ou quota-litis/êxito) vinculada a um caso, de acesso e gestão restritos a advogados.
_Avoid_: Dados de pagamento, financeiro genérico, cobrança
