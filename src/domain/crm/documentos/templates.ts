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
import {
  esc,
  dateLong,
  dateShort,
  formatarDataBr,
  money,
  clienteEndereco,
  clienteQualificacao,
  extrairClientes,
  clientesNomesFormatados,
  clientesCpfsFormatados,
  clientesQualificacaoMulti
} from './formatacao'
import { CLAUSULAS_PADRAO_CONTRATO } from './config-local'

export const DADOS_ESCRITORIO_DOCUMENTO: AdvogadoConfigDoc = {
  nome: 'EDVALDO RODRIGUES FERREIRA',
  oab: 'OAB/SP 465.818',
  endereco: 'Avenida Presidente Costa e Silva, nº 733, sala 21, 2º andar – Office Brasil, Boqueirão, Praia Grande/SP – CEP 11700-007',
  email: 'edvaldorodrigues.advocacia@gmail.com',
  telefone: '(13) 99682-4364'
}

export interface RodapeDocOptions {
  linha1?: string
  linha2?: string
  linha3?: string
  numerarPaginas?: boolean
}

function buildHeader(logo?: string | null, customHeader?: string): string {
  if (customHeader && customHeader.trim()) {
    return `<div class="letterhead"><div style="padding-bottom:2.5mm;border-bottom:1.5px solid #b58a37;font-size:12pt;font-weight:bold;color:#0f172a;letter-spacing:1px;text-align:center;">${esc(customHeader)}</div></div>`
  }
  if (!logo) {
    return `<div class="letterhead"><div style="padding-bottom:3mm;border-bottom:1px solid #e2e8f0;font-size:13pt;font-weight:bold;color:#1e293b;letter-spacing:1px;text-align:center;">ADVOCACIA & CONSULTORIA JURÍDICA</div></div>`
  }
  return `<div class="letterhead"><img src="${logo}" alt="Logotipo"></div>`
}

function buildFooter(
  _adv?: AdvogadoConfigDoc,
  opts?: RodapeDocOptions,
  pageIndex?: number,
  totalPages?: number
): string {
  // O rodapé é geral do escritório e deve sempre apresentar exclusivamente os dados institucionais do escritório
  const d = DADOS_ESCRITORIO_DOCUMENTO
  const l1 = opts?.linha1 !== undefined && opts.linha1 !== '' ? opts.linha1 : `${d.nome} | ${d.oab}`
  const l2 = opts?.linha2 !== undefined && opts.linha2 !== '' ? opts.linha2 : (d.endereco || '')
  const l3 = opts?.linha3 !== undefined && opts.linha3 !== '' ? opts.linha3 : `${d.email} · ${d.telefone}`

  const paginacaoHtml = (opts?.numerarPaginas && pageIndex && totalPages)
    ? `<div class="doc-page-number">Página ${pageIndex} de ${totalPages}</div>`
    : ''

  return `<div class="doc-footer">${paginacaoHtml}${l1 ? `<strong>${esc(l1)}</strong><br>` : ''}${l2 ? `${esc(l2)}<br>` : ''}${l3 ? `${esc(l3)}` : ''}</div>`
}

function buildPage(
  content: string,
  title: string = '',
  meta: string = '',
  adv: AdvogadoConfigDoc,
  logo?: string | null,
  rodapeOpts?: RodapeDocOptions,
  cabecalhoPersonalizado?: string,
  pageIndex?: number,
  totalPages?: number
): string {
  return `<div class="doc-page">${buildHeader(logo, cabecalhoPersonalizado)}${meta ? `<div class="doc-meta">${esc(meta)}</div>` : ''}${title ? `<div class="doc-title">${esc(title)}</div>` : ''}<div class="doc-body">${content}</div>${buildFooter(adv, rodapeOpts, pageIndex, totalPages)}</div>`
}

export function formatParagrafosPersonalizados(text: string): string {
  const lines = text
    .split(/\n+/)
    .map(l => l.trim())
    .filter(Boolean)

  return lines
    .map(line => {
      if (/^<p[\s>]/.test(line)) {
        return line
      }
      const formatted = esc(line)
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/^([A-ZÇÃÕÉÊÍÓÚÂÈÌÒÙ\s]{3,25}:)\s*/, '<strong>$1</strong> ')
      return `<p>${formatted}</p>`
    })
    .join('')
}

export function obterTextoPadraoProcuracao(
  c: Partial<Cliente> | Partial<Cliente>[] | null,
  adv: AdvogadoConfigDoc,
  cfg: ConfigDocumentos,
  o: Partial<OpcaoProcuracao>
): string {
  const clientes = extrairClientes(c, o.clientesAdicionais)
  const isMulti = clientes.length > 1

  let special = 'receber citação, confessar, reconhecer a procedência do pedido'
  if (o.transigir !== false) special += ', transigir, conciliar, desistir e renunciar ao direito sobre o qual se funda a ação'
  if (o.receber !== false) special += ', receber, dar quitação, requerer, receber e levantar valores e depósitos judiciais ou extrajudiciais, inclusive por alvará, MLE, RPV, precatório, depósito recursal ou transferência bancária'
  special += ', firmar compromisso'
  if (o.hipossuf !== false) special += ', assinar declaração de hipossuficiência econômica e requerer gratuidade da justiça'
  special += ', requerer medidas urgentes, penhoras, bloqueios, pesquisas patrimoniais e expedição de ofícios'
  if (o.inss) special += ', representar perante o Instituto Nacional do Seguro Social – INSS, requerer benefícios, revisões, recursos e ter acesso a processos administrativos'
  if (o.receita) special += ', representar perante a Receita Federal do Brasil, requerer cópias, certidões, apresentar declarações, defesas e recursos'
  if (o.poderesExtras) special += ', ' + o.poderesExtras.replace(/\.$/, '')

  const enderecoAdv = adv.endereco || 'com escritório em ' + cfg.foro
  const temConjunto = Boolean(o.atuacaoConjunta && o.advogadoConjuntoNome)
  const outorgadosConjunto = temConjunto
    ? `, e ${o.advogadoConjuntoNome}, ${o.advogadoConjuntoTratamento || 'advogado(a)'}, inscrito(a) na ${o.advogadoConjuntoOab || ''}, com escritório profissional em ${o.advogadoConjuntoEndereco || enderecoAdv}`
    : ''

  const rotuloOutorgado = temConjunto ? 'OUTORGADOS:' : 'OUTORGADO:'
  const textoProcuradores = temConjunto
    ? (isMulti ? 'seus bastantes procuradores os advogados acima qualificados, conferindo-lhes poderes para o foro em geral' : 'seus bastantes procuradores os advogados acima qualificados, conferindo-lhes poderes para o foro em geral')
    : (isMulti ? 'seu bastante procurador o advogado acima qualificado, conferindo-lhe poderes para o foro em geral' : 'seu bastante procurador o advogado acima qualificado, conferindo-lhe poderes para o foro em geral')
  const textoAutorizacao = temConjunto ? 'Ficam os OUTORGADOS autorizados' : 'Fica o OUTORGADO autorizado'

  const finalidade = o.finalidadeProc ? `\n\nFINALIDADE ESPECÍFICA: ${o.finalidadeProc}.` : ''

  const rotuloOutorgante = isMulti ? 'OUTORGANTES:' : 'OUTORGANTE:'
  const qualif = isMulti
    ? clientes.map((cli, i) => `${i + 1}) ${clienteQualificacao(cli)}`).join(';\n\n')
    : (clientes[0]?.nome_razao_social ? clienteQualificacao(clientes[0]) : '[DADOS DO OUTORGANTE QUALIFICADO]')

  const pronomeOutorgantes = isMulti ? 'os OUTORGANTES nomeiam e constituem' : 'o OUTORGANTE nomeia e constitui'
  const representacaoPronome = isMulti ? 'para representá-los' : 'para representá-lo'
  const conferePronome = isMulti ? 'Conferem, ainda' : 'Confere, ainda'

  return `${rotuloOutorgante} ${qualif}.

${rotuloOutorgado} ${adv.nome}, advogado inscrito na ${adv.oab}, com escritório em ${enderecoAdv}, e-mail ${adv.email}, integrante da ${cfg.empresa}, registro OAB nº ${cfg.socOab}, CNPJ nº ${cfg.cnpj}${outorgadosConjunto}.

Pelo presente instrumento particular, ${pronomeOutorgantes} ${textoProcuradores}, com a cláusula AD JUDICIA ET EXTRA, ${representacaoPronome} judicial, administrativa e extrajudicialmente, ativa ou passivamente, perante qualquer Juízo, Tribunal, órgão público ou entidade privada, em qualquer instância, podendo propor ações, apresentar defesas, recursos, requerimentos, notificações e demais medidas cabíveis, produzir provas, requerer documentos e certidões, acompanhar processos, procedimentos, inquéritos, perícias e audiências, praticando todos os atos necessários à defesa de seus interesses.

${conferePronome}, nos termos do artigo 105 do Código de Processo Civil, poderes especiais para ${special}.

${textoAutorizacao} a requerer reserva, destaque e levantamento de honorários contratuais e sucumbenciais; nomear preposto, quando legalmente cabível; praticar atos físicos ou eletrônicos; e ${o.substabelecer === false ? 'não substabelecer sem autorização expressa' : 'substabelecer, no todo ou em parte, com ou sem reserva de poderes'}.${finalidade}`
}

