## Problem Statement

No CRM jurídico do escritório Edvaldo Rodrigues Advocacia, a equipe precisa organizar documentos dos clientes no Google Drive. Atualmente, quando um cliente novo é cadastrado e não possui pasta vinculada, o operador é obrigado a sair do sistema, abrir o Google Drive manualmente no navegador, criar a pasta com o nome do cliente, copiar o ID/link da pasta e retornar ao CRM para colar e vincular.

Além disso, ao emitir contratos, procurações ou declarações na tela de "Gerar Documentos", o arquivo PDF baixado precisa ser renomeado e feito upload manual no Google Drive, sem padronização de subpastas por área jurídica (Criminal, Trabalhista, Previdenciário, etc.). Isso gera atrito operacional, perda de tempo e risco de documentos serem salvos em pastas erradas ou esquecidos no computador local.

## Solution

1. Adicionar um botão de ação rápida "Criar Nova Pasta no Google Drive" na ficha do cliente que cria automaticamente a pasta na raiz de processos do escritório e já atualiza o vínculo no CRM.
2. Adicionar na tela de "Gerar Documentos" a opção ativa "Salvar cópia no Google Drive" com um seletor de categorias temáticas (Criminal, Trabalhista, Previdenciário, Cível, Família & Sucessões, Tributário, etc. ou categoria personalizada).
3. Ao emitir ou baixar o PDF, o sistema orquestra automaticamente a verificação/criação da pasta do cliente, a criação sob demanda da subpasta temática e o upload do arquivo PDF, informando o usuário com feedback visual sem interromper ou bloquear o fluxo de download no navegador.

## User Stories

1. As an assistente jurídico, I want a button to create a client folder directly in Google Drive from the client's file, so that I don't have to manually open Google Drive and copy/paste folder IDs.
2. As an advogado, I want the client's newly created folder to be automatically named with the client's exact registered name, so that the file tree matches the physical and digital identity of the client.
3. As an assistente jurídico, I want the new client folder to be created inside the office's configured root directory ("Processos por área"), so that all client records are organized consistently in a centralized location.
4. As an operador do CRM, I want the system to show a loading spinner while creating the folder, so that I have clear feedback and don't click multiple times accidentally.
5. As an operador do CRM, I want to keep the option to manually link an existing Google Drive folder, so that historical folders created prior to this feature can still be associated.
6. As an advogado, I want an active option "Salvar cópia no Google Drive" in the "Gerar Documentos" screen, so that newly drafted legal documents are archived automatically without manual intervention.
7. As an operador do CRM, I want a category dropdown in "Gerar Documentos" with default legal areas (Criminal, Previdenciário, Trabalhista, Cível, Família, etc.), so that documents are categorized neatly by legal branch.
8. As an advogado, I want the system to auto-select the document category if the selected case already has a defined legal area, so that I save clicks and avoid misclassification.
9. As an operador do CRM, I want to be able to type a custom subfolder name when selecting "Outra", so that I can accommodate specialized legal proceedings or extrajudicial matters.
10. As an assistente jurídico, I want the system to sanitize category names with slashes or invalid characters, so that folder paths do not break on Google Drive.
11. As an operador do CRM, I want the category subfolder to be created automatically on-the-fly if it does not yet exist, so that I never get blocked by missing directories.
12. As an operador do CRM, I want the system to check if a category subfolder already exists before trying to create it, so that duplicate folders with identical names are not created.
13. As an advogado, I want the client's main folder to be created automatically if I generate a document for a client who doesn't have one yet, so that the document is still saved to Google Drive without disrupting the drafting workflow.
14. As an operador do CRM, I want the generated document sent to Google Drive to be in official PDF format, so that it remains tamper-resistant and ready for signing or filing.
15. As an advogado, I want my local PDF browser download to succeed even if the Google Drive upload encounters an API error or timeout, so that my immediate client meeting or court deadline is not held hostage by external service issues.
16. As an operador do CRM, I want clear toast notifications confirming when the file has been successfully uploaded to the client's thematic subfolder, so that I have peace of mind that the archive is up to date.
17. As an administrador do escritório, I want all Google Drive API credentials to remain secured on the backend, so that secret OAuth keys are never exposed to browser clients.
18. As an operador do CRM, I want the client's file to immediately display the Google Drive file explorer view after creating the folder, so that I can see the new folder ready for use without reloading the page.

## Implementation Decisions

- The CRM Drive domain service will be enhanced with dedicated orchestrators:
  - A routine to obtain or create the client's Drive folder in the system root and persist the link.
  - A routine to inspect child items of a folder and obtain or create a category subfolder in a case-insensitive, idempotent manner.
  - A routine to orchestrate the generation and transmission of the PDF binary to the resolved category subfolder.
- Component interfaces:
  - The client document panel component will display a primary "Criar Nova Pasta no Google Drive" action button alongside the existing link button when in the unlinked state.
  - The document generation interface will incorporate a Drive configuration section with an active toggle and category selection (standard areas + freeform text).
- Data structures:
  - Standard categories include Criminal, Previdenciário, Trabalhista, Cível, Família & Sucessões, Tributário, Administrativo, Geral / Diversos, and Custom.
- Error handling and resilience:
  - Non-blocking Drive upload: browser PDF download is prioritized; Drive failures are reported as non-fatal warnings with descriptive messages.

## Testing Decisions

- Single high seam: The CRM Drive service orchestrator layer (`drive-service` domain functions). Testing at this seam tests external behavior (folder discovery, on-demand creation, deduplication, and file dispatch) using mocked Google Drive API edge responses and Supabase client responses.
- Behavior to test:
  - Idempotency: resolving an existing category returns the existing ID without duplicate creation calls.
  - Case insensitivity: "criminal" matches "Criminal" without creating duplicates.
  - Sanitization: category names with invalid directory characters are cleansed before creation.
  - Resilient fallback: error in Drive upload propagates a warning while allowing the caller to complete the local emission flow.
- Prior art: Tests in `src/test/drive-dominio.test.ts` and `src/test/backup-dominio.test.ts`.

## Out of Scope

- Uploading editable DOCX files to Google Drive in this flow (only PDF).
- Auto-opening Google Drive tabs upon upload completion.
- Restructuring or renaming existing historical folders on Google Drive.
- Deleting or moving folders on Google Drive from the document generator.

## Further Notes

- Root folder resolution falls back to the Google Drive root if `configuracoes_backup_drive` does not define a custom root folder ID.
