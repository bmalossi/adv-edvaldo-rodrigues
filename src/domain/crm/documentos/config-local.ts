import { ConfigDocumentos, OpcoesDocumentoForm, ClausulaContrato } from './tipos'

const STORAGE_KEYS = {
  logo: 'erf_doc_logo_v1',
  signature: 'erf_doc_signature_v1',
  config: 'erf_doc_config_v1',
  counters: 'erf_doc_counters_v1',
  padroes: 'erf_doc_padroes_templates_v1',
}

export const DEFAULTS_CONFIG: ConfigDocumentos = {
  prefixo: 'ERF',
  empresa: 'EDVALDO RODRIGUES FERREIRA SOCIEDADE INDIVIDUAL DE ADVOCACIA – ME',
  socOab: '62.067',
  cnpj: '62.068.076/0001-06',
  foro: 'Comarca de Praia Grande/SP',
  lawyerCpf: '925.540.401-68',
  pix: '(13) 99682-4364'
}

export function carregarConfigDocumentosLocal(): ConfigDocumentos {
  try {
    const salvo = localStorage.getItem(STORAGE_KEYS.config)
    if (!salvo) return DEFAULTS_CONFIG
    return { ...DEFAULTS_CONFIG, ...JSON.parse(salvo) }
  } catch {
    return DEFAULTS_CONFIG
  }
}

export function salvarConfigDocumentosLocal(cfg: Partial<ConfigDocumentos>): void {
  try {
    const atual = carregarConfigDocumentosLocal()
    localStorage.setItem(STORAGE_KEYS.config, JSON.stringify({ ...atual, ...cfg }))
  } catch (e) {
    console.warn('Erro ao salvar configurações de documento em localStorage', e)
  }
}

export function carregarLogoLocal(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.logo)
  } catch {
    return null
  }
}

export function salvarLogoLocal(dataUrl: string): void {
  try {
    localStorage.setItem(STORAGE_KEYS.logo, dataUrl)
  } catch (e) {
    console.warn('Erro ao salvar logo em localStorage', e)
  }
}

export function removerLogoLocal(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.logo)
  } catch (e) {
    console.warn('Erro ao remover logo', e)
  }
}

export function carregarAssinaturaLocal(userId?: string): string | null {
  try {
    // Remove chave global legada compartilhada para evitar vazamentos entre perfis
    try {
      localStorage.removeItem(STORAGE_KEYS.signature)
    } catch {
      // noop
    }

    if (!userId) return null
    return localStorage.getItem(`${STORAGE_KEYS.signature}_${userId}`)
  } catch {
    return null
  }
}

export function salvarAssinaturaLocal(dataUrl: string, userId?: string): void {
  try {
    if (!userId) return
    localStorage.setItem(`${STORAGE_KEYS.signature}_${userId}`, dataUrl)
  } catch (e) {
    console.warn('Erro ao salvar assinatura em localStorage', e)
  }
}

export function removerAssinaturaLocal(userId?: string): void {
  try {
    if (!userId) return
    localStorage.removeItem(`${STORAGE_KEYS.signature}_${userId}`)
  } catch (e) {
    console.warn('Erro ao remover assinatura', e)
  }
}

export function proximoNumeroDoc(tipo: string, prefixo: string = 'ERF', commit: boolean = true): string {
  const ano = new Date().getFullYear()
  const key = `${tipo}_${ano}`
  let counters: Record<string, number> = {}

  try {
    const salvo = localStorage.getItem(STORAGE_KEYS.counters)
    if (salvo) counters = JSON.parse(salvo)
  } catch {
    counters = {}
  }

  const proximo = (counters[key] || 0) + 1

  if (commit) {
    counters[key] = proximo
    try {
      localStorage.setItem(STORAGE_KEYS.counters, JSON.stringify(counters))
    } catch (e) {
      console.warn('Erro ao atualizar contadores', e)
    }
  }

  return `${prefixo}-${String(proximo).padStart(4, '0')}/${ano}`
}