export function obterTextoPadraoHipossuficiencia(
  c: Partial<Cliente> | Partial<Cliente>[] | null,
  o: Partial<OpcaoHipossuficiencia>
): string {
  const clientes = extrairClientes(c, o.clientesAdicionais)
  const isMulti = clientes.length > 1

  let extra = ''
  if (o.situacao) extra += ` ${isMulti ? 'Declaram' : 'Declara'}, ainda, que atualmente se ${isMulti ? 'encontram' : 'encontra'} na condição de ${o.situacao}.`
  if (o.rendaMensal) extra += ` Sua renda mensal aproximada é de ${o.rendaMensal}.`
  if (o.dependentes) extra += ` Possui ${o.dependentes} dependente(s).`
  if (o.hipoExtra) extra += ` ${o.hipoExtra}`

  if (!isMulti) {
    const cli = clientes[0]
    const qualif = cli ? [cli.nacionalidade, cli.estado_civil, cli.profissao].filter(Boolean).join(', ') : 'brasileiro(a), profissão...'
    const rgPart = cli?.rg_ie ? `portador(a) do RG nº ${cli.rg_ie}, ` : ''
    const nome = cli?.nome_razao_social ? String(cli.nome_razao_social).toUpperCase() : '[NOME DO DECLARANTE]'
    const docNum = cli?.cpf_cnpj || '[CPF/CNPJ]'
    const end = cli ? clienteEndereco(cli) : '[ENDEREÇO]'
    const emailPart = cli?.email ? `e-mail: ${cli.email} e ` : ''
    const telPart = cli?.telefone_whatsapp ? `telefone: ${cli.telefone_whatsapp}` : ''
    const contatos = [emailPart, telPart].filter(Boolean).join('')

    return `${nome}, ${qualif}, ${rgPart}inscrito(a) no CPF/CNPJ nº ${docNum}, residente e domiciliado(a) em ${end}${contatos ? `, ${contatos}` : ''}, DECLARA, para os devidos fins de direito e sob as penas da lei, que é pobre na expressão jurídica da palavra, não podendo suportar o pagamento das custas e despesas processuais sem prejuízo de seu sustento e de sua família.${extra}

Por ser a expressão da verdade, firma a presente.`
  }

  const qualificacoesMulti = clientes.map(cli => {
    const qualif = [cli.nacionalidade, cli.estado_civil, cli.profissao].filter(Boolean).join(', ')
    const rgPart = cli.rg_ie ? `portador(a) do RG nº ${cli.rg_ie}, ` : ''
    const nome = String(cli.nome_razao_social || '').toUpperCase()
    const docNum = cli.cpf_cnpj || '[CPF/CNPJ]'
    const end = clienteEndereco(cli)
    return `${nome}, ${qualif}, ${rgPart}inscrito(a) no CPF/CNPJ nº ${docNum}, residente e domiciliado(a) em ${end}`
  }).join(';\n\ne ')

  return `${qualificacoesMulti}, DECLARAM CONJUNTAMENTE, para os devidos fins de direito e sob as penas da lei, que são pessoas pobres na expressão jurídica da palavra, não podendo suportar o pagamento das custas e despesas processuais sem prejuízo de seus próprios sustentos e de suas famílias.${extra}

Por ser a expressão da verdade, firmam a presente.`
}

export function obterTextoPadraoIrpf(
  c: Partial<Cliente> | Partial<Cliente>[] | null,
  o: Partial<OpcaoIrpf>
): string {
  const clientes = extrairClientes(c, o.clientesAdicionais)
  const isMulti = clientes.length > 1
  const finalidadePart = o.finalidade ? `\n\nFinalidade: ${o.finalidade}.` : ''

  if (!isMulti) {
    const cli = clientes[0]
    const rgPart = cli?.rg_ie ? `RG nº ${cli.rg_ie}, ` : ''
    const nome = cli?.nome_razao_social ? String(cli.nome_razao_social).toUpperCase() : '[NOME DO DECLARANTE]'
    const docNum = cli?.cpf_cnpj || '[CPF/CNPJ]'
    const end = cli ? clienteEndereco(cli) : '[ENDEREÇO]'
    const telPart = cli?.telefone_whatsapp ? `, telefone ${cli.telefone_whatsapp}` : ''

    return `Eu, ${nome}, ${rgPart}CPF/CNPJ nº ${docNum}, residente em ${end}${telPart}, DECLARO ser isento(a) da apresentação da Declaração do Imposto de Renda Pessoa Física – DIRPF no(s) exercício(s) ${o.exercicios || '________________'}, por não incorrer em nenhuma das hipóteses de obrigatoriedade estabelecidas pela Receita Federal do Brasil.

Esta declaração é firmada sob as penas da lei, nos termos da Lei nº 7.115/1983, declarando serem verdadeiras todas as informações prestadas.${finalidadePart}`
  }

  const nomesEDocs = clientes.map(cli => `${String(cli.nome_razao_social || '').toUpperCase()}, CPF/CNPJ nº ${cli.cpf_cnpj || ''}`).join(' e ')
  const end = clienteEndereco(clientes[0])

  return `Nós, ${nomesEDocs}, residentes em ${end}, DECLARAMOS ser isentos da apresentação da Declaração do Imposto de Renda Pessoa Física – DIRPF no(s) exercício(s) ${o.exercicios || '________________'}, por não incorrer em nenhuma das hipóteses de obrigatoriedade estabelecidas pela Receita Federal do Brasil.

Esta declaração é firmada sob as penas da lei, nos termos da Lei nº 7.115/1983, declarando serem verdadeiras todas as informações prestadas.${finalidadePart}`
}

