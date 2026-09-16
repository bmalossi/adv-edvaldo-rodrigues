import { Cliente } from '@/domain/crm/cliente'
import {
  ConfigDocumentos,
  AdvogadoConfigDoc,
  OpcaoContrato,
  OpcaoProcuracao,
  OpcaoHipossuficiencia,
  OpcaoIrpf,
  OpcaoRecibo,
  OpcaoResidencia,
  ClausulaContrato
} from './tipos'
import { esc, dateLong, dateShort, formatarDataBr, money, clienteEndereco, clienteQualificacao } from './formatacao'
import { CLAUSULAS_PADRAO_CONTRATO } from './config-local'

export const DADOS_ESCRITORIO_DOCUMENTO: AdvogadoConfigDoc = {
  nome: 'EDVALDO RODRIGUES FERREIRA',
  oab: 'OAB/SP 465.818',
  endereco: 'Avenida Presidente Costa e Silva, nº 733, sala 21, 2º andar – Office Brasil, Boqueirão, Praia Grande/SP – CEP 11700-007',
  email: 'edvaldorodrigues.advocacia@gmail.com',
  telefone: '(13) 99682-4364'
}

function buildHeader(logo?: string | null): string {
  if (!logo) {
    return `<div class="letterhead"><div style="padding-bottom:3mm;border-bottom:1px solid #e2e8f0;font-size:13pt;font-weight:bold;color:#1e293b;letter-spacing:1px;text-align:center;">ADVOCACIA & CONSULTORIA JURÍDICA</div></div>`
  }
  return `<div class="letterhead"><img src="${logo}" alt="Logotipo"></div>`
}

function buildFooter(_adv?: AdvogadoConfigDoc): string {
  // O rodapé é geral do escritório e deve sempre apresentar exclusivamente os dados institucionais do escritório
  const d = DADOS_ESCRITORIO_DOCUMENTO
  return `<div class="doc-footer"><strong>${esc(d.nome)} | ${esc(d.oab)}</strong><br>${esc(d.endereco || '')}<br>${esc(d.email)} · ${esc(d.telefone)}</div>`
}

function buildPage(content: string, title: string = '', meta: string = '', adv: AdvogadoConfigDoc, logo?: string | null): string {
  return `<div class="doc-page">${buildHeader(logo)}${meta ? `<div class="doc-meta">${esc(meta)}</div>` : ''}${title ? `<div class="doc-title">${esc(title)}</div>` : ''}<div class="doc-body">${content}</div>${buildFooter(adv)}</div>`
}

export function buildProcuracao(
  c: Partial<Cliente>,
  adv: AdvogadoConfigDoc,
  cfg: ConfigDocumentos,
  logo: string | null,
  o: OpcaoProcuracao & { date?: string; city?: string; uf?: string; number?: string; signatureImg?: string | null }
): string {
  const date = o.date || new Date().toISOString().slice(0, 10)
  const city = o.city || 'Praia Grande'
  const uf = o.uf || 'SP'
  const num = o.number || ''

  let special = 'receber citação, confessar, reconhecer a procedência do pedido'
  if (o.transigir !== false) special += ', transigir, conciliar, desistir e renunciar ao direito sobre o qual se funda a ação'
  if (o.receber !== false) special += ', receber, dar quitação, requerer, receber e levantar valores e depósitos judiciais ou extrajudiciais, inclusive por alvará, MLE, RPV, precatório, depósito recursal ou transferência bancária'
  special += ', firmar compromisso'
  if (o.hipossuf !== false) special += ', assinar declaração de hipossuficiência econômica e requerer gratuidade da justiça'
  special += ', requerer medidas urgentes, penhoras, bloqueios, pesquisas patrimoniais e expedição de ofícios'
  if (o.inss) special += ', representar perante o Instituto Nacional do Seguro Social – INSS, requerer benefícios, revisões, recursos e ter acesso a processos administrativos'
  if (o.receita) special += ', representar perante a Receita Federal do Brasil, requerer cópias, certidões, apresentar declarações, defesas e recursos'
  if (o.poderesExtras) special += ', ' + o.poderesExtras.replace(/\.$/, '')

  const finalidade = o.finalidadeProc ? `<p><strong>FINALIDADE ESPECÍFICA:</strong> ${esc(o.finalidadeProc)}.</p>` : ''
  const enderecoAdv = adv.endereco || 'com escritório em ' + cfg.foro

  const body = `<p><strong>OUTORGANTE:</strong> ${esc(clienteQualificacao(c))}.</p>
  <p><strong>OUTORGADO:</strong> ${esc(adv.nome)}, advogado inscrito na ${esc(adv.oab)}, com escritório em ${esc(enderecoAdv)}, e-mail ${esc(adv.email)}, integrante da ${esc(cfg.empresa)}, registro OAB nº ${esc(cfg.socOab)}, CNPJ nº ${esc(cfg.cnpj)}.</p>
  <p>Pelo presente instrumento particular, o OUTORGANTE nomeia e constitui seu bastante procurador o advogado acima qualificado, conferindo-lhe poderes para o foro em geral, com a cláusula <strong>AD JUDICIA ET EXTRA</strong>, para representá-lo judicial, administrativa e extrajudicialmente, ativa ou passivamente, perante qualquer Juízo, Tribunal, órgão público ou entidade privada, em qualquer instância, podendo propor ações, apresentar defesas, recursos, requerimentos, notificações e demais medidas cabíveis, produzir provas, requerer documentos e certidões, acompanhar processos, procedimentos, inquéritos, perícias e audiências, praticando todos os atos necessários à defesa de seus interesses.</p>
  <p>Confere, ainda, nos termos do artigo 105 do Código de Processo Civil, poderes especiais para <strong>${esc(special)}</strong>.</p>
  <p>Fica o OUTORGADO autorizado a requerer reserva, destaque e levantamento de honorários contratuais e sucumbenciais; nomear preposto, quando legalmente cabível; praticar atos físicos ou eletrônicos; e ${o.substabelecer === false ? 'não substabelecer sem autorização expressa' : 'substabelecer, no todo ou em parte, com ou sem reserva de poderes'}.</p>${finalidade}
  <p style="margin-top:5mm;">${esc(city)}/${esc(uf)}, ${dateLong(date)}.</p>
  <div class="signature-block" style="margin-top:12mm;">
    <div class="signature-line"></div>
    <strong>${esc(String(c.nome_razao_social || '').toUpperCase())}</strong><br>
    CPF/CNPJ nº ${esc(c.cpf_cnpj || '')}
  </div>`

  return `<div class="document">${buildPage(body, 'PROCURAÇÃO AD JUDICIA ET EXTRA', num, adv, logo)}</div>`
}

