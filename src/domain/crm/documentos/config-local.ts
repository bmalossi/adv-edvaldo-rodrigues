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
    titulo: 'CLÁUSULA 1ª – OBJETO DO CONTRATO',
    conteudo: '1.1. O presente contrato tem por objeto a {objeto}, compreendendo a prática de todos os atos inerentes ao patrocínio dos interesses da CONTRATANTE, em âmbito consultivo, preventivo, administrativo ou judicial, em primeira instância ou instâncias ordinárias correlatas à contratação.\n\n1.2. Recursos para Tribunais Superiores (STJ e STF), medidas cautelares autônomas, ações rescisórias, mandados de segurança não incidentais e a fase de cumprimento de sentença com impugnação complexa dependerão de aditivo ou contratação específica, caso não expressamente previstos.'
  },
  {
    id: 'clausula-2',
    titulo: 'CLÁUSULA 2ª – OBRIGAÇÕES DA CONTRATADA',
    conteudo: '2.1. A CONTRATADA obriga-se a prestar os serviços profissionais com zelo, técnica, independência e estrita observância ao Código de Ética e Disciplina da OAB e ao Estatuto da Advocacia (Lei nº 8.906/1994).\n\n2.2. A atividade advocatícia é de meio, e não de resultado, não assegurando a CONTRATADA o êxito da demanda, mas comprometendo-se ao emprego da melhor técnica aplicável ao caso.\n\n2.3. A CONTRATADA manterá a CONTRATANTE informada acerca dos principais andamentos processuais e prestará contas ao término da prestação ou sempre que solicitada formalmente.'
  },
  {
    id: 'clausula-3',
    titulo: 'CLÁUSULA 3ª – OBRIGAÇÕES DA CONTRATANTE',
    conteudo: '3.1. A CONTRATANTE compromete-se a fornecer informações verdadeiras, documentos, provas e subsídios indispensáveis à defesa de seus interesses, sob pena de exclusiva responsabilidade pelos prejuízos decorrentes de omissões ou atrasos.\n\n3.2. Correm por conta da CONTRATANTE todas as custas judiciais, despesas com perícias, viagens indispensáveis, certidões, cópias, preparos recursais e demais encargos processuais, ressalvada eventual concessão de gratuidade da justiça.'
  },
  {
    id: 'clausula-4',
    titulo: 'CLÁUSULA 4ª – HONORÁRIOS FIXOS E FORMA DE PAGAMENTO',
    conteudo: '4.1. A CONTRATANTE pagará {honorarios_fixos} ({honorarios_extenso}): {entrada} na assinatura e {parcelas} parcela(s) mensal(is) de {valor_parcela}, vencível(is) todo dia {dia_vencimento}, iniciando-se em {primeiro_vencimento}. A quitação depende da efetiva compensação.\n\n4.2. Pagamentos por boleto ou PIX serão emitidos pela CONTRATADA. A mora incorre em multa de {multa}%, juros de 1% ao mês e correção pelo IPCA/IBGE.'
  },
  {
    id: 'clausula-5',
    titulo: 'CLÁUSULA 5ª – HONORÁRIOS DE ÊXITO E SUCUMBÊNCIA',
    conteudo: '5.1. Sobre o proveito econômico obtido (acordo, condenação ou economia direta), incidirá o percentual de {percentual_exito}%, devido imediatamente após o recebimento, levantamento ou compensação de valores.\n\n5.2. Os honorários de sucumbência arbitrados judicialmente pertencem exclusivamente aos advogados da CONTRATADA, nos termos do art. 23 da Lei nº 8.906/1994, não se compensando com os honorários contratuais ajustados.'
  },
  {
    id: 'clausula-6',
    titulo: 'CLÁUSULA 6ª – INADIMPLEMENTO E MORA',
    conteudo: '6.1. O atraso superior a 30 (trinta) dias no pagamento de qualquer parcela facultará à CONTRATADA a suspensão da prática de atos não urgentes e, persistindo a inadimplência, a rescisão contratual com a cobrança integral do saldo devedor e das perdas decorrentes.'
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