export function obterTextoPadraoRecibo(
  c: Partial<Cliente> | Partial<Cliente>[] | null,
  adv: AdvogadoConfigDoc,
  cfg: ConfigDocumentos,
  o: Partial<OpcaoRecibo>
): string {
  const clientes = extrairClientes(c, o.clientesAdicionais)
  const isMulti = clientes.length > 1
  const parcela = o.parcelaRecibo ? ` (${o.parcelaRecibo})` : ''
  const obs = o.obsRecibo ? ` ${o.obsRecibo}` : ''
  const val = o.valorRecibo ? money(o.valorRecibo) : 'R$ 0,00'

  if (!isMulti) {
    const cli = clientes[0]
    const nome = cli?.nome_razao_social ? String(cli.nome_razao_social).toUpperCase() : '[NOME DO CLIENTE]'
    const docNum = cli?.cpf_cnpj || '[CPF/CNPJ]'
    return `${nome}, inscrito(a) no CPF/CNPJ nº ${docNum}, declara, para os devidos fins, que efetuou o pagamento no valor de ${val} (${o.valorExtenso || 'valor por extenso não informado'}) para ${adv.nome}, advogado, inscrito no CPF nº ${cfg.lawyerCpf} e ${adv.oab}, integrante da ${cfg.empresa}.

O valor refere-se a ${o.referenciaRecibo || 'prestação de serviços advocatícios'}${parcela}. O pagamento foi realizado por ${o.formaPagamento || 'PIX'} nesta data.${obs}

Por ser a expressão da verdade, firma-se o presente recibo.`
  }

  const clientesStr = clientes.map(cli => `${String(cli.nome_razao_social || '').toUpperCase()}, inscrito(a) no CPF/CNPJ nº ${cli.cpf_cnpj || ''}`).join(' e ')
  return `${clientesStr}, declaram, para os devidos fins, que efetuaram conjuntamente o pagamento no valor de ${val} (${o.valorExtenso || 'valor por extenso não informado'}) para ${adv.nome}, advogado, inscrito no CPF nº ${cfg.lawyerCpf} e ${adv.oab}, integrante da ${cfg.empresa}.

O valor refere-se a ${o.referenciaRecibo || 'prestação de serviços advocatícios'}${parcela}. O pagamento foi realizado por ${o.formaPagamento || 'PIX'} nesta data.${obs}

Por ser a expressão da verdade, firma-se o presente recibo.`
}

export function obterTextoPadraoResidencia(
  c: Partial<Cliente> | Partial<Cliente>[] | null,
  o: Partial<OpcaoResidencia>
): string {
  const clientes = extrairClientes(c, o.clientesAdicionais)
  const isMulti = clientes.length > 1

  if (!isMulti) {
    const cli = clientes[0]
    const third = o.tipoResidencia === 'terceiro' && o.titularResidencia
    const declarant = third ? o.titularResidencia : (cli?.nome_razao_social || '[NOME DO DECLARANTE]')
    const cpf = third ? (o.cpfTitular || '[CPF DO TITULAR]') : (cli?.cpf_cnpj || '[CPF DO DECLARANTE]')
    const end = cli ? clienteEndereco(cli) : '[ENDEREÇO DO IMÓVEL]'
    const resident = third
      ? `DECLARO que ${cli?.nome_razao_social || '[NOME DO CLIENTE]'}, inscrito(a) no CPF/CNPJ nº ${cli?.cpf_cnpj || '[CPF/CNPJ]'}, reside e é domiciliado(a) no endereço ${end}${o.vinculoTitular ? `, sendo meu/minha ${o.vinculoTitular}` : ''}`
      : `DECLARO que sou residente e domiciliado(a) no endereço ${end}`

    return `Eu, ${String(declarant || '').toUpperCase()}, inscrito(a) no CPF/CNPJ nº ${cpf || ''}, ${resident}, para fins de comprovação de residência junto a ${o.destinoResidencia || 'empresa ou órgão solicitante'}.

Declaro, sob as penas da lei e nos termos dos artigos 1º, 2º e 3º da Lei nº 7.115/1983, que as informações são verdadeiras, estando ciente das responsabilidades civis, administrativas e criminais decorrentes de declaração falsa, inclusive do disposto no artigo 299 do Código Penal.

Por ser a expressão da verdade, firmo a presente para que produza seus efeitos legais.`
  }

  const nomesEDocs = clientes.map(cli => `${String(cli.nome_razao_social || '').toUpperCase()}, inscrito(a) no CPF/CNPJ nº ${cli.cpf_cnpj || ''}`).join(' e ')
  const end = clienteEndereco(clientes[0])

  return `Nós, ${nomesEDocs}, DECLARAMOS que somos residentes e domiciliados no endereço ${end}, para fins de comprovação de residência junto a ${o.destinoResidencia || 'empresa ou órgão solicitante'}.

Declaramos, sob as penas da lei e nos termos dos artigos 1º, 2º e 3º da Lei nº 7.115/1983, que as informações são verdadeiras, estando cientes das responsabilidades civis, administrativas e criminais decorrentes de declaração falsa, inclusive do disposto no artigo 299 do Código Penal.

Por ser a expressão da verdade, firmamos a presente para que produza seus efeitos legais.`
}

export function buildProcuracao(
  c: Partial<Cliente> | Partial<Cliente>[],
  adv: AdvogadoConfigDoc,
  cfg: ConfigDocumentos,
  logo: string | null,
  o: OpcaoProcuracao & { date?: string; city?: string; uf?: string; number?: string; signatureImg?: string | null; clientesAdicionais?: Partial<Cliente>[] }
): string {
  const clientes = extrairClientes(c, o.clientesAdicionais)
  const isMulti = clientes.length > 1
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

  const temConjunto = Boolean(o.atuacaoConjunta && o.advogadoConjuntoNome)
  const outorgadosConjunto = temConjunto
    ? `, e <strong>${esc(o.advogadoConjuntoNome!)}</strong>, ${esc(o.advogadoConjuntoTratamento || 'advogado(a)')}, inscrito(a) na ${esc(o.advogadoConjuntoOab || '')}, com escritório profissional em ${esc(o.advogadoConjuntoEndereco || enderecoAdv)}`
    : ''

  const rotuloOutorgado = temConjunto ? 'OUTORGADOS:' : 'OUTORGADO:'
  const textoProcuradores = temConjunto
    ? (isMulti ? 'seus bastantes procuradores os advogados acima qualificados, conferindo-lhes poderes para o foro em geral' : 'seus bastantes procuradores os advogados acima qualificados, conferindo-lhes poderes para o foro em geral')
    : (isMulti ? 'seu bastante procurador o advogado acima qualificado, conferindo-lhe poderes para o foro em geral' : 'seu bastante procurador o advogado acima qualificado, conferindo-lhe poderes para o foro em geral')
  const textoAutorizacao = temConjunto ? 'Ficam os OUTORGADOS autorizados' : 'Fica o OUTORGADO autorizado'

  const rotuloOutorgante = isMulti ? 'OUTORGANTES:' : 'OUTORGANTE:'
  const qualifOutorgantesHtml = isMulti
    ? clientes.map((cli, i) => `<strong>${i + 1})</strong> ${esc(clienteQualificacao(cli))}`).join('; e ')
    : esc(clienteQualificacao(clientes[0]))

  const pronomeOutorgantes = isMulti ? 'os OUTORGANTES nomeiam e constituem' : 'o OUTORGANTE nomeia e constitui'
  const representacaoPronome = isMulti ? 'para representá-los' : 'para representá-lo'
  const conferePronome = isMulti ? 'Conferem, ainda' : 'Confere, ainda'

  const bodyText = (o.textoPersonalizado && o.textoPersonalizado.trim())
    ? formatParagrafosPersonalizados(o.textoPersonalizado)
    : `<p><strong>${rotuloOutorgante}</strong> ${qualifOutorgantesHtml}.</p>
  <p><strong>${rotuloOutorgado}</strong> ${esc(adv.nome)}, advogado inscrito na ${esc(adv.oab)}, com escritório em ${esc(enderecoAdv)}, e-mail ${esc(adv.email)}, integrante da ${esc(cfg.empresa)}, registro OAB nº ${esc(cfg.socOab)}, CNPJ nº ${esc(cfg.cnpj)}${outorgadosConjunto}.</p>
  <p>Pelo presente instrumento particular, ${pronomeOutorgantes} ${textoProcuradores}, com a cláusula <strong>AD JUDICIA ET EXTRA</strong>, ${representacaoPronome} judicial, administrativa e extrajudicialmente, ativa ou passivamente, perante qualquer Juízo, Tribunal, órgão público ou entidade privada, em qualquer instância, podendo propor ações, apresentar defesas, recursos, requerimentos, notificações e demais medidas cabíveis, produzir provas, requerer documentos e certidões, acompanhar processos, procedimentos, inquéritos, perícias e audiências, praticando todos os atos necessários à defesa de seus interesses.</p>
  <p>${conferePronome}, nos termos do artigo 105 do Código de Processo Civil, poderes especiais para <strong>${esc(special)}</strong>.</p>
  <p>${textoAutorizacao} a requerer reserva, destaque e levantamento de honorários contratuais e sucumbenciais; nomear preposto, quando legalmente cabível; praticar atos físicos ou eletrônicos; e ${o.substabelecer === false ? 'não substabelecer sem autorização expressa' : 'substabelecer, no todo ou em parte, com ou sem reserva de poderes'}.</p>${finalidade}`

  const assinaturasClientesHtml = !isMulti
    ? `<div class="signature-block" style="margin-top:12mm;">
        <div class="signature-line"></div>
        <strong>${esc(String(clientes[0].nome_razao_social || '').toUpperCase())}</strong><br>
        CPF/CNPJ nº ${esc(clientes[0].cpf_cnpj || '')}
      </div>`
    : `<div style="display:flex; justify-content:space-between; align-items:flex-start; width:100%; margin-top:12mm; flex-wrap:wrap; gap:8mm;">
        ${clientes.map(cli => `
          <div class="sigbox" style="width:48%;">
            <div class="line"></div>
            <strong>${esc(String(cli.nome_razao_social || '').toUpperCase())}</strong><br>
            CPF/CNPJ nº ${esc(cli.cpf_cnpj || '')}
          </div>
        `).join('')}
      </div>`

  const body = `${bodyText}
  <p style="margin-top:5mm;">${esc(city)}/${esc(uf)}, ${dateLong(date)}.</p>
  ${assinaturasClientesHtml}`

  return `<div class="document">${buildPage(
    body,
    'PROCURAÇÃO AD JUDICIA ET EXTRA',
    num,
    adv,
    logo,
    {
      linha1: o.rodapeLinha1,
      linha2: o.rodapeLinha2,
      linha3: o.rodapeLinha3,
      numerarPaginas: o.numerarPaginas
    },
    o.cabecalhoPersonalizado,
    1,
    1
  )}</div>`
}