export function buildHipossuficiencia(
  c: Partial<Cliente>,
  adv: AdvogadoConfigDoc,
  _cfg: ConfigDocumentos,
  logo: string | null,
  o: OpcaoHipossuficiencia & { date?: string; city?: string; uf?: string; number?: string }
): string {
  const date = o.date || new Date().toISOString().slice(0, 10)
  const city = o.city || 'Praia Grande'
  const uf = o.uf || 'SP'
  const num = o.number || ''

  let extra = ''
  if (o.situacao) extra += ` Declara, ainda, que atualmente se encontra na condição de ${esc(o.situacao)}.`
  if (o.rendaMensal) extra += ` Sua renda mensal aproximada é de ${esc(o.rendaMensal)}.`
  if (o.dependentes) extra += ` Possui ${esc(o.dependentes)} dependente(s).`
  if (o.hipoExtra) extra += ` ${esc(o.hipoExtra)}`

  const qualif = [c.nacionalidade, c.estado_civil, c.profissao].filter(Boolean).join(', ')
  const rgPart = c.rg_ie ? `portador(a) do RG nº ${esc(c.rg_ie)}, ` : ''

  const body = `<p><strong>${esc(String(c.nome_razao_social || '').toUpperCase())}</strong>, ${esc(qualif)}, ${rgPart}inscrito(a) no CPF/CNPJ nº ${esc(c.cpf_cnpj || '')}, residente e domiciliado(a) em ${esc(clienteEndereco(c))}, ${c.email ? `e-mail: ${esc(c.email)} e ` : ''}telefone: ${esc(c.telefone_whatsapp || '')}, <strong>DECLARA</strong>, para os devidos fins de direito e sob as penas da lei, que é pobre na expressão jurídica da palavra, não podendo suportar o pagamento das custas e despesas processuais sem prejuízo de seu sustento e de sua família.${extra}</p>
  <p>Por ser a expressão da verdade, firma a presente.</p>
  <p style="margin-top:6mm;">${esc(city)}/${esc(uf)}, ${dateLong(date)}.</p>
  <div class="signature-block" style="margin-top:16mm;">
    <div class="signature-line"></div>
    <strong>ASSINATURA DO(A) DECLARANTE</strong><br>
    ${esc(c.nome_razao_social || '')}
  </div>`

  return `<div class="document">${buildPage(body, 'DECLARAÇÃO DE HIPOSSUFICIÊNCIA', num, adv, logo)}</div>`
}

