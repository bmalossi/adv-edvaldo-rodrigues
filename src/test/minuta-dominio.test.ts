import { describe, it, expect } from 'vitest';
import PizZip from 'pizzip';
import {
  prepararVariaveisDocumento,
  validarDadosParaMinuta,
  processarTemplateDocx,
  type TemplateMinuta,
} from '@/domain/crm/minuta';
import type { Cliente } from '@/domain/crm/cliente';
import type { Caso } from '@/domain/crm/caso';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeClienteValidoPF(overrides: Partial<Cliente> = {}): Cliente {
  return {
    id: 'cli-1',
    tipo_pessoa: 'PF',
    nome_razao_social: 'João da Silva',
    cpf_cnpj: '123.456.789-00',
    rg_ie: '12.345.678-9',
    nacionalidade: 'brasileiro',
    estado_civil: 'casado',
    profissao: 'Engenheiro Civil',
    email: 'joao@silva.com',
    telefone_whatsapp: '(11) 98765-4321',
    endereco_logradouro: 'Rua das Flores',
    endereco_numero: '123',
    endereco_bairro: 'Jardins',
    endereco_cidade: 'São Paulo',
    endereco_uf: 'SP',
    endereco_cep: '01234-567',
    status_ciclo: 'ativo',
    visibilidade: 'colegiado',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeCaso(overrides: Partial<Caso> = {}): Caso {
  return {
    id: 'caso-1',
    cliente_id: 'cli-1',
    titulo: 'Ação Revisional de Contrato',
    descricao: 'Revisão de cláusulas abusivas',
    area_direito: 'Direito Bancário',
    tipo_demanda: 'judicial',
    status: 'em_andamento',
    visibilidade: 'colegiado',
    responsavel_id: 'user-1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function criarDocxMinimoComTags(tagsXml: string): Uint8Array {
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
  zip.file(
    'word/document.xml',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
      '<w:body>' +
      tagsXml +
      '</w:body>' +
      '</w:document>'
  );
  return zip.generate({ type: 'uint8array' });
}

// ─── Testes ─────────────────────────────────────────────────────────────────

describe('Motor de Minutas CRM - Domínio', () => {
  describe('prepararVariaveisDocumento', () => {
    it('formata adequadamente variáveis de cliente PF e caso', () => {
      const cliente = makeClienteValidoPF();
      const caso = makeCaso();
      const vars = prepararVariaveisDocumento({
        cliente,
        caso,
        processoNumero: '1002345-67.2026.8.26.0100',
        advogadoNome: 'Dr. Edvaldo Rodrigues Ferreira',
        advogadoOab: 'OAB/SP 123.456',
      });

      expect(vars.nome_cliente).toBe('João da Silva');
      expect(vars.cpf_cnpj).toBe('123.456.789-00');
      expect(vars.nacionalidade).toBe('brasileiro');
      expect(vars.estado_civil).toBe('casado');
      expect(vars.profissao).toBe('Engenheiro Civil');
      expect(vars.titulo_caso).toBe('Ação Revisional de Contrato');
      expect(vars.numero_processo).toBe('1002345-67.2026.8.26.0100');
      expect(vars.advogado_nome).toBe('Dr. Edvaldo Rodrigues Ferreira');
      expect(vars.advogado_oab).toBe('OAB/SP 123.456');
      expect(vars.endereco_completo).toContain('Rua das Flores, 123');
      expect(vars.data_extenso).toBeDefined();
    });

    it('preenche variáveis mesmo sem caso vinculado', () => {
      const cliente = makeClienteValidoPF();
      const vars = prepararVariaveisDocumento({ cliente });

      expect(vars.nome_cliente).toBe('João da Silva');
      expect(vars.titulo_caso).toBe('');
      expect(vars.numero_processo).toBe('');
    });
  });

  describe('validarDadosParaMinuta', () => {
    it('valida com sucesso cliente com qualificação completa para procuração', () => {
      const cliente = makeClienteValidoPF();
      const template: TemplateMinuta = {
        id: 't-proc',
        nome: 'Procuração Ad Judicia',
        categoria: 'procuracao',
        arquivo_url: 'templates/procuracao.docx',
        exige_qualificacao_completa: true,
      };

      const resultado = validarDadosParaMinuta(cliente, template);
      expect(resultado.valido).toBe(true);
      expect(resultado.erros).toHaveLength(0);
    });

    it('rejeita emissão se qualificação civil essencial estiver ausente', () => {
      const clienteIncompleto = makeClienteValidoPF({
        cpf_cnpj: '',
        rg_ie: '',
        nacionalidade: '',
      });
      const template: TemplateMinuta = {
        id: 't-proc',
        nome: 'Procuração Ad Judicia',
        categoria: 'procuracao',
        arquivo_url: 'templates/procuracao.docx',
        exige_qualificacao_completa: true,
      };

      const resultado = validarDadosParaMinuta(clienteIncompleto, template);
      expect(resultado.valido).toBe(false);
      expect(resultado.erros.length).toBeGreaterThan(0);
      expect(resultado.erros).toContain('CPF/CNPJ é obrigatório para emissão de minutas judiciais');
    });
  });

  describe('processarTemplateDocx', () => {
    it('substitui variáveis {nome_cliente} e {cpf_cnpj} e gera buffer .docx íntegro', async () => {
      const templateBuffer = criarDocxMinimoComTags(
        '<w:p><w:r><w:t>OUTORGANTE: {nome_cliente}, CPF: {cpf_cnpj}</w:t></w:r></w:p>'
      );

      const dados = {
        nome_cliente: 'Dr. Fulano de Tal',
        cpf_cnpj: '999.888.777-66',
      };

      const bufferGerado = await processarTemplateDocx(templateBuffer, dados);
      expect(bufferGerado).toBeInstanceOf(Uint8Array);
      expect(bufferGerado.byteLength).toBeGreaterThan(0);

      // Inspeciona se o docx gerado contém o texto substituído
      const zipGerado = new PizZip(bufferGerado);
      const docXml = zipGerado.file('word/document.xml')?.asText();
      expect(docXml).toContain('OUTORGANTE: Dr. Fulano de Tal, CPF: 999.888.777-66');
      expect(docXml).not.toContain('{nome_cliente}');
      expect(docXml).not.toContain('{cpf_cnpj}');
    });
  });

  describe('gerarDocxAPartirDeTexto', () => {
    it('gera buffer .docx a partir de texto puro com tags e título', async () => {
      const { gerarDocxAPartirDeTexto } = await import('@/domain/crm/minuta');
      const texto = 'Pelo presente instrumento, {nome_cliente}, inscrito no CPF {cpf_cnpj}, autoriza o advogado.';
      const dados = {
        nome_cliente: 'Maria Antonieta',
        cpf_cnpj: '111.222.333-44',
      };

      const buffer = await gerarDocxAPartirDeTexto(texto, dados, 'AUTORIZAÇÃO');
      expect(buffer).toBeInstanceOf(Uint8Array);
      expect(buffer.byteLength).toBeGreaterThan(0);

      const zip = new PizZip(buffer);
      const docXml = zip.file('word/document.xml')?.asText();
      expect(docXml).toContain('AUTORIZAÇÃO');
      expect(docXml).toContain('Maria Antonieta');
      expect(docXml).toContain('111.222.333-44');
      expect(docXml).not.toContain('{nome_cliente}');
    });
  });
});

