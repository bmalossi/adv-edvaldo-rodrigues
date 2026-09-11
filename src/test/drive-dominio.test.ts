import { describe, it, expect } from 'vitest';
import {
  formatarNomePastaCliente,
  formatarNomePastaCaso,
  gerarCaminhoHierarquicoDrive,
  validarNovoDocumentoCaso,
  TIPOS_DOCUMENTO_CASO,
  normalizarNomeComparacao,
  extrairDigitos,
  encontrarMelhorCorrespondenciaCliente,
  type DocumentoCasoInput,
} from '@/domain/crm/drive';

describe('Google Drive Sync & Documentos do Caso - Domínio', () => {
  describe('Formatação de Nomes de Pastas e Hierarquia', () => {
    it('formata adequadamente o nome da pasta do cliente sem caracteres especiais', () => {
      const pasta = formatarNomePastaCliente('João da Silva / Sauro & Cia', 'cli-123456');
      expect(pasta).toBe('Joao da Silva Sauro Cia_cli-123456');
    });

    it('formata o nome da pasta do caso sanitizando barras e pontuações', () => {
      const pasta = formatarNomePastaCaso('Ação Revisional: Banco X / 2026', 'caso-987');
      expect(pasta).toBe('Acao Revisional Banco X 2026_caso-987');
    });

    it('monta o caminho hierárquico /{Cliente}/{Caso}/ corretamente', () => {
      const caminho = gerarCaminhoHierarquicoDrive({
        clienteNome: 'Dr. Edvaldo Rodrigues',
        clienteId: 'c1',
        casoTitulo: 'Execução de Alimentos',
        casoId: 'cs1',
      });

      expect(caminho).toEqual({
        pastaCliente: 'Dr Edvaldo Rodrigues_c1',
        pastaCaso: 'Execucao de Alimentos_cs1',
        caminhoCompleto: 'Dr Edvaldo Rodrigues_c1/Execucao de Alimentos_cs1',
      });
    });
  });

  describe('Validação de Metadados de Documentos do Caso', () => {
    it('valida com sucesso documento probatório preenchido', () => {
      const doc: DocumentoCasoInput = {
        caso_id: 'caso-123',
        nome_arquivo: 'Contrato_Assinado.pdf',
        tipo_documento: 'procuracao_contrato',
        tamanho_bytes: 1048576, // 1MB
        mime_type: 'application/pdf',
      };

      const resultado = validarNovoDocumentoCaso(doc);
      expect(resultado.valido).toBe(true);
      expect(resultado.erros).toHaveLength(0);
    });

    it('rejeita documento sem caso_id ou sem nome do arquivo', () => {
      const doc: DocumentoCasoInput = {
        caso_id: '',
        nome_arquivo: '   ',
        tipo_documento: 'outros',
      };

      const resultado = validarNovoDocumentoCaso(doc);
      expect(resultado.valido).toBe(false);
      expect(resultado.erros).toContain('caso_id é obrigatório');
      expect(resultado.erros).toContain('nome do arquivo é obrigatório');
    });

    it('contém os tipos de documentos jurídicos padronizados', () => {
      expect(TIPOS_DOCUMENTO_CASO).toHaveProperty('procuracao_contrato');
      expect(TIPOS_DOCUMENTO_CASO).toHaveProperty('documento_pessoal');
      expect(TIPOS_DOCUMENTO_CASO).toHaveProperty('prova_documental');
      expect(TIPOS_DOCUMENTO_CASO).toHaveProperty('peca_processual');
      expect(TIPOS_DOCUMENTO_CASO).toHaveProperty('decisao_sentenca');
      expect(TIPOS_DOCUMENTO_CASO).toHaveProperty('outros');
    });
  });

  describe('Google Drive Explorer - Reconhecimento e Matching de Clientes', () => {
    it('normaliza adequadamente nomes removendo títulos e acentos', () => {
      expect(normalizarNomeComparacao('Dr. Ivan Teodoro Damasceno')).toBe('ivan teodoro damasceno');
      expect(normalizarNomeComparacao('Espólio de Maria da Conceição')).toBe('maria da conceicao');
      expect(normalizarNomeComparacao('Sra. Cláudia Álvares - Inventariante')).toBe('claudia alvares');
    });

    it('encontra correspondência perfeita por CPF na pasta do Drive', () => {
      const clientes = [
        { id: 'c1', nome_razao_social: 'Ivan Teodoro', cpf_cnpj: '123.456.789-00' },
        { id: 'c2', nome_razao_social: 'Outro Cliente', cpf_cnpj: '999.888.777-66' },
      ];

      const match = encontrarMelhorCorrespondenciaCliente('IVAN TEODORO (12345678900)', clientes);
      expect(match.clienteId).toBe('c1');
      expect(match.score).toBe(1.0);
    });

    it('encontra correspondência de alta precisão por nome exato normalizado', () => {
      const clientes = [
        { id: 'c1', nome_razao_social: 'Ivan Teodoro Damasceno', cpf_cnpj: null },
        { id: 'c2', nome_razao_social: 'Carlos Eduardo', cpf_cnpj: null },
      ];

      const match = encontrarMelhorCorrespondenciaCliente('IVAN TEODORO DAMASCENO', clientes);
      expect(match.clienteId).toBe('c1');
      expect(match.score).toBeGreaterThanOrEqual(0.95);
    });

    it('encontra correspondência tolerante quando o nome contém títulos ou sufixos', () => {
      const clientes = [
        { id: 'c1', nome_razao_social: 'Ivan Teodoro Damasceno', cpf_cnpj: null },
      ];

      const match = encontrarMelhorCorrespondenciaCliente('Dr. Ivan Teodoro Damasceno - Inventário', clientes);
      expect(match.clienteId).toBe('c1');
      expect(match.score).toBeGreaterThanOrEqual(0.7);
    });

    it('retorna score 0 para pastas de clientes sem correspondência no CRM', () => {
      const clientes = [
        { id: 'c1', nome_razao_social: 'Ivan Teodoro Damasceno', cpf_cnpj: null },
      ];

      const match = encontrarMelhorCorrespondenciaCliente('ROBERTO SILVA DE SOUZA', clientes);
      expect(match.score).toBe(0);
      expect(match.clienteId).toBeUndefined();
    });
  });
});
