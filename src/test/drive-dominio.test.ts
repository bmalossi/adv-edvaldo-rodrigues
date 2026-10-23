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
  sanitizarNomeCategoriaDrive,
  encontrarSubpastaPorCategoria,
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

    it('protege contra correspondência indevida de termo único (ex.: pasta ADILSON não casa com ADILSON LUIZ GARCIA JUNIOR)', () => {
      const clientes = [
        { id: 'c1', nome_razao_social: 'ADILSON LUIZ GARCIA JUNIOR', cpf_cnpj: null },
        { id: 'c2', nome_razao_social: 'SILVIA ROCHA XAVIER', cpf_cnpj: null },
      ];

      const matchAdilsonUnico = encontrarMelhorCorrespondenciaCliente('ADILSON', clientes);
      expect(matchAdilsonUnico.score).toBe(0);
      expect(matchAdilsonUnico.clienteId).toBeUndefined();

      const matchSilviaUnica = encontrarMelhorCorrespondenciaCliente('SILVIA', clientes);
      expect(matchSilviaUnica.score).toBe(0);
      expect(matchSilviaUnica.clienteId).toBeUndefined();
    });

    it('faz correspondência exata perfeita e imune a case/acentuação para Jadya Nassa de Abreo e Rita de Cássia', () => {
      const clientes = [
        { id: 'c1', nome_razao_social: 'JADYA NASSA DE ABREO', cpf_cnpj: null },
        { id: 'c2', nome_razao_social: 'RITA DE CÁSSIA CHAGAS DINIZ', cpf_cnpj: null },
        { id: 'c3', nome_razao_social: 'SILVIA ROCHA XAVIER', cpf_cnpj: null },
      ];

      const matchJadya = encontrarMelhorCorrespondenciaCliente('Jadya Nassa de Abreo', clientes);
      expect(matchJadya.clienteId).toBe('c1');
      expect(matchJadya.score).toBe(0.95);

      const matchRita = encontrarMelhorCorrespondenciaCliente('RITA DE CASSIA CHAGAS DINIZ', clientes);
      expect(matchRita.clienteId).toBe('c2');
      expect(matchRita.score).toBe(0.95);

      const matchSilvia = encontrarMelhorCorrespondenciaCliente('SILVIA ROCHA XAVIER', clientes);
      expect(matchSilvia.clienteId).toBe('c3');
      expect(matchSilvia.score).toBe(0.95);
    });
  });

  describe('Categorias e Subpastas do Google Drive', () => {
    it('sanitiza adequadamente nomes de categorias com barras e caracteres especiais', () => {
      expect(sanitizarNomeCategoriaDrive('Família / Sucessões')).toBe('Família & Sucessões');
      expect(sanitizarNomeCategoriaDrive('Civil\\Consumidor')).toBe('Civil & Consumidor');
      expect(sanitizarNomeCategoriaDrive('Direito: Previdenciário*?')).toBe('Direito Previdenciário');
      expect(sanitizarNomeCategoriaDrive('   Trabalhista   ')).toBe('Trabalhista');
      expect(sanitizarNomeCategoriaDrive('')).toBe('Geral');
      expect(sanitizarNomeCategoriaDrive(null)).toBe('Geral');
    });

    it('encontra subpasta de categoria existente de forma case-insensitive e normalizada', () => {
      const pastasExistentes = [
        { id: 'f1', name: 'Criminal' },
        { id: 'f2', name: 'Previdenciário' },
        { id: 'f3', name: 'Família & Sucessões' },
      ];

      expect(encontrarSubpastaPorCategoria(pastasExistentes, 'criminal')).toEqual({ id: 'f1', name: 'Criminal' });
      expect(encontrarSubpastaPorCategoria(pastasExistentes, 'CRIMINAL')).toEqual({ id: 'f1', name: 'Criminal' });
      expect(encontrarSubpastaPorCategoria(pastasExistentes, 'previdenciario')).toEqual({ id: 'f2', name: 'Previdenciário' });
      expect(encontrarSubpastaPorCategoria(pastasExistentes, 'Família / Sucessões')).toEqual({ id: 'f3', name: 'Família & Sucessões' });
      expect(encontrarSubpastaPorCategoria(pastasExistentes, 'Trabalhista')).toBeNull();
    });
  });
});