export const CLAUSULAS_PADRAO_CONTRATO: ClausulaContrato[] = [
  {
    id: 'clausula-1',
    titulo: 'CLÁUSULA 1ª – OBJETO, ESCOPO E LIMITES',
    conteudo: '1.1. A CONTRATADA prestará serviços de {objeto}, análise, preparação, ajuizamento e acompanhamento da ação judicial, em primeiro grau, até a sentença, praticando os atos técnicos necessários conforme a procuração e a estratégia profissional.\n\n1.2. Incluem-se: {incluidos}.\n\n1.3. Não se incluem, salvo ajuste escrito e honorários adicionais: {excluidos}.\n\n1.4. A advocacia constitui obrigação de meio, sem promessa de resultado. A CONTRATADA poderá atuar por seu titular, integrantes, associados, correspondentes ou substabelecidos, preservados o sigilo, a supervisão e a responsabilidade profissional.'
  },
  {
    id: 'clausula-2',
    titulo: 'CLÁUSULA 2ª – DEVERES DAS PARTES',
    conteudo: '2.1. A CONTRATADA atuará com independência técnica, zelo e observância da legislação e da ética profissional; informará fatos processuais relevantes; manterá sigilo; e prestará contas de valores que receber, descontando os honorários e despesas autorizados.\n\n2.2. A CONTRATANTE obriga-se a: a) fornecer fatos e documentos completos, verdadeiros e tempestivos; b) cumprir solicitações e prazos; c) comparecer aos atos para os quais for convocada; d) manter contatos e endereço atualizados; e) não omitir fatos, apresentar documento falso, orientar conduta ilegal ou exigir atuação contrária à técnica ou à ética; f) informar em 24 horas qualquer proposta, acordo, pagamento, depósito, recebimento ou contato da parte adversa; e g) pagar pontualmente honorários e despesas.\n\n2.3. A demora, omissão, recusa, ausência ou informação inexata da CONTRATANTE que comprometa prazo, prova ou estratégia excluirá a responsabilidade da CONTRATADA pelos prejuízos diretamente decorrentes dessa conduta.'
  },
  {
    id: 'clausula-3',
    titulo: 'CLÁUSULA 3ª – DESPESAS, CUSTAS E TERCEIROS',
    conteudo: '3.1. Custas, taxas, emolumentos, certidões, cópias, autenticações, deslocamentos, viagens, diligências, depósitos recursais, perícias, assistentes técnicos, cálculos, laudos, correspondentes e demais gastos necessários são de responsabilidade exclusiva da CONTRATANTE e não se confundem com os honorários.\n\n3.2. A CONTRATADA poderá exigir adiantamento. A falta de pagamento autoriza a não prática do ato dependente da despesa, após comunicação, ressalvadas as medidas urgentes sob responsabilidade profissional. A gratuidade judicial não abrange honorários contratuais, êxito ou despesas extraprocessuais.'
  },
  {
    id: 'clausula-4',
    titulo: 'CLÁUSULA 4ª – HONORÁRIOS FIXOS',
    conteudo: '4.1. A CONTRATANTE pagará {honorarios_fixos} ({honorarios_extenso}): {entrada} na assinatura e {parcelas} parcela(s) mensal(is) de {valor_parcela}, vencível(is) todo dia {dia_vencimento}, iniciando-se em {primeiro_vencimento}. A quitação depende da efetiva compensação.\n\n4.2. Para apuração em encerramento antecipado, os honorários fixos correspondem às etapas: 20% pela análise, reunião, documentos e estratégia; 30% pela elaboração e protocolo da inicial e medidas iniciais; 30% pelo contraditório, réplica, prova e instrução; e 20% pela fase final, memoriais e sentença. Etapa iniciada será remunerada proporcionalmente ao trabalho realizado.\n\n4.3. O parcelamento é mera facilidade financeira, não condiciona o início do serviço e não altera a exigibilidade da remuneração pelas etapas efetivamente iniciadas ou concluídas. Valores pagos remuneram trabalho realizado e somente serão restituídos se excederem o montante proporcionalmente devido.'
  },
  {
    id: 'clausula-5',
    titulo: 'CLÁUSULA 5ª – HONORÁRIOS DE ÊXITO E SUCUMBÊNCIA',
    conteudo: '5.1. Além dos honorários fixos, serão devidos honorários de êxito de {percentual_exito}% sobre o benefício econômico bruto obtido, judicial ou extrajudicialmente, por sentença, acordo, pagamento direto, restituição, indenização, compensação, abatimento, remissão, entrega de bem ou vantagem mensurável relacionada aos fatos contratados.\n\n5.2. A base compreende principal, juros, correção e acréscimos, antes de tributos, custas ou despesas. Em pagamento parcelado, o êxito vencerá sobre cada parcela recebida. Em bem ou vantagem não pecuniária, valerá o valor do acordo, decisão, avaliação ou mercado, vencendo em até 5 dias úteis da aquisição.\n\n5.3. A CONTRATANTE autoriza destaque, reserva, retenção, levantamento e desconto dos honorários e despesas de valores recebidos nos autos ou pela CONTRATADA, com prestação de contas e repasse do saldo. Pagamento ou acordo direto deverá ser informado em 24 horas, e o êxito pago em 2 dias úteis.\n\n5.4. Honorários sucumbenciais pertencem exclusivamente aos advogados e não compensam nem reduzem os honorários fixos ou de êxito. Acordo, desistência por satisfação, reconhecimento ou solução que gere benefício econômico mantém a incidência do êxito.'
  },
  {
    id: 'clausula-6',
    titulo: 'CLÁUSULA 6ª – MORA, INADIMPLEMENTO E COBRANÇA',
    conteudo: '6.1. O não pagamento no vencimento constitui mora automática e sujeita o valor vencido a multa de {multa}%, juros de 1% ao mês pro rata die e atualização pelo IPCA, ou índice que o substitua, até o pagamento.\n\n6.2. Atraso superior a 15 dias autoriza notificação por WhatsApp, e-mail, carta ou meio idôneo, com prazo final de 5 dias. Persistindo a mora, a CONTRATADA poderá resolver o contrato por justa causa e renunciar ao mandato, cumprindo o prazo legal de transição.\n\n6.3. Na resolução por inadimplemento tornam-se imediatamente exigíveis: parcelas vencidas; despesas antecipadas; remuneração das etapas iniciadas ou concluídas; êxito já implementado; e demais créditos comprovados. Os valores poderão ser cobrados, protestados e executados, com despesas de cobrança e honorários sucumbenciais fixados judicialmente.'
  },
  {
    id: 'clausula-7',
    titulo: 'CLÁUSULA 7ª – RESOLUÇÃO ANTECIPADA POR CAUSA DA CONTRATANTE',
    conteudo: '7.1. Constituem justa causa, além do inadimplemento: documento ou informação falsa; omissão essencial; recusa reiterada em entregar documentos ou cumprir orientação necessária; falta de custas; exigência de ato ilegal, antiético ou tecnicamente inadequado; ofensa, ameaça, assédio ou grave quebra de confiança; acordo, contato ou recebimento ocultado; ausência injustificada em ato; contratação paralela incompatível; ou qualquer conduta que inviabilize ou comprometa a defesa.\n\n7.2. Verificada a justa causa, a CONTRATADA comunicará o encerramento por escrito e adotará a renúncia ou substituição prevista em lei, mantendo apenas as providências indispensáveis durante o prazo legal. Permanecerão devidos os honorários vencidos, os proporcionais ao trabalho executado, as despesas, o êxito implementado e a sucumbência.'
  },
  {
    id: 'clausula-8',
    titulo: 'CLÁUSULA 8ª – REVOGAÇÃO, RENÚNCIA E ENCERRAMENTO',
    conteudo: '8.1. A CONTRATANTE poderá revogar o mandato e a CONTRATADA poderá renunciar, mediante comunicação formal. Revogação, substituição, desistência, perda do objeto ou encerramento por decisão da CONTRATANTE não afastam os honorários vencidos, despesas e remuneração proporcional aos atos úteis e etapas realizadas, inclusive êxito posterior decorrente da atuação, quando juridicamente cabível.\n\n8.2. Havendo culpa exclusiva comprovada da CONTRATADA que impossibilite o serviço, serão devidos apenas os honorários proporcionais aos atos úteis realizados, sem prejuízo das responsabilidades legais cabíveis.'
  },
  {
    id: 'clausula-9',
    titulo: 'CLÁUSULA 9ª – COMUNICAÇÕES, DOCUMENTOS, DADOS E SIGILO',
    conteudo: '9.1. São válidas as comunicações enviadas aos últimos telefones, WhatsApp e e-mails informados, inclusive avisos de atos, solicitações, cobrança, resolução e ciência de renúncia, quando comprovável o envio ou recebimento. Mensagens fora do horário comercial serão respondidas em prazo razoável, salvo urgência contratada.\n\n9.2. A CONTRATANTE manterá cópia dos documentos originais. Encerrado o contrato, documentos físicos deverão ser retirados em 90 dias; depois poderão ser digitalizados, arquivados ou descartados de modo seguro, respeitados os deveres legais de guarda.\n\n9.3. A CONTRATANTE autoriza o tratamento de dados e documentos para execução do contrato, exercício de direitos, prevenção à fraude, faturamento, cobrança, arquivo e comunicação com autoridades, tribunais, cartórios, peritos e auxiliares. A CONTRATADA manterá sigilo e medidas razoáveis de segurança.'
  },
  {
    id: 'clausula-10',
    titulo: 'CLÁUSULA 10ª – TÍTULO EXECUTIVO, ASSINATURA E FORO',
    conteudo: '10.1. {texto_executivo}\n\n10.2. Tolerância não implica renúncia, novação ou alteração. A invalidade de uma disposição não prejudica as demais. O contrato obriga as partes e sucessores nos limites legais e patrimoniais.\n\n10.3. Fica eleito o foro da {foro}, ressalvada competência legal inderrogável.'
  }
]