export function buildIrpf(
  c: Partial<Cliente>,
  adv: AdvogadoConfigDoc,
  _cfg: ConfigDocumentos,
  logo: string | null,
  o: OpcaoIrpf & { date?: string; city?: string; uf?: string; number?: string }
): string {
  const date = o.date || new Date().toISOString().slice(0, 10)
  const city = o.city || 'Praia Grande'
  const uf = o.uf || 'SP'
  const num = o.number || ''
  const rgPart = c.rg_ie ? `RG nº ${esc(c.rg_ie)}, ` : ''

  const body = `<p>Eu, <strong>${esc(String(c.nome_razao_social || '').toUpperCase())}</strong>, ${rgPart}CPF/CNPJ nº ${esc(c.cpf_cnpj || '')}, residente em ${esc(clienteEndereco(c))}, telefone ${esc(c.telefone_whatsapp || '')}, <strong>DECLARO</strong> ser isento(a) da apresentação da Declaração do Imposto de Renda Pessoa Física – DIRPF no(s) exercício(s) <strong>${esc(o.exercicios || '________________')}</strong>, por não incorrer em nenhuma das hipóteses de obrigatoriedade estabelecidas pela Receita Federal do Brasil.</p>
  <p>Esta declaração é firmada sob as penas da lei, nos termos da Lei nº 7.115/1983, declarando serem verdadeiras todas as informações prestadas.</p>
  ${o.finalidade ? `<p>Finalidade: ${esc(o.finalidade)}.</p>` : ''}
  <p style="margin-top:6mm;">${esc(city)}/${esc(uf)}, ${dateLong(date)}.</p>
  <div class="signature-block" style="margin-top:16mm;">
    <div class="signature-line"></div>
    <strong>${esc(String(c.nome_razao_social || '').toUpperCase())}</strong><br>
    CPF/CNPJ nº ${esc(c.cpf_cnpj || '')}
  </div>
  <p style="font-size:8pt;color:#64748b;margin-top:14mm;line-height:1.4;"><strong>Observação:</strong> a Receita Federal não emite declaração anual de isento. A ausência de obrigatoriedade pode ser declarada pelo próprio interessado, sob sua responsabilidade, conforme a legislação aplicável.</p>`

  return `<div class="document">${buildPage(body, 'DECLARAÇÃO DE ISENÇÃO DO IMPOSTO DE RENDA PESSOA FÍSICA (IRPF)', num, adv, logo)}</div>`
}

export function buildRecibo(
  c: Partial<Cliente>,
  adv: AdvogadoConfigDoc,
  cfg: ConfigDocumentos,
  logo: string | null,
  o: OpcaoRecibo & { date?: string; city?: string; uf?: string; number?: string; signatureImg?: string | null }
): string {
  const date = o.date || new Date().toISOString().slice(0, 10)
  const city = o.city || 'Praia Grande'
  const uf = o.uf || 'SP'
  const num = o.number || ''

  const signature = (o.useSignature && o.signatureImg)
    ? `<img class="signature-img" src="${o.signatureImg}" alt="Assinatura">`
    : '<div class="signature-line"></div>'

  const parcela = o.parcelaRecibo ? ` (${esc(o.parcelaRecibo)})` : ''

  const body = `<p><strong>${esc(String(c.nome_razao_social || '').toUpperCase())}</strong>, inscrito(a) no CPF/CNPJ nº ${esc(c.cpf_cnpj || '')}, declara, para os devidos fins, que efetuou o pagamento no valor de <strong>${money(o.valorRecibo)} (${esc(o.valorExtenso || 'valor por extenso não informado')})</strong> para <strong>${esc(adv.nome)}</strong>, advogado, inscrito no CPF nº ${esc(cfg.lawyerCpf)} e ${esc(adv.oab)}, integrante da ${esc(cfg.empresa)}.</p>
  <p>O valor refere-se a <strong>${esc(o.referenciaRecibo || 'prestação de serviços advocatícios')}${parcela}</strong>. O pagamento foi realizado por ${esc(o.formaPagamento || 'PIX')} nesta data.${o.obsRecibo ? ' ' + esc(o.obsRecibo) : ''}</p>
  <p>Por ser a expressão da verdade, firma-se o presente recibo.</p>
  <p style="margin-top:6mm;">${esc(city)}/${esc(uf)}, ${dateLong(date)}.</p>
  <div class="signature-block" style="margin-top:14mm;">
    <div class="sig-space" style="height:18mm; display:flex; align-items:flex-end; justify-content:center;">
      ${(o.useSignature && o.signatureImg) ? `<img class="signature-img" src="${o.signatureImg}" alt="Assinatura">` : ''}
    </div>
    <div class="signature-line"></div>
    <strong>${esc(adv.nome)}</strong><br>
    Advogado<br>
    ${esc(adv.oab)}
  </div>`

  return `<div class="document">${buildPage(body, 'RECIBO DE PAGAMENTO', num, adv, logo)}</div>`
}