export function buildHipossuficiencia(
  c: Partial<Cliente> | Partial<Cliente>[],
  adv: AdvogadoConfigDoc,
  _cfg: ConfigDocumentos,
  logo: string | null,
  o: OpcaoHipossuficiencia & { date?: string; city?: string; uf?: string; number?: string; clientesAdicionais?: Partial<Cliente>[] }
): string {
  const clientes = extrairClientes(c, o.clientesAdicionais)
  const isMulti = clientes.length > 1
  const date = o.date || new Date().toISOString().slice(0, 10)
  const city = o.city || 'Praia Grande'
  const uf = o.uf || 'SP'
  const num = o.number || ''

  let extra = ''
  if (o.situacao) extra += ` ${isMulti ? 'Declaram' : 'Declara'}, ainda, que atualmente se ${isMulti ? 'encontram' : 'encontra'} na condição de ${esc(o.situacao)}.`
  if (o.rendaMensal) extra += ` Sua renda mensal aproximada é de ${esc(o.rendaMensal)}.`
  if (o.dependentes) extra += ` Possui ${esc(o.dependentes)} dependente(s).`
  if (o.hipoExtra) extra += ` ${esc(o.hipoExtra)}`

  let conteudoPadrao = ''
  if (!isMulti) {
    const cli = clientes[0]
    const qualif = [cli.nacionalidade, cli.estado_civil, cli.profissao].filter(Boolean).join(', ')
    const rgPart = cli.rg_ie ? `portador(a) do RG nº ${esc(cli.rg_ie)}, ` : ''
    conteudoPadrao = `<p><strong>${esc(String(cli.nome_razao_social || '').toUpperCase())}</strong>, ${esc(qualif)}, ${rgPart}inscrito(a) no CPF/CNPJ nº ${esc(cli.cpf_cnpj || '')}, residente e domiciliado(a) em ${esc(clienteEndereco(cli))}, ${cli.email ? `e-mail: ${esc(cli.email)} e ` : ''}telefone: ${esc(cli.telefone_whatsapp || '')}, <strong>DECLARA</strong>, para os devidos fins de direito e sob as penas da lei, que é pobre na expressão jurídica da palavra, não podendo suportar o pagamento das custas e despesas processuais sem prejuízo de seu sustento e de sua família.${extra}</p>
    <p>Por ser a expressão da verdade, firma a presente.</p>`
  } else {
    const qualificacoesMulti = clientes.map(cli => {
      const qualif = [cli.nacionalidade, cli.estado_civil, cli.profissao].filter(Boolean).join(', ')
      const rgPart = cli.rg_ie ? `portador(a) do RG nº ${esc(cli.rg_ie)}, ` : ''
      return `<strong>${esc(String(cli.nome_razao_social || '').toUpperCase())}</strong>, ${esc(qualif)}, ${rgPart}inscrito(a) no CPF/CNPJ nº ${esc(cli.cpf_cnpj || '')}, residente e domiciliado(a) em ${esc(clienteEndereco(cli))}`
    }).join('; e ')

    conteudoPadrao = `<p>${qualificacoesMulti}, <strong>DECLARAM CONJUNTAMENTE</strong>, para os devidos fins de direito e sob as penas da lei, que são pessoas pobres na expressão jurídica da palavra, não podendo suportar o pagamento das custas e despesas processuais sem prejuízo de seus próprios sustentos e de suas famílias.${extra}</p>
    <p>Por ser a expressão da verdade, firmam a presente.</p>`
  }

  const bodyText = (o.textoPersonalizado && o.textoPersonalizado.trim())
    ? formatParagrafosPersonalizados(o.textoPersonalizado)
    : conteudoPadrao

  const assinaturasClientesHtml = !isMulti
    ? `<div class="signature-block" style="margin-top:16mm;">
        <div class="signature-line"></div>
        <strong>ASSINATURA DO(A) DECLARANTE</strong><br>
        ${esc(clientes[0].nome_razao_social || '')}
      </div>`
    : `<div style="display:flex; justify-content:space-between; align-items:flex-start; width:100%; margin-top:16mm; flex-wrap:wrap; gap:8mm;">
        ${clientes.map(cli => `
          <div class="sigbox" style="width:48%;">
            <div class="line"></div>
            <strong>ASSINATURA DO(A) DECLARANTE</strong><br>
            ${esc(cli.nome_razao_social || '')}<br>
            CPF/CNPJ nº ${esc(cli.cpf_cnpj || '')}
          </div>
        `).join('')}
      </div>`

  const body = `${bodyText}
  <p style="margin-top:6mm;">${esc(city)}/${esc(uf)}, ${dateLong(date)}.</p>
  ${assinaturasClientesHtml}`

  return `<div class="document">${buildPage(
    body,
    'DECLARAÇÃO DE HIPOSSUFICIÊNCIA',
    num,
    adv,
    logo,
    {
      linha1: o.rodapeLinha1,
      linha2: o.rodapeLinha2,
      linha3: o.rodapeLinha3,
      numerarPaginas: o.numerarPaginas
    },
    o.cabecalhoPersonalizado,
    1,
    1
  )}</div>`
}

