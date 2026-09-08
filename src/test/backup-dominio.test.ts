import { describe, it, expect } from 'vitest';
import {
  converterClientesParaCSV,
  gerarManifestoBackup,
  gerarNomeArquivoZip,
  validarConfiguracaoDrive,
} from '@/domain/crm/backup';
import type { Cliente } from '@/domain/crm/cliente';

describe('Domínio de Backup do CRM & Google Drive', () => {
  it('gera nome padronizado de arquivo zip para o backup', () => {
    const nome = gerarNomeArquivoZip('completo');
    expect(nome).toMatch(/^backup_edvaldo_adv_completo_\d{4}-\d{2}-\d{2}_\d{2}h\d{2}\.zip$/);
  });

  it('converte clientes com todos os novos campos para CSV compatível com Excel', () => {
    const clientes: Partial<Cliente>[] = [
      {
        id: 'c-1',
        tipo_pessoa: 'PF',
        nome_razao_social: 'José dos Santos',
        cpf_cnpj: '111.222.333-44',
        rg_ie: '12.345.678-9',
        data_nascimento: '1988-04-12',
        sexo: 'Masculino',
        nacionalidade: 'Brasileiro',
        estado_civil: 'Casado',
        profissao: 'Engenheiro',
        pais: 'Brasil',
        telefone_whatsapp: '(11) 98888-7777',
        telefone_secundario: '(11) 3222-1111',
        email: 'jose@santos.com',
        endereco_logradouro: 'Rua das Palmeiras',
        endereco_numero: '450',
        endereco_bairro: 'Centro',
        endereco_cidade: 'Campinas',
        endereco_uf: 'SP',
        endereco_cep: '13010-000',
        tem_representante: true,
        rep_nome: 'Ana Santos',
        rep_cpf_cnpj: '999.888.777-66',
        rep_rg: '11.222.333-4',
        status_ciclo: 'ativo',
        origem_contato: 'Indicação',
        anotacoes_gerais: 'Senha portal GOV.BR anotada',
        created_at: '2026-09-08T10:00:00Z',
      },
    ];

    const csv = converterClientesParaCSV(clientes as Cliente[]);
    expect(csv.startsWith('\uFEFF')).toBe(true); // UTF-8 BOM
    expect(csv).toContain('José dos Santos');
    expect(csv).toContain('111.222.333-44');
    expect(csv).toContain('1988-04-12');
    expect(csv).toContain('Masculino');
    expect(csv).toContain('Ana Santos');
    expect(csv).toContain('Senha portal GOV.BR anotada');
  });

  it('gera manifesto analítico com contagem correta de registros', () => {
    const estatisticas = {
      total_clientes: 15,
      total_casos: 8,
      total_interacoes: 32,
      total_documentos: 40,
    };
    const arquivos = ['dados/clientes.json', 'dados/clientes.csv', 'documentos_clientes/doc1.pdf'];

    const manifesto = gerarManifestoBackup('completo', estatisticas, arquivos);
    expect(manifesto.versao_backup).toBe('1.0');
    expect(manifesto.escopo).toBe('completo');
    expect(manifesto.estatisticas.total_clientes).toBe(15);
    expect(manifesto.estatisticas.total_documentos).toBe(40);
    expect(manifesto.arquivos_incluidos).toHaveLength(3);
  });

  it('valida configurações de integração com Google Drive', () => {
    // Inativo não exige pasta nem webhook
    const inativo = validarConfiguracaoDrive({ ativo: false });
    expect(inativo.valido).toBe(true);

    // Ativo sem dados acusa erro
    const ativoSemDados = validarConfiguracaoDrive({ ativo: true, google_drive_folder_id: '' });
    expect(ativoSemDados.valido).toBe(false);
    expect(ativoSemDados.erros).toContain('Informe o ID da Pasta do Google Drive ou o Webhook de Sincronização');

    // Ativo com Folder ID válido passa
    const ativoValido = validarConfiguracaoDrive({
      ativo: true,
      google_drive_folder_id: '1aB2cD3eF4gH5iJ6kL',
    });
    expect(ativoValido.valido).toBe(true);
  });
});