export function buildResidencia(
  c: Partial<Cliente>,
  adv: AdvogadoConfigDoc,
  _cfg: ConfigDocumentos,
  logo: string | null,
  o: OpcaoResidencia & { date?: string; city?: string; uf?: string; number?: string }
): string {
  const date = o.date || new Date().toISOString().slice(0, 10)
  const city = o.city || 'Praia Grande'
  const uf = o.uf || 'SP'
  const num = o.number || ''

  const third = o.tipoResidencia === 'terceiro' && o.titularResidencia
  const declarant = third ? o.titularResidencia : c.nome_razao_social
  const cpf = third ? o.cpfTitular : c.cpf_cnpj
  const resident = third
    ? `DECLARO que ${esc(c.nome_razao_social || '')}, inscrito(a) no CPF/CNPJ nº ${esc(c.cpf_cnpj || '')}, reside e é domiciliado(a) no endereço ${esc(clienteEndereco(c))}${o.vinculoTitular ? `, sendo meu/minha ${esc(o.vinculoTitular)}` : ''}`
    : `DECLARO que sou residente e domiciliado(a) no endereço ${esc(clienteEndereco(c))}`

  const body = `<p>Eu, <strong>${esc(String(declarant || '').toUpperCase())}</strong>, inscrito(a) no CPF/CNPJ nº ${esc(cpf || '')}, ${resident}, para fins de comprovação de residência junto a ${esc(o.destinoResidencia || 'empresa ou órgão solicitante')}.</p>
  <p>Declaro, sob as penas da lei e nos termos dos artigos 1º, 2º e 3º da Lei nº 7.115/1983, que as informações são verdadeiras, estando ciente das responsabilidades civis, administrativas e criminais decorrentes de declaração falsa, inclusive do disposto no artigo 299 do Código Penal.</p>
  <p>Por ser a expressão da verdade, firmo a presente para que produza seus efeitos legais.</p>
  <p style="margin-top:6mm;">${esc(city)}/${esc(uf)}, ${dateLong(date)}.</p>
  <div class="signature-block" style="margin-top:16mm;">
    <div class="signature-line"></div>
    <strong>${esc(String(declarant || '').toUpperCase())}</strong><br>
    CPF/CNPJ nº ${esc(cpf || '')}
  </div>`

  return `<div class="document">${buildPage(body, 'DECLARAÇÃO DE RESIDÊNCIA', num, adv, logo)}</div>`
}

function interpolarTexto(texto: string, tags: Record<string, string>): string {
  return texto.replace(/\{([a-zA-Z0-9_-]+)\}/g, (match, key) => {
    const k = key.toLowerCase()
    return tags[k] !== undefined ? tags[k] : match
  })
}

function renderClauseHtml(clause: ClausulaContrato, tags: Record<string, string>): string {
  const interpolatedTitle = interpolarTexto(clause.titulo, tags)
  const interpolatedContent = interpolarTexto(clause.conteudo, tags)

  const lines = interpolatedContent
    .split(/\n+/)
    .map(l => l.trim())
    .filter(Boolean)

  const paragraphsHtml = lines
    .map(line => {
      const matchPrefix = line.match(/^(\d+\.\d+\.?\s*)(.*)$/)
      if (matchPrefix) {
        return `<p><strong>${esc(matchPrefix[1])}</strong>${esc(matchPrefix[2])}</p>`
      }
      return `<p>${esc(line)}</p>`
    })
    .join('')

  return `<div class="clause"><div class="clause-title">${esc(interpolatedTitle)}</div>${paragraphsHtml}</div>`
}