export function buildIrpf(
  c: Partial<Cliente> | Partial<Cliente>[],
  adv: AdvogadoConfigDoc,
  _cfg: ConfigDocumentos,
  logo: string | null,
  o: OpcaoIrpf & { date?: string; city?: string; uf?: string; number?: string; clientesAdicionais?: Partial<Cliente>[] }
): string {
  const clientes = extrairClientes(c, o.clientesAdicionais)
  const isMulti = clientes.length > 1
  const date = o.date || new Date().toISOString().slice(0, 10)
  const city = o.city || 'Praia Grande'
  const uf = o.uf || 'SP'
  const num = o.number || ''

  let conteudoPadrao = ''
  if (!isMulti) {
    const cli = clientes[0]
    const rgPart = cli.rg_ie ? `RG nº ${esc(cli.rg_ie)}, ` : ''
    conteudoPadrao = `<p>Eu, <strong>${esc(String(cli.nome_razao_social || '').toUpperCase())}</strong>, ${rgPart}CPF/CNPJ nº ${esc(cli.cpf_cnpj || '')}, residente em ${esc(clienteEndereco(cli))}, telefone ${esc(cli.telefone_whatsapp || '')}, <strong>DECLARO</strong> ser isento(a) da apresentação da Declaração do Imposto de Renda Pessoa Física – DIRPF no(s) exercício(s) <strong>${esc(o.exercicios || '________________')}</strong>, por não incorrer em nenhuma das hipóteses de obrigatoriedade estabelecidas pela Receita Federal do Brasil.</p>
    <p>Esta declaração é firmada sob as penas da lei, nos termos da Lei nº 7.115/1983, declarando serem verdadeiras todas as informações prestadas.</p>
    ${o.finalidade ? `<p>Finalidade: ${esc(o.finalidade)}.</p>` : ''}`
  } else {
    const nomesDocs = clientes.map(cli => `<strong>${esc(String(cli.nome_razao_social || '').toUpperCase())}</strong>, CPF/CNPJ nº ${esc(cli.cpf_cnpj || '')}`).join(' e ')
    conteudoPadrao = `<p>Nós, ${nomesDocs}, residentes em ${esc(clienteEndereco(clientes[0]))}, <strong>DECLARAMOS</strong> ser isentos da apresentação da Declaração do Imposto de Renda Pessoa Física – DIRPF no(s) exercício(s) <strong>${esc(o.exercicios || '________________')}</strong>, por não incorrer em nenhuma das hipóteses de obrigatoriedade estabelecidas pela Receita Federal do Brasil.</p>
    <p>Esta declaração é firmada sob as penas da lei, nos termos da Lei nº 7.115/1983, declarando serem verdadeiras todas as informações prestadas.</p>
    ${o.finalidade ? `<p>Finalidade: ${esc(o.finalidade)}.</p>` : ''}`
  }

  const bodyText = (o.textoPersonalizado && o.textoPersonalizado.trim())
    ? formatParagrafosPersonalizados(o.textoPersonalizado)
    : conteudoPadrao

  const assinaturasClientesHtml = !isMulti
    ? `<div class="signature-block" style="margin-top:16mm;">
        <div class="signature-line"></div>
        <strong>${esc(String(clientes[0].nome_razao_social || '').toUpperCase())}</strong><br>
        CPF/CNPJ nº ${esc(clientes[0].cpf_cnpj || '')}
      </div>`
    : `<div style="display:flex; justify-content:space-between; align-items:flex-start; width:100%; margin-top:16mm; flex-wrap:wrap; gap:8mm;">
        ${clientes.map(cli => `
          <div class="sigbox" style="width:48%;">
            <div class="line"></div>
            <strong>${esc(String(cli.nome_razao_social || '').toUpperCase())}</strong><br>
            CPF/CNPJ nº ${esc(cli.cpf_cnpj || '')}
          </div>
        `).join('')}
      </div>`

  const body = `${bodyText}
  <p style="margin-top:6mm;">${esc(city)}/${esc(uf)}, ${dateLong(date)}.</p>
  ${assinaturasClientesHtml}
  <p style="font-size:8pt;color:#64748b;margin-top:14mm;line-height:1.4;"><strong>Observação:</strong> a Receita Federal não emite declaração anual de isento. A ausência de obrigatoriedade pode ser declarada pelo próprio interessado, sob sua responsabilidade, conforme a legislação aplicável.</p>`

  return `<div class="document">${buildPage(
    body,
    'DECLARAÇÃO DE ISENÇÃO DO IMPOSTO DE RENDA PESSOA FÍSICA (IRPF)',
    num,
    adv,
    logo,
    {
      linha1: o.rodapeLinha1,
      linha2: o.rodapeLinha2,
      linha3: o.rodapeLinha3,
      numerarPaginas: o.numerarPaginas
    },
    o.cabecalhoPersonalizado,
    1,
    1
  )}</div>`
}

