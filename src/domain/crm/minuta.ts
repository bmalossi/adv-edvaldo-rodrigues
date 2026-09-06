import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import type { Cliente } from './cliente';
import type { Caso } from './caso';

// ─── Tipos ───────────────────────────────────────────────────────────────────

export type CategoriaTemplate = 'procuracao' | 'contrato' | 'notificacao' | 'declaracao' | 'outro';

export interface TemplateMinuta {
  id: string;
  nome: string;
  descricao?: string | null;
  categoria: CategoriaTemplate;
  arquivo_url: string;
  conteudo_texto?: string | null;
  exige_qualificacao_completa: boolean;
  variaveis_disponiveis?: string[];
  ativo?: boolean;
}

export interface ContextoMinutaInput {
  cliente: Partial<Cliente>;
  caso?: Partial<Caso> | null;
  processoNumero?: string | null;
  advogadoNome?: string | null;
  advogadoOab?: string | null;
  dadosAdicionais?: Record<string, string>;
}

export interface VariaveisMinuta {
  nome_cliente: string;
  tipo_pessoa: string;
  cpf_cnpj: string;
  rg_ie: string;
  nacionalidade: string;
  estado_civil: string;
  profissao: string;
  email: string;
  telefone: string;
  endereco_completo: string;
  endereco_logradouro: string;
  endereco_numero: string;
  endereco_complemento: string;
  endereco_bairro: string;
  endereco_cidade: string;
  endereco_uf: string;
  endereco_cep: string;
  titulo_caso: string;
  area_direito: string;
  tipo_demanda: string;
  numero_processo: string;
  advogado_nome: string;
  advogado_oab: string;
  data_extenso: string;
  dia_atual: string;
  mes_atual: string;
  ano_atual: string;
  [key: string]: string;
}

export interface ValidacaoMinutaResultado {
  valido: boolean;
  erros: string[];
}

// ─── Formatação e Preparação de Dados ────────────────────────────────────────

const MESES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

export function prepararVariaveisDocumento(ctx: ContextoMinutaInput): VariaveisMinuta {
  const c = ctx.cliente || {};
  const caso = ctx.caso || {};
  const agora = new Date();

  const dia = agora.getDate().toString().padStart(2, '0');
  const mes = MESES[agora.getMonth()];
  const ano = agora.getFullYear().toString();
  const cidade = c.endereco_cidade?.trim() || 'São Paulo';
  const dataExtenso = `${cidade}, ${dia} de ${mes} de ${ano}`;

  // Montagem do endereço completo
  const partesEnd: string[] = [];
  if (c.endereco_logradouro) {
    let log = c.endereco_logradouro;
    if (c.endereco_numero) log += `, ${c.endereco_numero}`;
    if (c.endereco_complemento) log += ` - ${c.endereco_complemento}`;
    partesEnd.push(log);
  }
  if (c.endereco_bairro) partesEnd.push(c.endereco_bairro);
  if (c.endereco_cidade && c.endereco_uf) {
    partesEnd.push(`${c.endereco_cidade}/${c.endereco_uf}`);
  } else if (c.endereco_cidade) {
    partesEnd.push(c.endereco_cidade);
  }
  if (c.endereco_cep) partesEnd.push(`CEP: ${c.endereco_cep}`);

  const enderecoCompleto = partesEnd.join(', ') || 'Endereço não informado';

  const base: VariaveisMinuta = {
    nome_cliente: c.nome_razao_social || '',
    tipo_pessoa: c.tipo_pessoa || 'PF',
    cpf_cnpj: c.cpf_cnpj || '',
    rg_ie: c.rg_ie || '',
    nacionalidade: c.nacionalidade || '',
    estado_civil: c.estado_civil || '',
    profissao: c.profissao || '',
    email: c.email || '',
    telefone: c.telefone_whatsapp || '',
    endereco_completo: enderecoCompleto,
    endereco_logradouro: c.endereco_logradouro || '',
    endereco_numero: c.endereco_numero || '',
    endereco_complemento: c.endereco_complemento || '',
    endereco_bairro: c.endereco_bairro || '',
    endereco_cidade: c.endereco_cidade || '',
    endereco_uf: c.endereco_uf || '',
    endereco_cep: c.endereco_cep || '',
    titulo_caso: caso.titulo || '',
    area_direito: caso.area_direito || '',
    tipo_demanda: caso.tipo_demanda || '',
    numero_processo: ctx.processoNumero || '',
    advogado_nome: ctx.advogadoNome || 'Dr. Edvaldo Rodrigues Ferreira',
    advogado_oab: ctx.advogadoOab || 'OAB/SP',
    data_extenso: dataExtenso,
    dia_atual: dia,
    mes_atual: mes,
    ano_atual: ano,
    ...(ctx.dadosAdicionais || {}),
  };

  return base;
}