function estimateHtmlHeightMm(html: string): number {
  const plainText = html.replace(/<[^>]+>/g, '').trim()
  if (!plainText) return 0

  const pCount = (html.match(/<p\b/gi) || []).length
  const titleCount = (html.match(/class=["']clause-title["']/gi) || []).length
  const clauseCount = (html.match(/class=["']clause["']/gi) || []).length

  // Cada linha em coluna de 176mm comporta aprox. 85-90 caracteres
  const lines = Math.ceil(plainText.length / 88)
  const textHeight = lines * 4.9
  const paragraphMargins = pCount * 3.0
  const titleHeights = titleCount * 6.5
  const clauseMargins = clauseCount * 3.5

  return textHeight + paragraphMargins + titleHeights + clauseMargins
}

function estimateSignaturesHeightMm(signaturesHtml: string): number {
  const hasWitnesses = signaturesHtml.includes('TESTEMUNHA')
  return hasWitnesses ? 95 : 55
}

function distributeContractPages(
  preambuloHtml: string,
  clausesHtml: string[],
  signaturesHtml: string
): string[] {
  // Limite seguro em mm para que o conteúdo preencha as folhas sem estourar no rodapé
  // Página 1: Altura total A4 (297mm) - padding (30mm) - cabeçalho (29mm) - título/meta (22mm) = ~216mm
  const PAGE_1_MAX_MM = 210
  // Páginas 2+: Não têm o título do contrato, apenas cabeçalho reduzido e rodapé = ~233mm
  const PAGE_N_MAX_MM = 225

  const sigHeightMm = estimateSignaturesHeightMm(signaturesHtml)

  const pages: string[] = []
  let currentPageContent = preambuloHtml
  let currentHeightMm = estimateHtmlHeightMm(preambuloHtml)

  let index = 0

  // 1. Preenche Página 1
  while (index < clausesHtml.length) {
    const clause = clausesHtml[index]
    const clauseHeight = estimateHtmlHeightMm(clause)

    if (currentHeightMm + clauseHeight > PAGE_1_MAX_MM && currentPageContent !== preambuloHtml) {
      break
    }
    currentPageContent += clause
    currentHeightMm += clauseHeight
    index++
  }
  pages.push(currentPageContent)

  // 2. Preenche Páginas intermediárias
  while (index < clausesHtml.length) {
    currentPageContent = ''
    currentHeightMm = 0

    while (index < clausesHtml.length) {
      const clause = clausesHtml[index]
      const clauseHeight = estimateHtmlHeightMm(clause)

      if (currentHeightMm + clauseHeight > PAGE_N_MAX_MM && currentPageContent !== '') {
        break
      }
      currentPageContent += clause
      currentHeightMm += clauseHeight
      index++
    }
    pages.push(currentPageContent)
  }

  // 3. Encaixe das assinaturas
  const lastPageIndex = pages.length - 1
  const lastPageMaxMm = lastPageIndex === 0 ? PAGE_1_MAX_MM : PAGE_N_MAX_MM

  if (currentHeightMm + sigHeightMm <= lastPageMaxMm) {
    pages[lastPageIndex] += signaturesHtml
  } else {
    pages.push(signaturesHtml)
  }

  return pages
}

export function buildContrato(
  c: Partial<Cliente>,
  adv: AdvogadoConfigDoc,
  cfg: ConfigDocumentos,
  logo: string | null,
  o: OpcaoContrato & { date?: string; city?: string; uf?: string; number?: string; useSignature?: boolean; signatureImg?: string | null }
): string {
  const date = o.date || new Date().toISOString().slice(0, 10)
  const city = o.city || 'Praia Grande'
  const uf = o.uf || 'SP'
  const num = o.number || ''
  const foro = o.foro || cfg.foro

  const fixRaw = o.valorFixo || o.honorariosFixos || '0,00'
  const fixFormatted = fixRaw.startsWith('R$') ? fixRaw : `R$ ${fixRaw}`
  const ext = o.valorExtenso || o.fixoExtenso || 'valor por extenso não informado'
  const entRaw = o.entrada || '0,00'
  const entFormatted = entRaw.startsWith('R$') ? entRaw : `R$ ${entRaw}`
  const parcelas = o.parcelas || '1'
  const valParcRaw = o.valorParcela || '0,00'
  const valParcFormatted = valParcRaw.startsWith('R$') ? valParcRaw : `R$ ${valParcRaw}`
  const dia = o.diaVencimento || '10'
  const primeiro = o.primeiroVencimento ? formatarDataBr(o.primeiroVencimento) : 'no mês subsequente'

  const fix = Number(o.honorariosFixos) || 0
  const entrada = Number(o.entrada) || 0
  const parcelasNum = Number(o.parcelas) || 1
  const valorParcelaCalc = parcelasNum > 0 ? (fix - entrada) / parcelasNum : 0

  const percentualExito = o.percentualExito || o.honorariosExito || '30'
  const percentualExitoFormatted = percentualExito.includes('%') ? percentualExito : `${percentualExito}%`
  const multa = o.multa || '2'
  const multaFormatted = multa.includes('%') ? multa : `${multa}%`

  const objTxt = o.objeto || o.objetoDescricao || 'análise, preparação, ajuizamento e acompanhamento da ação judicial, em primeiro grau, até a sentença'
  const atuacaoTxt = o.areaAtuacao ? ` na área de ${o.areaAtuacao}` : ''

  const textoExecutivo = o.incluirTestemunhas
    ? 'Este contrato constitui título executivo extrajudicial nos termos do art. 24 da Lei nº 8.906/1994 e, com duas testemunhas, também do art. 784, III, do CPC. Assinaturas físicas ou eletrônicas que comprovem autoria e integridade produzem os mesmos efeitos.'
    : 'Este contrato constitui título executivo extrajudicial nos termos do art. 24 da Lei nº 8.906/1994. Assinaturas físicas ou eletrônicas que comprovem autoria e integridade produzem os mesmos efeitos.'

  const blocoTestemunhas = o.incluirTestemunhas
    ? `<div class="party-signatures" style="margin-top:20mm;">
    <div class="sigbox">
      <div class="sig-space"></div>
      <div class="line"></div>
      <strong>TESTEMUNHA 1</strong><br>
      ${o.testemunha1Nome ? `Nome: ${esc(o.testemunha1Nome)}<br>` : 'Nome:<br>'}
      ${o.testemunha1Cpf ? `CPF: ${esc(o.testemunha1Cpf)}` : 'CPF:'}
    </div>
    <div class="sigbox">
      <div class="sig-space"></div>
      <div class="line"></div>
      <strong>TESTEMUNHA 2</strong><br>
      ${o.testemunha2Nome ? `Nome: ${esc(o.testemunha2Nome)}<br>` : 'Nome:<br>'}
      ${o.testemunha2Cpf ? `CPF: ${esc(o.testemunha2Cpf)}` : 'CPF:'}
    </div>
  </div>`
    : ''

  const assinaturasHtml = `<p>${esc(city)}/${esc(uf)}, ${dateLong(date)}.</p>
  <div class="party-signatures" style="margin-top:16mm;">
    <div class="sigbox">
      <div class="sig-space"></div>
      <div class="line"></div>
      <strong>CONTRATANTE:</strong><br>${esc(c.nome_razao_social || '')}<br>CPF/CNPJ nº ${esc(c.cpf_cnpj || '')}
    </div>
    <div class="sigbox">
      <div class="sig-space">
        ${(o.useSignature && o.signatureImg) ? `<img class="signature-img" src="${o.signatureImg}" alt="Assinatura">` : ''}
      </div>
      <div class="line"></div>
      <strong>${esc(adv.nome)}</strong><br>Advogado<br>${esc(adv.oab)}
    </div>
  </div>
  ${blocoTestemunhas}`

  const preambuloHtml = `<p>Pelo presente instrumento, <strong>${esc(cfg.empresa)}</strong>, registrada na OAB/SP nº ${esc(cfg.socOab)}, CNPJ nº ${esc(cfg.cnpj)}, com sede em ${esc(adv.endereco || cfg.foro)}, neste ato representada por Dr. <strong>${esc(adv.nome)}</strong>, ${esc(adv.oab)}, doravante <strong>CONTRATADA</strong>, e <strong>${esc(clienteQualificacao(c))}</strong>, doravante <strong>CONTRATANTE</strong>, ajustam o seguinte:</p>`

  const isCustomClausulas = Boolean(
    o.clausulas &&
    o.clausulas.length > 0 &&
    (o.clausulas.length !== 10 || o.clausulas.some(c => c.id.startsWith('c-') || c.id === 'c1' || c.id === 'c11'))
  )

  if (!isCustomClausulas) {
    const pg1 = `${preambuloHtml}
  <div class="clause"><div class="clause-title">CLÁUSULA 1ª – OBJETO, ESCOPO E LIMITES</div>
  <p><strong>1.1.</strong> A CONTRATADA prestará serviços de ${esc(objTxt)}${esc(atuacaoTxt)}, análise, preparação, ajuizamento e acompanhamento da ação judicial, em primeiro grau, até a sentença, praticando os atos técnicos necessários conforme a procuração e a estratégia profissional.</p>
  <p><strong>1.2.</strong> Incluem-se: ${esc(o.incluidos || 'reuniões indispensáveis; análise e organização documental; petição inicial; manifestações ordinárias; réplica; audiência; acompanhamento de perícia judicial; memoriais e acompanhamento até a sentença; recursos e contrarrazões;.')}.</p>
  <p><strong>1.3.</strong> Não se incluem, salvo ajuste escrito e honorários adicionais: ${esc(o.excluidos || 'liquidação, cumprimento ou execução de sentença; ações autônomas ou conexas; reconvenção; incidentes complexos; atuação criminal, administrativa ou extrajudicial distinta; tribunais, STJ ou STF; diligências fora da Comarca; peritos, assistentes, correspondentes e outros profissionais.')}.</p>
  <p><strong>1.4.</strong> A advocacia constitui obrigação de meio, sem promessa de resultado. A CONTRATADA poderá atuar por seu titular, integrantes, associados, correspondentes ou substabelecidos, preservados o sigilo, a supervisão e a responsabilidade profissional.</p></div>
  <div class="clause"><div class="clause-title">CLÁUSULA 2ª – DEVERES DAS PARTES</div>
  <p><strong>2.1.</strong> A CONTRATADA atuará com independência técnica, zelo e observância da legislação e da ética profissional; informará fatos processuais relevantes; manterá sigilo; e prestará contas de valores que receber, descontando os honorários e despesas autorizados.</p>
  <p><strong>2.2.</strong> A CONTRATANTE obriga-se a: a) fornecer fatos e documentos completos, verdadeiros e tempestivos; b) cumprir solicitações e prazos; c) comparecer aos atos para os quais for convocada; d) manter contatos e endereço atualizados; e) não omitir fatos, apresentar documento falso, orientar conduta ilegal ou exigir atuação contrária à técnica ou à ética; f) informar em 24 horas qualquer proposta, acordo, pagamento, depósito, recebimento ou contato da parte adversa; e g) pagar pontualmente honorários e despesas.</p></div>`

    const pg2 = `<div class="clause"><div class="clause-title">CLÁUSULA 2ª – DEVERES DAS PARTES (continuação)</div>
  <p><strong>2.3.</strong> A demora, omissão, recusa, ausência ou informação inexata da CONTRATANTE que comprometa prazo, prova ou estratégia excluirá a responsabilidade da CONTRATADA pelos prejuízos diretamente decorrentes dessa conduta.</p></div>
  <div class="clause"><div class="clause-title">CLÁUSULA 3ª – DESPESAS, CUSTAS E TERCEIROS</div>
  <p><strong>3.1.</strong> Custas, taxas, emolumentos, certidões, cópias, autenticações, deslocamentos, viagens, diligências, depósitos recursais, perícias, assistentes técnicos, cálculos, laudos, correspondentes e demais gastos necessários são de responsabilidade exclusiva da CONTRATANTE e não se confundem com os honorários.</p>
  <p><strong>3.2.</strong> A CONTRATADA poderá exigir adiantamento. A falta de pagamento autoriza a não prática do ato dependente da despesa, após comunicação, ressalvadas as medidas urgentes sob responsabilidade profissional. A gratuidade judicial não abrange honorários contratuais, êxito ou despesas extraprocessuais.</p></div>
  <div class="clause"><div class="clause-title">CLÁUSULA 4ª – HONORÁRIOS FIXOS</div>
  <p><strong>4.1.</strong> A CONTRATANTE pagará <strong>${esc(fixFormatted)} (${esc(ext)})</strong>: ${esc(entFormatted)} na assinatura e ${esc(parcelas)} parcela(s) mensal(is) de ${esc(valParcFormatted)}, vencível(is) todo dia ${esc(dia)}, iniciando-se em ${esc(primeiro)}. A quitação depende da efetiva compensação.</p>
  <p><strong>4.2.</strong> Para apuração em encerramento antecipado, os honorários fixos correspondem às etapas: 20% pela análise, reunião, documentos e estratégia; 30% pela elaboração e protocolo da inicial e medidas iniciais; 30% pelo contraditório, réplica, prova e instrução; e 20% pela fase final, memoriais e sentença. Etapa iniciada será remunerada proporcionalmente ao trabalho realizado.</p>
  <p><strong>4.3.</strong> O parcelamento é mera facilidade financeira, não condiciona o início do serviço e não altera a exigibilidade da remuneração pelas etapas efetivamente iniciadas ou concluídas. Valores pagos remuneram trabalho realizado e somente serão restituídos se excederem o montante proporcionalmente devido.</p></div>`

    const pg3 = `<div class="clause"><div class="clause-title">CLÁUSULA 5ª – HONORÁRIOS DE ÊXITO E SUCUMBÊNCIA</div>
  <p><strong>5.1.</strong> Além dos honorários fixos, serão devidos honorários de êxito de <strong>${esc(percentualExitoFormatted)}</strong> sobre o benefício econômico bruto obtido, judicial ou extrajudicialmente, por sentença, acordo, pagamento direto, restituição, indenização, compensação, abatimento, remissão, entrega de bem ou vantagem mensurável relacionada aos fatos contratados.</p>
  <p><strong>5.2.</strong> A base compreende principal, juros, correção e acréscimos, antes de tributos, custas ou despesas. Em pagamento parcelado, o êxito vencerá sobre cada parcela recebida. Em bem ou vantagem não pecuniária, valerá o valor do acordo, decisão, avaliação ou mercado, vencendo em até 5 dias úteis da aquisição.</p>
  <p><strong>5.3.</strong> A CONTRATANTE autoriza destaque, reserva, retenção, levantamento e desconto dos honorários e despesas de valores recebidos nos autos ou pela CONTRATADA, com prestação de contas e repasse do saldo. Pagamento ou acordo direto deverá ser informado em 24 horas, e o êxito pago em 2 dias úteis.</p>
  <p><strong>5.4.</strong> Honorários sucumbenciais pertencem exclusivamente aos advogados e não compensam nem reduzem os honorários fixos ou de êxito. Acordo, desistência por satisfação, reconhecimento ou solução que gere benefício econômico mantém a incidência do êxito.</p></div>
  <div class="clause"><div class="clause-title">CLÁUSULA 6ª – MORA, INADIMPLEMENTO E COBRANÇA</div>
  <p><strong>6.1.</strong> O não pagamento no vencimento constitui mora automática e sujeita o valor vencido a multa de <strong>${esc(multaFormatted)}</strong>, juros de 1% ao mês pro rata die e atualização pelo IPCA, ou índice que o substitua, até o pagamento.</p>
  <p><strong>6.2.</strong> Atraso superior a 15 dias autoriza notificação por WhatsApp, e-mail, carta ou meio idôneo, com prazo final de 5 dias. Persistindo a mora, a CONTRATADA poderá resolver o contrato por justa causa e renunciar ao mandato, cumprindo o prazo legal de transição.</p>
  <p><strong>6.3.</strong> Na resolução por inadimplemento tornam-se imediatamente exigíveis: parcelas vencidas; despesas antecipadas; remuneração das etapas iniciadas ou concluídas; êxito já implementado; e demais créditos comprovados. Os valores poderão ser cobrados, protestados e executados, com despesas de cobrança e honorários sucumbenciais fixados judicialmente.</p></div>
  <div class="clause"><div class="clause-title">CLÁUSULA 7ª – RESOLUÇÃO ANTECIPADA POR CAUSA DA CONTRATANTE</div>
  <p><strong>7.1.</strong> Constituem justa causa, além do inadimplemento: documento ou informação falsa; omissão essencial; recusa reiterada em entregar documentos ou cumprir orientação necessária; falta de custas; exigência de ato ilegal, antiético ou tecnicamente inadequado; ofensa, ameaça, assédio ou grave quebra de confiança; acordo, contato ou recebimento ocultado; ausência injustificada em ato; contratação paralela incompatível; ou qualquer conduta que inviabilize ou comprometa a defesa.</p>
  <p><strong>7.2.</strong> Verificada a justa causa, a CONTRATADA comunicará o encerramento por escrito e adotará a renúncia ou substituição prevista em lei, mantendo apenas as providências indispensáveis durante o prazo legal. Permanecerão devidos os honorários vencidos, os proporcionais ao trabalho executado, as despesas, o êxito implementado e a sucumbência.</p></div>`

    const pg4 = `<div class="clause"><div class="clause-title">CLÁUSULA 8ª – REVOGAÇÃO, RENÚNCIA E ENCERRAMENTO</div>
  <p><strong>8.1.</strong> A CONTRATANTE poderá revogar o mandato e a CONTRATADA poderá renunciar, mediante comunicação formal. Revogação, substituição, desistência, perda do objeto ou encerramento por decisão da CONTRATANTE não afastam os honorários vencidos, despesas e remuneração proporcional aos atos úteis e etapas realizadas, inclusive êxito posterior decorrente da atuação, quando juridicamente cabível.</p>
  <p><strong>8.2.</strong> Havendo culpa exclusiva comprovada da CONTRATADA que impossibilite o serviço, serão devidos apenas os honorários proporcionais aos atos úteis realizados, sem prejuízo das responsabilidades legais cabíveis.</p></div>
  <div class="clause"><div class="clause-title">CLÁUSULA 9ª – COMUNICAÇÕES, DOCUMENTOS, DADOS E SIGILO</div>
  <p><strong>9.1.</strong> São válidas as comunicações enviadas aos últimos telefones, WhatsApp e e-mails informados, inclusive avisos de atos, solicitações, cobrança, resolução e ciência de renúncia, quando comprovável o envio ou recebimento. Mensagens fora do horário comercial serão respondidas em prazo razoável, salvo urgência contratada.</p>
  <p><strong>9.2.</strong> A CONTRATANTE manterá cópia dos documentos originais. Encerrado o contrato, documentos físicos deverão ser retirados em 90 dias; depois poderão ser digitalizados, arquivados ou descartados de modo seguro, respeitados os deveres legais de guarda.</p>
  <p><strong>9.3.</strong> A CONTRATANTE autoriza o tratamento de dados e documentos para execução do contrato, exercício de direitos, prevenção à fraude, faturamento, cobrança, arquivo e comunicação com autoridades, tribunais, cartórios, peritos e auxiliares. A CONTRATADA manterá sigilo e medidas razoáveis de segurança.</p></div>
  <div class="clause"><div class="clause-title">CLÁUSULA 10ª – TÍTULO EXECUTIVO, ASSINATURA E FORO</div>
  <p><strong>10.1.</strong> ${textoExecutivo}</p>
  <p><strong>10.2.</strong> Tolerância não implica renúncia, novação ou alteração. A invalidade de uma disposição não prejudica as demais. O contrato obriga as partes e sucessores nos limites legais e patrimoniais.</p>
  <p><strong>10.3.</strong> Fica eleito o foro da <strong>${esc(foro)}</strong>, ressalvada competência legal inderrogável.</p>
  ${o.clausulaExtra ? `<p><strong>10.4. Cláusula adicional:</strong> ${esc(o.clausulaExtra)}</p>` : ''}
  <p style="margin-top:3mm;"><strong>Por estarem de acordo, as partes declaram ter lido, compreendido e aceitado integralmente este contrato.</strong></p></div>`

    const pg5 = `${assinaturasHtml}`

    return `<div class="document">${buildPage(pg1, 'CONTRATO DE PRESTAÇÃO DE SERVIÇOS E HONORÁRIOS ADVOCATÍCIOS', num, adv, logo)}${buildPage(pg2, '', num, adv, logo)}${buildPage(pg3, '', num, adv, logo)}${buildPage(pg4, '', num, adv, logo)}${buildPage(pg5, '', num, adv, logo)}</div>`
  }

  const clausulasParaUsar = o.clausulas || CLAUSULAS_PADRAO_CONTRATO

  const tags: Record<string, string> = {
    objeto: `${objTxt}${atuacaoTxt}`,
    incluidos: o.incluidos || 'todos os atos processuais',
    excluidos: o.excluidos || 'recursos aos tribunais superiores',
    honorarios_fixos: fixFormatted,
    honorarios_extenso: ext,
    entrada: entFormatted,
    parcelas: String(parcelas),
    valor_parcela: valParcFormatted,
    dia_vencimento: String(dia),
    primeiro_vencimento: primeiro,
    percentual_exito: percentualExitoFormatted,
    multa: multaFormatted,
    foro: foro,
    texto_executivo: textoExecutivo,
    nome_cliente: c.nome_razao_social || '',
    cpf_cliente: c.cpf_cnpj || '',
    nome_advogado: adv.nome || '',
    oab_advogado: adv.oab || '',
    empresa_advogado: cfg.empresa || '',
    cidade: city,
    uf: uf,
    data: dateLong(date)
  }

  const clausesHtml = clausulasParaUsar.map(clause => renderClauseHtml(clause, tags))

  if (o.clausulaExtra) {
    clausesHtml.push(
      `<div class="clause"><div class="clause-title">CLÁUSULA ADICIONAL</div><p>${esc(o.clausulaExtra)}</p></div>`
    )
  }

  const pages = distributeContractPages(preambuloHtml, clausesHtml, assinaturasHtml)
  const renderedPages = pages.map((pContent, idx) => {
    const pTitle = idx === 0 ? 'CONTRATO DE PRESTAÇÃO DE SERVIÇOS E HONORÁRIOS ADVOCATÍCIOS' : ''
    return buildPage(pContent, pTitle, num, adv, logo)
  })

  return `<div class="document">${renderedPages.join('')}</div>`
}
