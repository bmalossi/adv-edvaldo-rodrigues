# ⚖️ Advocacia Edvaldo Rodrigues

> **Plataforma Web Institucional & CRM Jurídico de Alta Performance**  
> Solução integrada desenvolvida para o escritório de advocacia do **Dr. Edvaldo Rodrigues Ferreira** (OAB/SP nº 465.818), sediado em Praia Grande/SP.

---

[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=black&style=flat-square)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white&style=flat-square)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?logo=vite&logoColor=white&style=flat-square)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?logo=tailwindcss&logoColor=white&style=flat-square)](https://tailwindcss.com/)
[![shadcn/ui](https://img.shields.io/badge/UI-shadcn%2Fui-black?style=flat-square)](https://ui.shadcn.com/)
[![Supabase](https://img.shields.io/badge/Backend-Supabase-3ECF8E?logo=supabase&logoColor=white&style=flat-square)](https://supabase.com/)
[![Vitest](https://img.shields.io/badge/Tests-185%20Passing-success?logo=vitest&logoColor=white&style=flat-square)](https://vitest.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18.0.0-339933?logo=node.js&logoColor=white&style=flat-square)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-Proprietary-red?style=flat-square)](#-licen%C3%A7a)

---

## 📑 Sumário

- [Visão Geral](#-visão-geral)
- [Arquitetura do Sistema](#-arquitetura-do-sistema)
- [Módulos e Funcionalidades](#-módulos-e-funcionalidades)
  - [1. Portal Institucional & Conversão](#1-portal-institucional--conversão-público)
  - [2. CRM Jurídico & Gestão Processual](#2-crm-jurídico--gestão-processual-administrativo)
  - [3. Módulo Financeiro & Integração Asaas](#3-módulo-financeiro--integração-asaas)
  - [4. Governança, Segurança & LGPD](#4-governança-segurança--lgpd)
  - [5. Integração com Nuvem & Google Drive](#5-integração-com-nuvem--google-drive)
- [Stack Tecnológica](#-stack-tecnológica)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Variáveis de Ambiente](#-variáveis-de-ambiente)
- [Instalação e Execução Local](#-instalação-e-execução-local)
- [Testes Automatizados](#-testes-automatizados)
- [Decisões de Arquitetura (ADRs)](#-decisões-de-arquitetura-adrs)
- [Controle de Acesso e Perfis](#-controle-de-acesso-e-perfis-rbac)
- [Sobre o Escritório & Contato](#-sobre-o-escritório--contato)
- [Licença](#-licença)

---

## 🌟 Visão Geral

O projeto **Advocacia Edvaldo Rodrigues** é uma plataforma jurídica completa projetada sob medida para atender tanto o público externo em busca de consultoria e representação jurídica de excelência, quanto a rotina operacional interna do escritório.

A aplicação divide-se em duas camadas integradas:

1. **Portal Público de Alta Conversão**: Focado em autoridade de marca, captação de clientes, transparência nos serviços e indexação de ponta para motores de busca e inteligências artificiais (SEO / AEO / GEO), contando com blog técnico, calculadoras rescisórias e chatbot de triagem.
2. **ERP/CRM Jurídico Interno**: Painel administrativo protegido por autenticação e controle de permissões por papéis (RBAC), proporcionando gestão de ponta a ponta: funil de leads e clientes, dossiê de casos, controle de prazos processuais (CPC), emissão instantânea de peças e minutas em `.docx` e cobrança automatizada de honorários via Asaas (Pix, Boleto e Cartão de Crédito).

---

## 🏛️ Arquitetura do Sistema

O sistema adota uma arquitetura em camadas orientada ao domínio (*Domain-Driven Design* simplificado), separando regras puras de negócio dos componentes visuais e das integrações externas.

```mermaid
flowchart TD
    subgraph Public["🌐 Portal Público"]
        A[Visitante / Cliente] --> B[Site Institucional & Blog]
        B --> C["Speculation Rules API (LCP ~ 0)"]
        B --> D["Prerender Estático (Build-Time)"]
        B --> E["Calculadoras Trabalhistas (CLT/PJ)"]
        B --> F["Chatbot de Triagem IA"]
    end

    subgraph Internal["💼 Painel Administrativo / CRM"]
        G[Advogados / Equipe] --> H["Autenticação & RBAC"]
        H --> I["Funil Processual & Casos"]
        H --> J["Funil de Clientes & Timeline"]
        H --> K["Agenda de Prazos Fatais (CPC)"]
        H --> L["Geração de Documentos (DOCX/PDF)"]
        H --> M["Módulo Financeiro & Cobranças"]
    end

    subgraph Backend["☁️ Backend & Nuvem"]
        N[Supabase PostgreSQL + RLS]
        O[Supabase Auth & Storage]
        P[Supabase Edge Functions]
        Q[Google Drive API - Service Account]
        R[Gateway Financeiro Asaas v3]
    end

    B -.->|Metadados JSON-LD & Feed| P
    F -.->|Webhook n8n / IA| P
    H --> N
    I --> N
    J --> N
    K --> N
    L -.->|Templates & Emissões| N
    M -->|Sync & Cobranças| P
    P -->|API Externa| R
    R -->|Webhooks Assíncronos| P
    P -->|Atualização de Status & Funil| N
    P -->|Organização de Pastas| Q
```

---

## 📦 Módulos e Funcionalidades

### 1. Portal Institucional & Conversão (Público)

- **Apresentação Profissional**: Identidade visual sóbria e moderna desenvolvida com Tailwind CSS e animações refinadas via Framer Motion.
- **Áreas de Atuação**: Detalhamento prático com modais explicativos das especialidades do escritório:
  - Direito Civil e Contratos
  - Direito Empresarial
  - Direito do Trabalho (Reclamatórias, Rescisões e Consultoria)
  - Direito Previdenciário (Aposentadorias, Benefícios e Revisões do INSS)
  - Direito Criminal / Penal
  - Direito de Família e Sucessões
  - Direito Militar
- **Calculadora Jurídica Interativa**:
  - **Calculadora CLT**: Simulação completa de verbas rescisórias (aviso prévio, férias vencidas/proporcionais, 13º proporcional, saldo de salário e multa rescisória de 40% do FGTS).
  - **Simulador PJ vs CLT**: Análise comparativa de custos tributários e pejotização.
- **Conteúdo Jurídico (Blog & CMS)**:
  - Artigos doutrinários com tipografia técnica e formatação editorial.
  - Editor *rich-text* avançado (TipTap) e banco central de imagens.
  - Otimização semântica com schemas Schema.org `LegalScholarlyArticle` e `BreadcrumbList`.
- **Chatbot Inteligente de Pré-Atendimento**:
  - Widget interativo para recepção de visitantes e triagem preliminar de demandas via IA / webhook automatizado.
- **Engenharia de Performance e SEO/GEO/AEO**:
  - **Speculation Rules API**: Navegação quase instantânea no Chromium com pré-renderização inteligente em background.
  - **Prerender Estático (Build-Time)**: Snapshots HTML gerados no build para rotas institucionais, garantindo leitura instantânea por crawlers (Googlebot, Bingbot, GPTBot, ClaudeBot, PerplexityBot).
  - **Sitemap Dinâmico (`/sitemap.xml`)**: Servido via Edge Function (`/api/sitemap`) sincronizado em tempo real com os artigos cadastrados no Supabase.

---

### 2. CRM Jurídico & Gestão Processual (Administrativo)

- **Funil Processual Kanban**:
  - Visualização em colunas por fases do ciclo de vida: `Negociação`, `Consultoria`, `Administrativo`, `Judicial`, `Recursal`, `Execução`, `Financeiro` e `Arquivamento`.
  - Gerenciamento de etapas dinâmicas personalizáveis por fase.
  - Contadores de processos, etiquetas de urgência e movimentação ágil dos cards.
- **Funil de Clientes & Carteira**:
  - Cadastro minucioso de Pessoa Física e Jurídica (documentos, endereço, contatos e dados complementares).
  - Status do ciclo de vida: `Lead`, `Consulta`, `Ativo`, `Inativo` e `Encerrado`.
  - Importação em massa de clientes via planilhas e histórico unificado de interações (WhatsApp, reuniões, ligações).
- **Dossiê Completo de Casos**:
  - Associação de clientes a múltiplos casos e processos.
  - Controle de partes contrárias, número CNJ, juízo/vara, valor da causa e advogado responsável.
  - Linha do tempo de movimentações e notas do processo.
- **Agenda Jurídica & Prazos Fatais**:
  - Painel de prazos processuais com cálculo em dias úteis de acordo com o Código de Processo Civil (CPC).
  - Controle de audiências, compromissos, reuniões e tarefas de equipe.
  - Rotinas automáticas de notificação para prevenção de perdas de prazo.
- **Motor de Geração de Documentos Client-Side**:
  - Geração automatizada de documentos jurídicos no formato `.docx` (Microsoft Word) e visualização para impressão/PDF de alta fidelidade:
    - *Procuração Ad Judicia et Extra* (com poderes gerais e especiais da cláusula ad judicia et extra)
    - *Declaração de Hipossuficiência Financeira* (Justiça Gratuita)
    - *Declaração de Isenção de Imposto de Renda (IRPF)*
    - *Declaração de Residência*
    - *Recibo de Honorários Advocatícios*
    - *Contrato de Prestação de Serviços Advocatícios e Honorários* (com suporte a múltiplos contratantes e cláusulas modulares)
  - Preenchimento dinâmico de dados cadastrais a partir do perfil do cliente e do caso selecionado, utilizando `docxtemplater` e `pizzip`.
  - Histórico de documentos emitidos com retenção e reuso de configurações.
- **Central de Backup & Exportação**:
  - Exportação completa da carteira de clientes, casos e movimentações em planilhas Excel (`.xlsx`).

---

### 3. Módulo Financeiro & Integração Asaas

- **Emissão Unificada de Cobranças**:
  - Cobrança de honorários diretamente na ficha do cliente ou no Drawer do Caso.
  - Modalidades suportadas: **Pix** (QR Code instantâneo e código copia-e-cola), **Boleto Bancário** (código de barras, linha digitável e link do PDF) e **Cartão de Crédito**.
  - Formatos: Pagamento à vista, parcelamento em até 12x ou assinatura recorrente (contrato de partido mensal).
- **Segurança Zero-PCI**:
  - Processamento de cartão delegado com segurança à página hospedada do Asaas (`invoice_url`), eliminando a custódia de dados bancários sensíveis pelo escritório.
- **Sincronização & Prevenção de Duplicidades**:
  - Verificação prévia de clientes por CPF/CNPJ na API do Asaas antes da criação.
  - Geração de identificador determinístico `externalReference` para garantia de idempotência e blindagem contra cobranças duplicadas.
- **Webhooks Assíncronos & Automação da Esteira**:
  - Processamento dos eventos `PAYMENT_RECEIVED`, `PAYMENT_CONFIRMED` e `PAYMENT_OVERDUE`.
  - **Avanço Automático de Etapa**: Ao confirmar a liquidação financeira da entrada/honorários:
    - O cliente é promovido automaticamente de `Lead`/`Consulta` para `Ativo`.
    - O caso avança automaticamente para a etapa de `Fechamento` (ou execução).
    - Uma interação de pagamento é registrada de forma imutável na timeline do cliente.
  - Tratamento de inadimplência com alertas e status de vencimento.

---

### 4. Governança, Segurança & LGPD

- **Autenticação Segura**: Supabase Auth com tokens JWT e sessões criptografadas.
- **Row Level Security (RLS)**: Todas as tabelas do PostgreSQL possuem políticas de segurança ativas a nível de linha, garantindo sigilo absoluto dos clientes e processos.
- **Controle de Acesso Baseado em Papéis (RBAC Dinâmico)**:
  - Perfis de fábrica: `Administrador`, `Sócio`, `Advogado Associado` e `Estagiário/Assistente`.
  - Matriz granular por Módulo (`clientes`, `casos`, `agenda`, `documentos`, `financeiro`, `relatorios`, `usuarios`, `perfis_acesso`) e Ação (`visualizar`, `criar`, `editar`, `excluir`).
  - Escopos de visibilidade: `individual` (carteira própria) e `geral` (colegiado/escritório).
- **Gestão de Acesso**:
  - Criação de novos usuários com senha temporária.
  - Interceptação de navegação e fluxo forçado de troca de senha no primeiro login (`/admin/trocar-senha`).
- **Trilha de Auditoria**:
  - Tabela dedicada de auditoria imutável registrando autor, data, entidade e valores anteriores e novos de alterações críticas.
- **Conformidade com a LGPD**:
  - Separação entre dados pessoais e dados processuais públicos (Datajud).
  - *Soft delete* com períodos de retenção diferenciados e garantia de sigilo advogado-cliente.

---

### 5. Integração com Nuvem & Google Drive

- **Organização de Documentos**: Estrutura hierárquica automática de pastas no Google Drive do escritório segregadas por cliente e por caso.
- **Integração Backend**: Comunicação segura via Google Service Account através das Edge Functions do Supabase, sem expor chaves privadas no navegador.
- **Upload e Visualização**: Pré-visualização de arquivos diretamente pelo painel administrativo e sincronização de metadados.

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologias |
| :--- | :--- |
| **Linguagem & Tipagem** | [TypeScript](https://www.typescriptlang.org/) (Strict Mode) |
| **Framework Frontend** | [React 18](https://react.dev/) com [Vite 5](https://vitejs.dev/) |
| **Roteamento** | [React Router DOM v6](https://reactrouter.com/) |
| **Estilização & Design** | [Tailwind CSS v3](https://tailwindcss.com/), `@tailwindcss/typography`, Lucide Icons |
| **Componentes de UI** | [shadcn/ui](https://ui.shadcn.com/) sobre primitivos do [Radix UI](https://www.radix-ui.com/) |
| **Animações & Gestos** | [Framer Motion](https://www.framer.com/motion/) |
| **Gerenciamento de Estado/Cache** | [TanStack React Query v5](https://tanstack.com/query/latest) |
| **Formulários & Validação** | [React Hook Form](https://react-hook-form.com/), [Zod](https://zod.dev/) |
| **Editor de Texto Rico (CMS)** | [TipTap Editor](https://tiptap.dev/) |
| **Geração de Documentos** | [docxtemplater](https://docxtemplater.com/), [pizzip](https://github.com/open-xml-templating/pizzip), [jszip](https://stuk.github.io/jszip/), [file-saver](https://github.com/eligrey/FileSaver.js/) |
| **Manipulação de Planilhas** | [SheetJS (xlsx)](https://sheetjs.com/) |
| **Backend & Banco de Dados** | [Supabase](https://supabase.com/) (PostgreSQL 15, Auth, RLS, Storage) |
| **Edge Functions / Serverless** | Supabase Edge Functions ([Deno](https://deno.land/)), [Vercel Serverless Functions](https://vercel.com/) |
| **Gateway de Pagamento** | [Asaas API v3](https://docs.asaas.com/) (Pix, Boletos, Assinaturas e Cartão) |
| **Integração de Arquivos** | [Google Drive API v3](https://developers.google.com/drive) (Service Account) |
| **SEO & Renderização** | `vite-plugin-prerender`, `@prerenderer/renderer-puppeteer`, Speculation Rules API |
| **Testes Automatizados** | [Vitest](https://vitest.dev/), [React Testing Library](https://testing-library.com/), [jsdom](https://github.com/jsdom/jsdom) |
| **Padronização de Código** | [ESLint 9](https://eslint.org/), typescript-eslint |

---

## 📂 Estrutura do Projeto

```text
adv-edvaldo-rodrigues/
├── .env.example              # Modelo documentado de variáveis de ambiente
├── .gitignore                # Arquivos e pastas ignorados pelo controle de versão
├── .npmrc                    # Configurações de instalação de pacotes
├── api/                      # Serverless Edge Functions da Vercel
│   └── sitemap.ts            # Gerador dinâmico de sitemap.xml com artigos do Supabase
├── docs/                     # Documentação de engenharia e especificações
│   ├── adr/                  # Registros de Decisões de Arquitetura (ADRs 0001 a 0014)
│   ├── spec-crm-prd.md       # Documento de Requisitos de Produto do CRM
│   └── spec-integracao-asaas-cobrancas.md  # Especificação técnica do módulo Asaas
├── public/                   # Arquivos públicos e estáticos
│   ├── robots.txt            # Diretivas de indexação para buscadores
│   ├── sitemap.xml           # Fallback estático de sitemap
│   └── speculationrules.json # Regras de prerender/prefetch da Speculation Rules API
├── src/                      # Código-fonte da aplicação
│   ├── assets/               # Imagens, logotipos e vetores
│   ├── components/           # Componentes modulares React
│   │   ├── admin/            # Componentes do painel administrativo (Layout, RBAC, Minutas)
│   │   ├── AIChatbot/        # Widget e interface do Chatbot de triagem
│   │   ├── calculadora/      # Calculadora Trabalhista CLT e Comparativo PJ
│   │   ├── crm/              # Componentes do CRM (Kanban, Drawer, Asaas, Drive Explorer)
│   │   ├── site/             # Componentes do portal público (Navbar, Footer, SEOHead, Cards)
│   │   └── ui/               # Componentes atômicos shadcn/ui (Button, Dialog, Form, Input...)
│   ├── config/               # Constantes de configuração e metadados
│   ├── contexts/             # Provedores de contexto React (Auth, Permissões)
│   ├── domain/               # Camada de Domínio e Regras de Negócio Puras
│   │   └── crm/              # Entidades, validadores e lógica pura
│   │       ├── agenda.ts     # Prazos e regras de contagem em dias úteis (CPC)
│   │       ├── asaas.ts      # Validadores de CPF/CNPJ, payloads e reducers de cobrança
│   │       ├── backup.ts     # Estratégia de exportação e salvaguarda
│   │       ├── caso.ts       # Ciclo de vida e regras de casos processuais
│   │       ├── cliente.ts    # Modelagem e validação da carteira de clientes
│   │       ├── documentos/   # Motor de geração de documentos e minutas contratuais
│   │       ├── drive.ts      # Estrutura de arquivos e pastas do Google Drive
│   │       └── rbac.ts       # Definição de permissões, papéis e auditoria
│   ├── hooks/                # Custom React Hooks (useAuth, usePermission, useToast...)
│   ├── integrations/         # Clientes de serviços externos (Supabase Client)
│   ├── lib/                  # Utilitários globais e helpers de formatação
│   ├── pages/                # Páginas e rotas da aplicação
│   │   ├── admin/            # Telas administrativas (Dashboard, Funil, Clientes, Casos...)
│   │   ├── AreasAtuacao.tsx  # Página pública de especialidades jurídicas
│   │   ├── ArtigoDetalhe.tsx # Visualização de publicação com schema LegalScholarlyArticle
│   │   ├── Calculadora.tsx   # Página pública da calculadora rescisória
│   │   ├── ConteudoJuridico.tsx # Blog jurídico institucional
│   │   └── Home.tsx          # Página principal institucional
│   └── test/                 # Suíte de testes automatizados (185 testes unitários)
├── supabase/                 # Configurações, migrações e edge functions do Supabase
│   ├── functions/            # Edge Functions em Deno
│   │   ├── asaas-criar-cobranca/   # Criação de cobranças Pix, Boleto e Cartão
│   │   ├── asaas-sync-customer/    # Sincronização e consulta de clientes no Asaas
│   │   ├── asaas-webhook/          # Receptor autenticado de webhooks do Asaas
│   │   ├── chatbot-ai/             # Processamento de inteligência artificial
│   │   ├── google-drive-explorer/  # Listagem e navegação de pastas no Drive
│   │   └── upload-documento-drive/ # Upload seguro para o Google Drive
│   └── migrations/           # Scripts SQL versionados de evolução do banco de dados
├── tailwind.config.ts        # Configuração do Tailwind CSS e temas
├── vercel.json               # Configurações de cabeçalhos de segurança, cache e rewrites
├── vite.config.ts            # Configuração do Vite com prerender estático e Puppeteer
└── vitest.config.ts          # Configuração do ambiente de testes Vitest
```

---

## 🔑 Variáveis de Ambiente

Para o correto funcionamento do ambiente de desenvolvimento e produção, crie um arquivo `.env.local` na raiz do projeto com base no arquivo [`.env.example`](file:///c:/Users/sorai/Desktop/Bruno/Projetos/adv-edvaldo-rodrigues-main/.env.example):

### Variáveis do Frontend (`Vite`)

| Variável | Obrigatória | Escopo | Descrição |
| :--- | :---: | :---: | :--- |
| `VITE_SUPABASE_URL` | Sim | Client | URL pública da instância do Supabase (`https://<ref>.supabase.co`). |
| `VITE_SUPABASE_ANON_KEY` | Sim | Client | Chave anônima pública (*anon key*) do Supabase para requisições com RLS. |
| `VITE_WEBHOOK_URL` | Sim | Client | Endpoint do webhook para onde as mensagens do Chatbot IA são despachadas. |
| `VITE_GOOGLE_DRIVE_ROOT_FOLDER_ID` | Sim | Client | ID da pasta raiz no Google Drive designada para os arquivos do escritório. |
| `VITE_STORAGE_CUSTOM_DOMAIN` | Não | Client | Domínio customizado para CDN de mídia / Cloudflare R2 (ex: `arquivos.edvaldorodrigues.com.br`). |

### Variáveis do Servidor & Edge Functions (Supabase / Vercel)

> ⚠️ **Atenção**: As variáveis abaixo contêm credenciais administrativas sensíveis e **jamais** devem ser expostas no bundle client-side do navegador.

| Variável | Obrigatória | Escopo | Descrição |
| :--- | :---: | :---: | :--- |
| `SUPABASE_SERVICE_ROLE_KEY` | Sim | Server / Edge | Chave mestra (*service role*) usada pela Edge Function do sitemap e webhooks. |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Sim | Edge Function | E-mail da Service Account do Google Cloud habilitada para a Google Drive API. |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | Sim | Edge Function | Chave privada PEM (`-----BEGIN PRIVATE KEY-----`) da Service Account. |
| `ASAAS_API_KEY` | Sim | Edge Function | Chave de API da conta Asaas (gerada no menu de Integrações do Asaas). |
| `ASAAS_ENVIRONMENT` | Sim | Edge Function | Ambiente da API Asaas: `sandbox` (testes) ou `production` (produção). |
| `ASAAS_WEBHOOK_ACCESS_TOKEN` | Sim | Edge Function | Token de segurança validado no cabeçalho `asaas-access-token` do webhook. |

---

## 🚀 Instalação e Execução Local

### Pré-requisitos

- **Node.js**: versão `18.0.0` ou superior (recomendado Node 20 LTS).
- **npm** (versão 9+) ou **bun**.
- Uma conta ativa e projeto configurado no [Supabase](https://supabase.com).

### 1. Clonar o repositório

```bash
git clone https://github.com/seu-usuario/adv-edvaldo-rodrigues.git
cd adv-edvaldo-rodrigues
```

### 2. Instalar as dependências

```bash
npm install
```

> **Nota**: O arquivo `.npmrc` possui a diretiva `puppeteer_skip_download=true` para otimizar o tempo de instalação local. Para executar o prerender estático de produção em máquinas locais, o Chromium pode ser configurado sob demanda.

### 3. Configurar as variáveis de ambiente

Copie o arquivo de exemplo e preencha as variáveis correspondentes ao seu ambiente:

```bash
cp .env.example .env.local
```

### 4. Executar o servidor de desenvolvimento

```bash
npm run dev
```

A aplicação estará disponível em `http://localhost:5173`.

### 5. Compilar para produção

```bash
npm run build
```

Para pré-visualizar a versão de build localmente:

```bash
npm run preview
```

---

## 🧪 Testes Automatizados

O projeto conta com uma suíte abrangente de **185 testes automatizados** cobrindo todas as regras de domínio crítico (cálculos de prazos da agenda, validações e reducers do Asaas, gerador e parser de minutas DOCX, regras de transição do Kanban, validações de importação de clientes e segurança de RBAC).

Para rodar todos os testes uma única vez:

```bash
npm test
```

Para rodar os testes no modo contínuo (*watch mode*):

```bash
npm run test:watch
```

Para verificar problemas de tipagem e padronização com ESLint:

```bash
npm run lint
```

---

## 📐 Decisões de Arquitetura (ADRs)

Todas as principais decisões técnicas e de design de software estão formalizadas na pasta [`docs/adr/`](file:///c:/Users/sorai/Desktop/Bruno/Projetos/adv-edvaldo-rodrigues-main/docs/adr/):

- [`ADR-0001`](file:///c:/Users/sorai/Desktop/Bruno/Projetos/adv-edvaldo-rodrigues-main/docs/adr/0001-integracao-admin-justrack.md): Integração e estrutura base da área administrativa.
- [`ADR-0002`](file:///c:/Users/sorai/Desktop/Bruno/Projetos/adv-edvaldo-rodrigues-main/docs/adr/0002-armazenamento-imagens-r2.md): Armazenamento de imagens com Cloudflare R2 / S3.
- [`ADR-0003`](file:///c:/Users/sorai/Desktop/Bruno/Projetos/adv-edvaldo-rodrigues-main/docs/adr/0003-etapas-dinamicas-funil.md): Gestão flexível de etapas dinâmicas no Funil Processual.
- [`ADR-0004`](file:///c:/Users/sorai/Desktop/Bruno/Projetos/adv-edvaldo-rodrigues-main/docs/adr/0004-escopo-completo-mvp-crm.md): Definição de escopo funcional do MVP do CRM Jurídico.
- [`ADR-0005`](file:///c:/Users/sorai/Desktop/Bruno/Projetos/adv-edvaldo-rodrigues-main/docs/adr/0005-integracao-google-drive-service-account.md): Integração com Google Drive via Google Service Account em Edge Functions.
- [`ADR-0006`](file:///c:/Users/sorai/Desktop/Bruno/Projetos/adv-edvaldo-rodrigues-main/docs/adr/0006-geracao-documentos-client-side-docxtemplater.md): Geração de minutas jurídicas client-side com docxtemplater e pizzip.
- [`ADR-0007`](file:///c:/Users/sorai/Desktop/Bruno/Projetos/adv-edvaldo-rodrigues-main/docs/adr/0007-modelo-acesso-rbac-carteira-hibrida.md): Modelo de acesso híbrido (carteira privada vs colegiado).
- [`ADR-0008`](file:///c:/Users/sorai/Desktop/Bruno/Projetos/adv-edvaldo-rodrigues-main/docs/adr/0008-separacao-caso-crm-e-processo-datajud.md): Desacoplamento entre Caso de negócio no CRM e Processo Judicial Datajud.
- [`ADR-0009`](file:///c:/Users/sorai/Desktop/Bruno/Projetos/adv-edvaldo-rodrigues-main/docs/adr/0009-conformidade-lgpd-retencao-diferenciada.md): Conformidade com a LGPD e ciclo de vida de dados pessoais.
- [`ADR-0010`](file:///c:/Users/sorai/Desktop/Bruno/Projetos/adv-edvaldo-rodrigues-main/docs/adr/0010-disparo-lembretes-prazos-supabase-cron.md): Disparos e notificações de prazos fatais via agendador cron.
- [`ADR-0011`](file:///c:/Users/sorai/Desktop/Bruno/Projetos/adv-edvaldo-rodrigues-main/docs/adr/0011-isolamento-financeiro-rls-contratos-honorarios.md): Isolamento financeiro de contratos de honorários por RLS.
- [`ADR-0012`](file:///c:/Users/sorai/Desktop/Bruno/Projetos/adv-edvaldo-rodrigues-main/docs/adr/0012-integracao-rotas-crm-admin-layout.md): Integração do fluxo de navegação e guardas de rota no painel administrativo.
- [`ADR-0013`](file:///c:/Users/sorai/Desktop/Bruno/Projetos/adv-edvaldo-rodrigues-main/docs/adr/0013-rbac-dinamico-roles-permissions.md): Governança de perfis dinâmicos de acesso e permissões atômicas.
- [`ADR-0014`](file:///c:/Users/sorai/Desktop/Bruno/Projetos/adv-edvaldo-rodrigues-main/docs/adr/0014-integracao-asaas-cobrancas-webhooks.md): Integração com Asaas API v3, cobranças Zero-PCI e webhooks assíncronos.

---

## 👥 Controle de Acesso e Perfis (RBAC)

O sistema possui uma matriz de segurança por papéis protegida na base de dados pelo Supabase RLS:

| Perfil de Acesso | Clientes | Casos / Processos | Agenda / Prazos | Documentos | Financeiro | Usuários & Perfis | Backups & Logs |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Administrador** | Total | Total | Total | Total | Total | Total | Total |
| **Sócio** | Total | Total | Total | Total | Total | Visualizar | Leitura |
| **Advogado Associado** | Carteira / Geral | Próprios / Geral | Próprios | Total | Restrito | Não | Não |
| **Estagiário / Assistente**| Leitura / Inserção| Próprios | Visualizar | Modelos | Sem acesso | Não | Não |

---

## 🏛️ Sobre o Escritório & Contato

**Advocacia Edvaldo Rodrigues**  
- **Responsável**: Dr. Edvaldo Rodrigues Ferreira  
- **Inscrição**: OAB/SP nº 465.818  
- **Endereço**: Avenida Presidente Costa e Silva, nº 733, Sala 21, 2º andar – Office Brasil, Boqueirão, Praia Grande/SP – CEP 11700-007  
- **Telefone / WhatsApp**: (13) 99682-4364  
- **E-mail Institucional**: `edvaldorodrigues.advocacia@gmail.com`  
- **Website Oficial**: [edvaldorodrigues.com.br](https://edvaldorodrigues.com.br)

---

## 📄 Licença

Este projeto é de propriedade exclusiva do escritório **Edvaldo Rodrigues Advocacia**. Todos os direitos reservados. Proibida a reprodução, cópia ou distribuição não autorizada deste código ou de seus componentes.