export const DEFAULTS_FORM_DOCUMENTO: OpcoesDocumentoForm = {
  data: new Date().toISOString().slice(0, 10),
  cidade: 'Praia Grande',
  uf: 'SP',
  useSignature: false,
  contrato: {
    objeto: 'análise, preparação, ajuizamento e acompanhamento da ação judicial, em primeiro grau, até a sentença',
    incluidos: 'reuniões indispensáveis; análise e organização documental; petição inicial; manifestações ordinárias; réplica; audiência; acompanhamento de perícia judicial; memoriais e acompanhamento até a sentença',
    excluidos: 'recursos e contrarrazões; liquidação, cumprimento ou execução de sentença; ações autônomas ou conexas; reconvenção; incidentes complexos; atuação criminal, administrativa ou extrajudicial distinta; tribunais, STJ ou STF; diligências fora da Comarca; peritos, assistentes, correspondentes e outros profissionais',
    valorFixo: '5.000,00',
    valorExtenso: 'cinco mil reais',
    entrada: '1.000,00',
    parcelas: '4',
    valorParcela: '1.000,00',
    diaVencimento: '02',
    primeiroVencimento: '',
    percentualExito: '30',
    multa: '10',
    foro: 'Comarca de Praia Grande/SP',
    clausulaExtra: '',
    useSignature: false,
    incluirTestemunhas: false,
    testemunha1Nome: '',
    testemunha1Cpf: '',
    testemunha2Nome: '',
    testemunha2Cpf: '',
    clausulas: CLAUSULAS_PADRAO_CONTRATO
  },
  procuracao: {
    receber: true,
    transigir: true,
    hipossuf: true,
    substabelecer: true,
    inss: false,
    receita: false,
    poderesExtras: '',
    finalidadeProc: '',
    useSignature: false
  },
  hipossuficiencia: {
    rendaMensal: '',
    dependentes: '',
    situacao: '',
    hipoExtra: ''
  },
  irpf: {
    exercicios: `${new Date().getFullYear() - 1} e ${new Date().getFullYear()}`,
    finalidade: 'instrução de pedido de gratuidade da justiça'
  },
  recibo: {
    valorRecibo: '1.000,00',
    valorExtenso: 'um mil reais',
    formaPagamento: 'PIX',
    referenciaRecibo: 'prestação de serviços advocatícios',
    parcelaRecibo: '1ª parcela',
    obsRecibo: '',
    useSignature: false
  },
  residencia: {
    destinoResidencia: 'empresa ou órgão solicitante',
    tipoResidencia: 'proprio',
    titularResidencia: '',
    cpfTitular: '',
    vinculoTitular: ''
  }
}