export function buildRecibo(
  c: Partial<Cliente> | Partial<Cliente>[],
  adv: AdvogadoConfigDoc,
  cfg: ConfigDocumentos,
  logo: string | null,
  o: OpcaoRecibo & { date?: string; city?: string; uf?: string; number?: string; signatureImg?: string | null; clientesAdicionais?: Partial<Cliente>[] }
): string {
  const clientes = extrairClientes(c, o.clientesAdicionais)
  const isMulti = clientes.length > 1
  const date = o.date || new Date().toISOString().slice(0, 10)
  const city = o.city || 'Praia Grande'
  const uf = o.uf || 'SP'
  const num = o.number || ''

  const parcela = o.parcelaRecibo ? ` (${esc(o.parcelaRecibo)})` : ''

  const nomesDocs = !isMulti
    ? `<strong>${esc(String(clientes[0].nome_razao_social || '').toUpperCase())}</strong>, inscrito(a) no CPF/CNPJ nº ${esc(clientes[0].cpf_cnpj || '')}`
    : clientes.map(cli => `<strong>${esc(String(cli.nome_razao_social || '').toUpperCase())}</strong>, inscrito(a) no CPF/CNPJ nº ${esc(cli.cpf_cnpj || '')}`).join(' e ')

  const acaoVerbo = isMulti ? 'declaram, para os devidos fins, que efetuaram conjuntamente o pagamento' : 'declara, para os devidos fins, que efetuou o pagamento'

  const bodyText = (o.textoPersonalizado && o.textoPersonalizado.trim())
    ? formatParagrafosPersonalizados(o.textoPersonalizado)
    : `<p>${nomesDocs}, ${acaoVerbo} no valor de <strong>${money(o.valorRecibo)} (${esc(o.valorExtenso || 'valor por extenso não informado')})</strong> para <strong>${esc(adv.nome)}</strong>, advogado, inscrito no CPF nº ${esc(cfg.lawyerCpf)} e ${esc(adv.oab)}, integrante da ${esc(cfg.empresa)}.</p>
  <p>O valor refere-se a <strong>${esc(o.referenciaRecibo || 'prestação de serviços advocatícios')}${parcela}</strong>. O pagamento foi realizado por ${esc(o.formaPagamento || 'PIX')} nesta data.${o.obsRecibo ? ' ' + esc(o.obsRecibo) : ''}</p>
  <p>Por ser a expressão da verdade, firma-se o presente recibo.</p>`

  const body = `${bodyText}
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

  return `<div class="document">${buildPage(
    body,
    'RECIBO DE PAGAMENTO',
    num,
    adv,
    logo,
    {
      linha1: o.rodapeLinha1,
      linha2: o.rodapeLinha2,
      linha3: o.rodapeLinha3,
      numerarPaginas: o.numerarPaginas
    },
    o.cabecalhoPersonalizado,
    1,
    1
  )}</div>`
}

export function buildResidencia(
  c: Partial<Cliente> | Partial<Cliente>[],
  adv: AdvogadoConfigDoc,
  _cfg: ConfigDocumentos,
  logo: string | null,
  o: OpcaoResidencia & { date?: string; city?: string; uf?: string; number?: string; clientesAdicionais?: Partial<Cliente>[] }
): string {
  const clientes = extrairClientes(c, o.clientesAdicionais)
  const isMulti = clientes.length > 1
  const date = o.date || new Date().toISOString().slice(0, 10)
  const city = o.city || 'Praia Grande'
  const uf = o.uf || 'SP'
  const num = o.number || ''

  let conteudoPadrao = ''
  if (!isMulti) {
    const cli = clientes[0]
    const third = o.tipoResidencia === 'terceiro' && o.titularResidencia
    const declarant = third ? o.titularResidencia : cli.nome_razao_social
    const cpf = third ? o.cpfTitular : cli.cpf_cnpj
    const resident = third
      ? `DECLARO que ${esc(cli.nome_razao_social || '')}, inscrito(a) no CPF/CNPJ nº ${esc(cli.cpf_cnpj || '')}, reside e é domiciliado(a) no endereço ${esc(clienteEndereco(cli))}${o.vinculoTitular ? `, sendo meu/minha ${esc(o.vinculoTitular)}` : ''}`
      : `DECLARO que sou residente e domiciliado(a) no endereço ${esc(clienteEndereco(cli))}`

    conteudoPadrao = `<p>Eu, <strong>${esc(String(declarant || '').toUpperCase())}</strong>, inscrito(a) no CPF/CNPJ nº ${esc(cpf || '')}, ${resident}, para fins de comprovação de residência junto a ${esc(o.destinoResidencia || 'empresa ou órgão solicitante')}.</p>
    <p>Declaro, sob as penas da lei e nos termos dos artigos 1º, 2º e 3º da Lei nº 7.115/1983, que as informações são verdadeiras, estando ciente das responsabilidades civis, administrativas e criminais decorrentes de declaração falsa, inclusive do disposto no artigo 299 do Código Penal.</p>
    <p>Por ser a expressão da verdade, firmo a presente para que produza seus efeitos legais.</p>`
  } else {
    const nomesDocs = clientes.map(cli => `<strong>${esc(String(cli.nome_razao_social || '').toUpperCase())}</strong>, inscrito(a) no CPF/CNPJ nº ${esc(cli.cpf_cnpj || '')}`).join(' e ')
    conteudoPadrao = `<p>Nós, ${nomesDocs}, DECLARAMOS que somos residentes e domiciliados no endereço ${esc(clienteEndereco(clientes[0]))}, para fins de comprovação de residência junto a ${esc(o.destinoResidencia || 'empresa ou órgão solicitante')}.</p>
    <p>Declaramos, sob as penas da lei e nos termos dos artigos 1º, 2º e 3º da Lei nº 7.115/1983, que as informações são verdadeiras, estando cientes das responsabilidades civis, administrativas e criminais decorrentes de declaração falsa, inclusive do disposto no artigo 299 do Código Penal.</p>
    <p>Por ser a expressão da verdade, firmamos a presente para que produza seus efeitos legais.</p>`
  }

  const bodyText = (o.textoPersonalizado && o.textoPersonalizado.trim())
    ? formatParagrafosPersonalizados(o.textoPersonalizado)
    : conteudoPadrao

  const assinaturasClientesHtml = !isMulti
    ? `<div class="signature-block" style="margin-top:16mm;">
        <div class="signature-line"></div>
        <strong>${esc(String(clientes[0].nome_razao_social || '').toUpperCase())}</strong><br>
        CPF/CNPJ nº ${esc(clientes[0].cpf_cnpj || '')}
      </div>`
    : `<div style="display:flex; justify-content:space-between; align-items:flex-start; width:100%; margin-top:16mm; flex-wrap:wrap; gap:8mm;">
        ${clientes.map(cli => `
          <div class="sigbox" style="width:48%;">
            <div class="line"></div>
            <strong>${esc(String(cli.nome_razao_social || '').toUpperCase())}</strong><br>
            CPF/CNPJ nº ${esc(cli.cpf_cnpj || '')}
          </div>
        `).join('')}
      </div>`

  const body = `${bodyText}
  <p style="margin-top:6mm;">${esc(city)}/${esc(uf)}, ${dateLong(date)}.</p>
  ${assinaturasClientesHtml}`

  return `<div class="document">${buildPage(
    body,
    'DECLARAÇÃO DE RESIDÊNCIA',
    num,
    adv,
    logo,
    {
      linha1: o.rodapeLinha1,
      linha2: o.rodapeLinha2,
      linha3: o.rodapeLinha3,
      numerarPaginas: o.numerarPaginas
    },
    o.cabecalhoPersonalizado,
    1,
    1
  )}</div>`
}

function interpolarTexto(texto: string, tags: Record<string, string>): string {
  return texto.replace(/\{([a-zA-Z0-9_-]+)\}/g, (match, key) => {
    const k = key.toLowerCase()
    return tags[k] !== undefined ? tags[k] : match
  })
}

function renderClauseHtml(clause: ClausulaContrato, tags: Record<string, string>, centralizarTitulos?: boolean): string {
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

  const centeredClass = centralizarTitulos ? ' centered' : ''
  const centeredStyle = centralizarTitulos ? ' style="text-align:center;"' : ''
  return `<div class="clause"><div class="clause-title${centeredClass}"${centeredStyle}>${esc(interpolatedTitle)}</div>${paragraphsHtml}</div>`
}

function estimateTextHeightMm(text: string): number {
  const plainText = text.replace(/<[^>]+>/g, '').trim()
  if (!plainText) return 0
  // Em coluna de 176mm, Century Gothic 10.2pt comporta aprox. 95-100 caracteres por linha
  const lines = Math.max(1, Math.ceil(plainText.length / 96))
  return lines * 5.0
}

function estimateParagraphHeightMm(pHtml: string): number {
  return estimateTextHeightMm(pHtml) + 2.5
}

function estimateTitleHeightMm(titleHtml: string): number {
  return estimateTextHeightMm(titleHtml) + 5.5
}

function estimateHtmlHeightMm(html: string): number {
  const plainText = html.replace(/<[^>]+>/g, '').trim()
  if (!plainText) return 0

  const pMatches = html.match(/<p\b[\s\S]*?<\/p>/gi) || []
  const titleMatches = html.match(/<div class=["']clause-title[^"']*["'][\s\S]*?<\/div>/gi) || []

  if (pMatches.length === 0 && titleMatches.length === 0) {
    return estimateTextHeightMm(plainText) + 3.0
  }

  let total = 0
  for (const p of pMatches) {
    total += estimateParagraphHeightMm(p)
  }
  for (const t of titleMatches) {
    total += estimateTitleHeightMm(t)
  }
  return total
}

export function gerarPreambuloContrato(
  c: Partial<Cliente> | Partial<Cliente>[],
  adv: AdvogadoConfigDoc,
  cfg: ConfigDocumentos,
  o: Partial<OpcaoContrato>
): string {
  if (o.preambuloPersonalizado && o.preambuloPersonalizado.trim()) {
    const lines = o.preambuloPersonalizado.split(/\n+/).map(l => l.trim()).filter(Boolean)
    return lines.map(line => `<p>${esc(line)}</p>`).join('')
  }

  const parteConjuntaHtml = (o.atuacaoConjunta && o.advogadoConjuntoNome)
    ? `, com atuação conjunta de <strong>${esc(o.advogadoConjuntoNome)}, ${esc(o.advogadoConjuntoTratamento || 'advogada')}, ${esc(o.advogadoConjuntoOab || '')}</strong>, com escritório profissional na ${esc(o.advogadoConjuntoEndereco || adv.endereco || cfg.foro)}`
    : ''

  const clientes = extrairClientes(c, o.clientesAdicionais)
  if (clientes.length <= 1) {
    return `<p>Pelo presente instrumento, <strong>${esc(cfg.empresa)}</strong>, registrada na OAB/SP nº ${esc(cfg.socOab)}, CNPJ nº ${esc(cfg.cnpj)}, com sede na ${esc(adv.endereco || cfg.foro)}, neste ato representada por <strong>Dr. ${esc(adv.nome)}, ${esc(adv.oab)}</strong>${parteConjuntaHtml}, doravante <strong>CONTRATADA</strong>, e <strong>${esc(clienteQualificacao(clientes[0]))}</strong>, doravante <strong>CONTRATANTE</strong>, ajustam o seguinte:</p>`
  }

  const listaQualifHtml = clientes
    .map((cli, i) => `<strong>${i + 1}) ${esc(clienteQualificacao(cli))}</strong>`)
    .join('; e ')

  return `<p>Pelo presente instrumento, <strong>${esc(cfg.empresa)}</strong>, registrada na OAB/SP nº ${esc(cfg.socOab)}, CNPJ nº ${esc(cfg.cnpj)}, com sede na ${esc(adv.endereco || cfg.foro)}, neste ato representada por <strong>Dr. ${esc(adv.nome)}, ${esc(adv.oab)}</strong>${parteConjuntaHtml}, doravante <strong>CONTRATADA</strong>, e, conjuntamente como <strong>CONTRATANTES</strong>: ${listaQualifHtml}, doravante denominados em conjunto <strong>CONTRATANTES</strong>, ajustam o seguinte:</p>`
}

export function obterTextoPreambuloPadrao(
  c: Partial<Cliente> | Partial<Cliente>[] | null,
  adv: AdvogadoConfigDoc,
  cfg: ConfigDocumentos,
  o: Partial<OpcaoContrato>
): string {
  const parteConjunta = (o.atuacaoConjunta && o.advogadoConjuntoNome)
    ? `, com atuação conjunta de ${o.advogadoConjuntoNome}, ${o.advogadoConjuntoTratamento || 'advogada'}, ${o.advogadoConjuntoOab || ''}, com escritório profissional na ${o.advogadoConjuntoEndereco || adv.endereco || cfg.foro}`
    : ''

  const clientes = extrairClientes(c, o.clientesAdicionais)
  if (clientes.length <= 1) {
    const qualifCliente = clientes[0]?.nome_razao_social ? clienteQualificacao(clientes[0]) : '[DADOS DO CONTRATANTE QUALIFICADO]'
    return `Pelo presente instrumento, ${cfg.empresa}, registrada na OAB/SP nº ${cfg.socOab}, CNPJ nº ${cfg.cnpj}, com sede na ${adv.endereco || cfg.foro}, neste ato representada por Dr. ${adv.nome}, ${adv.oab}${parteConjunta}, doravante CONTRATADA, e ${qualifCliente}, doravante CONTRATANTE, ajustam o seguinte:`
  }

  const listaQualif = clientes
    .map((cli, i) => `${i + 1}) ${clienteQualificacao(cli)}`)
    .join('; e ')

  return `Pelo presente instrumento, ${cfg.empresa}, registrada na OAB/SP nº ${cfg.socOab}, CNPJ nº ${cfg.cnpj}, com sede na ${adv.endereco || cfg.foro}, neste ato representada por Dr. ${adv.nome}, ${adv.oab}${parteConjunta}, doravante CONTRATADA, e, conjuntamente como CONTRATANTES: ${listaQualif}, doravante denominados em conjunto CONTRATANTES, ajustam o seguinte:`
}

function estimateSignaturesHeightMm(signaturesHtml: string): number {
  const hasWitnesses = signaturesHtml.includes('TESTEMUNHA')
  const dateHeight = 7
  const bufferMm = 12

  const sigboxesCount = (signaturesHtml.match(/class="sigbox"/g) || []).length
  const partySigboxesCount = hasWitnesses ? Math.max(0, sigboxesCount - 2) : sigboxesCount

  // Contratantes têm rótulo com 'CONTRATANTE'
  const contratantesCount = (signaturesHtml.match(/CONTRATANTE/g) || []).length || 1
  // Advogados são os demais sigboxes de partes (pelo menos 1)
  const lawyersCount = Math.max(1, partySigboxesCount - contratantesCount)
  // O número de linhas empilhadas na coluna esquerda ou direita é o máximo entre os dois
  const maxRows = Math.max(1, contratantesCount, lawyersCount)

  let signaturesHeight = 45
  if (maxRows === 2) {
    signaturesHeight = 88
  } else if (maxRows > 2) {
    signaturesHeight = 12 + (maxRows * 33) + ((maxRows - 1) * 10)
  }

  const witnessesHeight = hasWitnesses ? 44 : 0

  return dateHeight + signaturesHeight + witnessesHeight + bufferMm
}

interface RawClauseUnit {
  clauseIndex: number
  titleHtml?: string
  paragraphHtml: string
  heightMm: number
}

function prepareContractClauseUnits(
  clauses: ClausulaContrato[],
  tags: Record<string, string>,
  centralizarTitulos?: boolean,
  clausulaExtra?: string
): RawClauseUnit[] {
  const units: RawClauseUnit[] = []

  clauses.forEach((clause, clauseIndex) => {
    const interpolatedTitle = interpolarTexto(clause.titulo, tags)
    const interpolatedContent = interpolarTexto(clause.conteudo, tags)

    const lines = interpolatedContent
      .split(/\n+/)
      .map(l => l.trim())
      .filter(Boolean)

    const centeredClass = centralizarTitulos ? ' centered' : ''
    const centeredStyle = centralizarTitulos ? ' style="text-align:center;"' : ''
    const titleHtml = `<div class="clause-title${centeredClass}"${centeredStyle}>${esc(interpolatedTitle)}</div>`

    if (lines.length === 0) {
      units.push({
        clauseIndex,
        titleHtml,
        paragraphHtml: '',
        heightMm: estimateTitleHeightMm(titleHtml)
      })
      return
    }

    lines.forEach((line, pIdx) => {
      const matchPrefix = line.match(/^(\d+\.\d+\.?\s*)(.*)$/)
      const paragraphHtml = matchPrefix
        ? `<p><strong>${esc(matchPrefix[1])}</strong>${esc(matchPrefix[2])}</p>`
        : `<p>${esc(line)}</p>`

      if (pIdx === 0) {
        // Amarra o título ao primeiro parágrafo para nunca deixar título órfão no rodapé da folha
        units.push({
          clauseIndex,
          titleHtml,
          paragraphHtml,
          heightMm: estimateTitleHeightMm(titleHtml) + estimateParagraphHeightMm(paragraphHtml)
        })
      } else {
        units.push({
          clauseIndex,
          paragraphHtml,
          heightMm: estimateParagraphHeightMm(paragraphHtml)
        })
      }
    })
  })

  if (clausulaExtra && clausulaExtra.trim()) {
    const extraIndex = clauses.length
    const centeredClass = centralizarTitulos ? ' centered' : ''
    const centeredStyle = centralizarTitulos ? ' style="text-align:center;"' : ''
    const titleHtml = `<div class="clause-title${centeredClass}"${centeredStyle}>CLÁUSULA ADICIONAL</div>`
    const pLines = clausulaExtra.split(/\n+/).map(l => l.trim()).filter(Boolean)

    pLines.forEach((line, pIdx) => {
      const paragraphHtml = `<p>${esc(line)}</p>`
      if (pIdx === 0) {
        units.push({
          clauseIndex: extraIndex,
          titleHtml,
          paragraphHtml,
          heightMm: estimateTitleHeightMm(titleHtml) + estimateParagraphHeightMm(paragraphHtml)
        })
      } else {
        units.push({
          clauseIndex: extraIndex,
          paragraphHtml,
          heightMm: estimateParagraphHeightMm(paragraphHtml)
        })
      }
    })
  }

  return units
}

function renderPageUnitsHtml(units: RawClauseUnit[]): string {
  if (units.length === 0) return ''

  let html = ''
  let currentClauseIndex = -1
  let inClause = false

  for (const u of units) {
    if (u.clauseIndex !== currentClauseIndex) {
      if (inClause) {
        html += '</div>'
      }
      html += '<div class="clause">'
      inClause = true
      currentClauseIndex = u.clauseIndex
    }

    if (u.titleHtml) {
      html += u.titleHtml
    }
    if (u.paragraphHtml) {
      html += u.paragraphHtml
    }
  }

  if (inClause) {
    html += '</div>'
  }

  return html
}

function distributeContractPages(
  preambuloHtml: string,
  units: RawClauseUnit[],
  signaturesHtml: string
): string[] {
  // Limites calibrados para preenchimento confortável e margem intransponível antes do rodapé institucional
  // Página 1: A4 (297mm) - top (12mm) - letterhead (24mm) - title (18mm) - footer & safety (33mm) = 210mm
  const PAGE_1_MAX_MM = 210
  // Páginas 2+: A4 (297mm) - top (12mm) - letterhead (24mm) - footer & safety (35mm) = 226mm
  const PAGE_N_MAX_MM = 226

  const sigHeightMm = estimateSignaturesHeightMm(signaturesHtml)
  const preambuloHeightMm = estimateHtmlHeightMm(preambuloHtml)

  const pagesHtml: string[] = []
  const pageUnitsList: RawClauseUnit[][] = []

  let currentUnits: RawClauseUnit[] = []
  let currentHeightMm = preambuloHeightMm
  let currentMaxMm = PAGE_1_MAX_MM

  let uIdx = 0
  while (uIdx < units.length) {
    const unit = units[uIdx]

    if (currentUnits.length > 0 && currentHeightMm + unit.heightMm > currentMaxMm) {
      pageUnitsList.push(currentUnits)
      currentUnits = []
      currentHeightMm = 0
      currentMaxMm = PAGE_N_MAX_MM
    }

    currentUnits.push(unit)
    currentHeightMm += unit.heightMm
    uIdx++
  }

  if (currentUnits.length > 0) {
    pageUnitsList.push(currentUnits)
  }

  if (pageUnitsList.length === 0) {
    pagesHtml.push(preambuloHtml + signaturesHtml)
    return pagesHtml
  }

  const lastPageIndex = pageUnitsList.length - 1
  const lastPageUnits = pageUnitsList[lastPageIndex]
  const lastPageMaxMm = lastPageIndex === 0 ? PAGE_1_MAX_MM : PAGE_N_MAX_MM

  let lastPageHeightMm = lastPageIndex === 0 ? preambuloHeightMm : 0
  for (const u of lastPageUnits) {
    lastPageHeightMm += u.heightMm
  }

  if (lastPageHeightMm + sigHeightMm <= lastPageMaxMm) {
    for (let i = 0; i < pageUnitsList.length; i++) {
      const pHtml = renderPageUnitsHtml(pageUnitsList[i])
      if (i === 0) {
        pagesHtml.push(preambuloHtml + pHtml + (i === lastPageIndex ? signaturesHtml : ''))
      } else {
        pagesHtml.push(pHtml + (i === lastPageIndex ? signaturesHtml : ''))
      }
    }
  } else {
    let carriedUnits: RawClauseUnit[] = []
    if (lastPageUnits.length > 2) {
      carriedUnits = lastPageUnits.slice(-2)
      pageUnitsList[lastPageIndex] = lastPageUnits.slice(0, -2)
    } else if (lastPageUnits.length === 2) {
      carriedUnits = lastPageUnits.slice(-1)
      pageUnitsList[lastPageIndex] = lastPageUnits.slice(0, -1)
    }

    for (let i = 0; i < pageUnitsList.length; i++) {
      const pHtml = renderPageUnitsHtml(pageUnitsList[i])
      if (i === 0) {
        pagesHtml.push(preambuloHtml + pHtml)
      } else {
        pagesHtml.push(pHtml)
      }
    }

    const newPageHtml = renderPageUnitsHtml(carriedUnits) + signaturesHtml
    pagesHtml.push(newPageHtml)
  }

  return pagesHtml
}

export function buildContrato(
  c: Partial<Cliente> | Partial<Cliente>[],
  adv: AdvogadoConfigDoc,
  cfg: ConfigDocumentos,
  logo: string | null,
  o: OpcaoContrato & { date?: string; city?: string; uf?: string; number?: string; useSignature?: boolean; signatureImg?: string | null; clientesAdicionais?: Partial<Cliente>[] }
): string {
  const clientes = extrairClientes(c, o.clientesAdicionais)
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
    ? `<div class="party-signatures" style="display:flex; justify-content:space-between; align-items:flex-start; width:100%; margin-top:12mm;">
    <div class="sigbox" style="width:48%;">
      <div class="sig-space"></div>
      <div class="line"></div>
      <strong>TESTEMUNHA 1</strong><br>
      ${o.testemunha1Nome ? `Nome: ${esc(o.testemunha1Nome)}<br>` : 'Nome:<br>'}
      ${o.testemunha1Cpf ? `CPF: ${esc(o.testemunha1Cpf)}` : 'CPF:'}
    </div>
    <div class="sigbox" style="width:48%;">
      <div class="sig-space"></div>
      <div class="line"></div>
      <strong>TESTEMUNHA 2</strong><br>
      ${o.testemunha2Nome ? `Nome: ${esc(o.testemunha2Nome)}<br>` : 'Nome:<br>'}
      ${o.testemunha2Cpf ? `CPF: ${esc(o.testemunha2Cpf)}` : 'CPF:'}
    </div>
  </div>`
    : ''

  const sigsContratantes = clientes.map((cli, idx) => {
    const rotulo = clientes.length > 1 ? `CONTRATANTE ${idx + 1}:` : 'CONTRATANTE:'
    return `
    <div class="sigbox" style="width:100%;">
      <div class="sig-space"></div>
      <div class="line"></div>
      <strong>${rotulo}</strong><br>${esc(cli.nome_razao_social || '')}<br>CPF/CNPJ nº ${esc(cli.cpf_cnpj || '')}
    </div>`
  })

  const sigAdvTitular = `
    <div class="sigbox" style="width:100%;">
      <div class="sig-space">
        ${(o.useSignature && o.signatureImg) ? `<img class="signature-img" src="${o.signatureImg}" alt="Assinatura">` : ''}
      </div>
      <div class="line"></div>
      <strong>${esc(adv.nome)}</strong><br>Advogado<br>${esc(adv.oab)}
    </div>`

  const sigAdvConjunto = (o.atuacaoConjunta && o.advogadoConjuntoNome)
    ? `
    <div class="sigbox" style="width:100%;">
      <div class="sig-space"></div>
      <div class="line"></div>
      <strong>${esc(o.advogadoConjuntoNome)}</strong><br>${esc(o.advogadoConjuntoTratamento || 'Advogado(a)')}<br>${esc(o.advogadoConjuntoOab || '')}
    </div>`
    : ''

  const sigsAdvogados = [sigAdvTitular, sigAdvConjunto].filter(Boolean)

  const blocoAssinaturasPartes = `
    <div class="party-signatures" style="display:flex; justify-content:space-between; align-items:flex-start; width:100%; margin-top:12mm;">
      <div style="width:48%; display:flex; flex-direction:column; gap:10mm;">
        ${sigsContratantes.join('')}
      </div>
      <div style="width:48%; display:flex; flex-direction:column; gap:10mm;">
        ${sigsAdvogados.join('')}
      </div>
    </div>`

  const assinaturasHtml = `<p>${esc(city)}/${esc(uf)}, ${dateLong(date)}.</p>
  ${blocoAssinaturasPartes}
  ${blocoTestemunhas}`

  const preambuloHtml = gerarPreambuloContrato(clientes, adv, cfg, o)

  const clausulasParaUsar = (o.clausulas && o.clausulas.length > 0)
    ? o.clausulas
    : CLAUSULAS_PADRAO_CONTRATO

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
    nome_cliente: clientesNomesFormatados(clientes),
    cpf_cliente: clientesCpfsFormatados(clientes),
    nome_advogado: adv.nome || '',
    oab_advogado: adv.oab || '',
    empresa_advogado: cfg.empresa || '',
    advogado_conjunto_nome: o.advogadoConjuntoNome || '',
    advogado_conjunto_oab: o.advogadoConjuntoOab || '',
    advogado_conjunto_tratamento: o.advogadoConjuntoTratamento || 'advogado(a)',
    advogado_conjunto_endereco: o.advogadoConjuntoEndereco || '',
    cidade: city,
    uf: uf,
    data: dateLong(date)
  }

  const rawUnits = prepareContractClauseUnits(
    clausulasParaUsar,
    tags,
    o.centralizarTitulos,
    o.clausulaExtra
  )

  const pages = distributeContractPages(preambuloHtml, rawUnits, assinaturasHtml)
  const renderedPages = pages.map((pContent, idx) => {
    const pTitle = idx === 0 ? 'CONTRATO DE PRESTAÇÃO DE SERVIÇOS E HONORÁRIOS ADVOCATÍCIOS' : ''
    return buildPage(
      pContent,
      pTitle,
      num,
      adv,
      logo,
      {
        linha1: o.rodapeLinha1,
        linha2: o.rodapeLinha2,
        linha3: o.rodapeLinha3,
        numerarPaginas: o.numerarPaginas
      },
      o.cabecalhoPersonalizado,
      idx + 1,
      pages.length
    )
  })

  return `<div class="document">${renderedPages.join('')}</div>`
}