// ─── Validação Prévia ────────────────────────────────────────────────────────

export function validarDadosParaMinuta(
  cliente: Partial<Cliente>,
  template: TemplateMinuta
): ValidacaoMinutaResultado {
  const erros: string[] = [];

  if (!cliente.nome_razao_social?.trim()) {
    erros.push('Nome ou Razão Social é obrigatório');
  }

  if (template.exige_qualificacao_completa) {
    if (!cliente.cpf_cnpj?.trim()) {
      erros.push('CPF/CNPJ é obrigatório para emissão de minutas judiciais');
    }

    if (cliente.tipo_pessoa === 'PF') {
      if (!cliente.rg_ie?.trim()) {
        erros.push('RG é obrigatório para procuração e minutas de Pessoa Física');
      }
      if (!cliente.nacionalidade?.trim()) {
        erros.push('Nacionalidade é obrigatória');
      }
      if (!cliente.estado_civil?.trim()) {
        erros.push('Estado civil é obrigatório');
      }
      if (!cliente.profissao?.trim()) {
        erros.push('Profissão é obrigatória');
      }
    }

    if (!cliente.endereco_logradouro?.trim() || !cliente.endereco_cidade?.trim()) {
      erros.push('Endereço completo (logradouro e cidade) é obrigatório');
    }
  }

  return {
    valido: erros.length === 0,
    erros,
  };
}

// ─── Processamento Client-Side (Docxtemplater + PizZip) ──────────────────────

/**
 * Preenche dinamicamente as tags {tag} do buffer .docx fornecido com os dados passados.
 * Processado 100% no cliente sem dependência de APIs externas ou envio de dados privados.
 */
export async function processarTemplateDocx(
  templateBuffer: Uint8Array | ArrayBuffer,
  dados: Record<string, any>
): Promise<Uint8Array> {
  const zip = new PizZip(templateBuffer);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  });

  doc.render(dados);

  const out = doc.getZip().generate({
    type: 'uint8array',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });

  return out;
}

/**
 * Converte um texto arbitrário (com quebras de linha e tags {tag}) em um arquivo .docx válido em memória
 * e o renderiza com as variáveis do cliente/caso.
 */
export async function gerarDocxAPartirDeTexto(
  conteudoTexto: string,
  dados: Record<string, any>,
  tituloDocumento?: string
): Promise<Uint8Array> {
  const zip = new PizZip();
  zip.file(
    '[Content_Types].xml',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
      '</Types>'
  );
  zip.file(
    '_rels/.rels',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
      '</Relationships>'
  );

  const linhas = conteudoTexto.split('\n');
  let bodyXml = '';

  if (tituloDocumento) {
    bodyXml += `<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="32"/></w:rPr><w:t>${tituloDocumento}</w:t></w:r></w:p><w:p/>`;
  }

  for (const linha of linhas) {
    const limpa = linha.trim();
    if (!limpa) {
      bodyXml += '<w:p/>';
    } else {
      // Escapa caracteres XML essenciais antes de empacotar em w:t
      const linhaXml = limpa
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      bodyXml += `<w:p><w:r><w:t>${linhaXml}</w:t></w:r></w:p>`;
    }
  }

  zip.file(
    'word/document.xml',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
      '<w:body>' +
      bodyXml +
      '</w:body>' +
      '</w:document>'
  );

  const buffer = zip.generate({ type: 'uint8array' });
  return processarTemplateDocx(buffer, dados);
}