export function carregarPadroesDocumentosLocal(): Partial<OpcoesDocumentoForm> {
  try {
    const salvo = localStorage.getItem(STORAGE_KEYS.padroes)
    if (!salvo) return {}
    return JSON.parse(salvo)
  } catch {
    return {}
  }
}

export function salvarPadraoDocumentoLocal<K extends keyof OpcoesDocumentoForm>(
  chave: K,
  valor: OpcoesDocumentoForm[K]
): void {
  try {
    const atuais = carregarPadroesDocumentosLocal()
    const novos = { ...atuais, [chave]: valor }
    localStorage.setItem(STORAGE_KEYS.padroes, JSON.stringify(novos))
  } catch (e) {
    console.warn('Erro ao salvar padrão de documento em localStorage', e)
  }
}

export function restaurarPadraoDocumentoFabrica(chave?: keyof OpcoesDocumentoForm): void {
  try {
    if (!chave) {
      localStorage.removeItem(STORAGE_KEYS.padroes)
      return
    }
    const atuais = carregarPadroesDocumentosLocal()
    delete atuais[chave]
    localStorage.setItem(STORAGE_KEYS.padroes, JSON.stringify(atuais))
  } catch (e) {
    console.warn('Erro ao restaurar padrão de documento', e)
  }
}
