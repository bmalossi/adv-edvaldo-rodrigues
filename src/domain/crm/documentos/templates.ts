import { Cliente } from '@/domain/crm/cliente'
import {
  ConfigDocumentos,
  AdvogadoConfigDoc,
  OpcaoContrato,
  OpcaoProcuracao,
  OpcaoHipossuficiencia,
  OpcaoIrpf,
  OpcaoRecibo,
  OpcaoResidencia
} from './tipos'
import { esc, dateLong, dateShort, money, clienteEndereco, clienteQualificacao } from './formatacao'

function buildHeader(logo?: string | null): string {
  if (!logo) {
    return `<div class="letterhead"><div style="padding-bottom:3mm;border-bottom:1px solid #e2e8f0;font-size:13pt;font-weight:bold;color:#1e293b;letter-spacing:1px;text-align:center;">ADVOCACIA & CONSULTORIA JURÍDICA</div></div>`
  }
  return `<div class="letterhead"><img src="${logo}" alt="Logotipo"></div>`
}

function buildFooter(adv: AdvogadoConfigDoc): string {
  return `<div class="doc-footer"><strong>${esc(adv.nome)} | ${esc(adv.oab)}</strong><br>${esc(adv.endereco || 'Avenida Presidente Costa e Silva, nº 733, sala 21 – Praia Grande/SP')}<br>${esc(adv.email)} · ${esc(adv.telefone)}</div>`
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

  const fix = Number(o.honorariosFixos) || 0
  const ext = o.fixoExtenso || 'valor por extenso não informado'
  const entrada = Number(o.entrada) || 0
  const parcelas = Number(o.parcelas) || 1
  const valorParcela = parcelas > 0 ? (fix - entrada) / parcelas : 0
  const dia = o.diaVencimento || '10'
  const primeiro = o.primeiroVencimento || 'no mês subsequente'

  const objTxt = o.objetoDescricao || 'prestação de serviços jurídicos e assessoria advocatícia'
  const atuacaoTxt = o.areaAtuacao ? ` na área de ${o.areaAtuacao}` : ''

  const pg1 = `<p><strong>CONTRATANTE:</strong> ${esc(clienteQualificacao(c))}.</p>
  <p><strong>CONTRATADA:</strong> <strong>${esc(cfg.empresa)}</strong>, sociedade de advogados inscrita no CNPJ nº ${esc(cfg.cnpj)}, com registro na OAB sob nº ${esc(cfg.socOab)}, com sede em ${esc(adv.endereco || cfg.foro)}, neste ato representada por seu sócio <strong>${esc(adv.nome)}</strong>, advogado inscrito na ${esc(adv.oab)}, e-mail ${esc(adv.email)}, telefone ${esc(adv.telefone)}.</p>
  <p>As partes têm, entre si, justo e contratado o que se contém nas cláusulas seguintes:</p>
  <div class="clause"><div class="clause-title">CLÁUSULA 1ª – OBJETO DO CONTRATO</div>
  <p><strong>1.1.</strong> O presente contrato tem por objeto a ${esc(objTxt)}${esc(atuacaoTxt)}, compreendendo a prática de todos os atos inerentes ao patrocínio dos interesses da CONTRATANTE, em âmbito consultivo, preventivo, administrativo ou judicial, em primeira instância ou instâncias ordinárias correlatas à contratação.</p>
  <p><strong>1.2.</strong> Recursos para Tribunais Superiores (STJ e STF), medidas cautelares autônomas, ações rescisórias, mandados de segurança não incidentais e a fase de cumprimento de sentença com impugnação complexa dependerão de aditivo ou contratação específica, caso não expressamente previstos.</p></div>
  <div class="clause"><div class="clause-title">CLÁUSULA 2ª – OBRIGAÇÕES DA CONTRATADA</div>
  <p><strong>2.1.</strong> A CONTRATADA obriga-se a prestar os serviços profissionais com zelo, técnica, independência e estrita observância ao Código de Ética e Disciplina da OAB e ao Estatuto da Advocacia (Lei nº 8.906/1994).</p>
  <p><strong>2.2.</strong> A atividade advocatícia é de <em>meio</em>, e não de <em>resultado</em>, não assegurando a CONTRATADA o êxito da demanda, mas comprometendo-se ao emprego da melhor técnica aplicável ao caso.</p></div>`

  const pg2 = `<div class="clause">
  <p><strong>2.3.</strong> A CONTRATADA manterá a CONTRATANTE informada acerca dos principais andamentos processuais e prestará contas ao término da prestação ou sempre que solicitada formalmente.</p></div>
  <div class="clause"><div class="clause-title">CLÁUSULA 3ª – OBRIGAÇÕES DA CONTRATANTE</div>
  <p><strong>3.1.</strong> A CONTRATANTE compromete-se a fornecer informações verdadeiras, documentos, provas e subsídios indispensáveis à defesa de seus interesses, sob pena de exclusiva responsabilidade pelos prejuízos decorrentes de omissões ou atrasos.</p>
  <p><strong>3.2.</strong> Correm por conta da CONTRATANTE todas as custas judiciais, despesas com perícias, viagens indispensáveis, certidões, cópias, preparos recursais e demais encargos processuais, ressalvada eventual concessão de gratuidade da justiça.</p></div>
  <div class="clause"><div class="clause-title">CLÁUSULA 4ª – HONORÁRIOS FIXOS E FORMA DE PAGAMENTO</div>
  <p><strong>4.1.</strong> A CONTRATANTE pagará <strong>${money(fix)} (${esc(ext)})</strong>: ${money(entrada)} na assinatura e ${esc(parcelas)} parcela(s) mensal(is) de ${money(valorParcela)}, vencível(is) todo dia ${esc(dia)}, iniciando-se em ${esc(primeiro)}. A quitação depende da efetiva compensação.</p>
  <p><strong>4.2.</strong> Pagamentos por boleto ou PIX serão emitidos pela CONTRATADA. A mora incorre em multa de 2%, juros de 1% ao mês e correção pelo IPCA/IBGE.</p></div>`

  const pg3 = `<div class="clause"><div class="clause-title">CLÁUSULA 5ª – HONORÁRIOS DE ÊXITO E SUCUMBÊNCIA</div>
  <p><strong>5.1.</strong> Sobre o proveito econômico obtido (acordo, condenação ou economia direta), incidirá o percentual de <strong>${esc(o.honorariosExito || '20%')}</strong>, devido imediatamente após o recebimento, levantamento ou compensação de valores.</p>
  <p><strong>5.2.</strong> Os honorários de sucumbência arbitrados judicialmente pertencem exclusivamente aos advogados da CONTRATADA, nos termos do art. 23 da Lei nº 8.906/1994, não se compensando com os honorários contratuais ajustados.</p></div>
  <div class="clause"><div class="clause-title">CLÁUSULA 6ª – INADIMPLEMENTO E MORA</div>
  <p><strong>6.1.</strong> O atraso superior a 30 (trinta) dias no pagamento de qualquer parcela facultará à CONTRATADA a suspensão da prática de atos não urgentes e, persistindo a inadimplência, a rescisão contratual com a cobrança integral do saldo devedor e das perdas decorrentes.</p></div>
  <div class="clause"><div class="clause-title">CLÁUSULA 7ª – RESOLUÇÃO ANTECIPADA POR CAUSA DA CONTRATANTE</div>
  <p><strong>7.1.</strong> Constituem justa causa, além do inadimplemento: documento ou informação falsa; omissão essencial; recusa reiterada em entregar documentos ou cumprir orientação necessária; falta de custas; exigência de ato ilegal, antiético ou tecnicamente inadequado; ofensa, ameaça, assédio ou grave quebra de confiança; acordo, contato ou recebimento ocultado; ausência injustificada em ato; contratação paralela incompatível; ou qualquer conduta que inviabilize ou comprometa a defesa.</p>
  <p><strong>7.2.</strong> Verificada a justa causa, a CONTRATADA comunicará o encerramento por escrito e adotará a renúncia ou substituição prevista em lei, mantendo apenas as providências indispensáveis durante o prazo legal. Permanecerão devidos os honorários vencidos, os proporcionais ao trabalho executado, as despesas, o êxito implementado e a sucumbência.</p></div>`

  const textoExecutivo = o.incluirTestemunhas
    ? 'Este contrato constitui título executivo extrajudicial nos termos do art. 24 da Lei nº 8.906/1994 e, com duas testemunhas, também do art. 784, III, do CPC. Assinaturas físicas ou eletrônicas que comprovem autoria e integridade produzem os mesmos efeitos.'
    : 'Este contrato constitui título executivo extrajudicial nos termos do art. 24 da Lei nº 8.906/1994. Assinaturas físicas ou eletrônicas que comprovem autoria e integridade produzem os mesmos efeitos.'

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

  const pg5 = `<p>${esc(city)}/${esc(uf)}, ${dateLong(date)}.</p>
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

  return `<div class="document">${buildPage(pg1, 'CONTRATO DE HONORÁRIOS ADVOCATÍCIOS', num, adv, logo)}${buildPage(pg2, '', num, adv, logo)}${buildPage(pg3, '', num, adv, logo)}${buildPage(pg4, '', num, adv, logo)}${buildPage(pg5, '', num, adv, logo)}</div>`
}
