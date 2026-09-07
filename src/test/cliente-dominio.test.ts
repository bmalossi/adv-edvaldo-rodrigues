import { describe, it, expect } from 'vitest';
import {
  validarQualificacaoJuridica,
  podeTransicionarCiclo,
  Cliente
} from '@/domain/crm/cliente';

describe('Domínio de CRM: Validação de Qualificação Jurídica e Ciclo de Vida do Cliente', () => {
  it('permite que um lead tenha qualificação jurídica incompleta', () => {
    const leadIncompleto: Partial<Cliente> = {
      tipo_pessoa: 'PF',
      nome_razao_social: 'João da Silva',
      telefone_whatsapp: '(11) 99999-9999',
      status_ciclo: 'lead',
    };

    const resultado = validarQualificacaoJuridica(leadIncompleto, 'lead');
    expect(resultado.valido).toBe(true);
    expect(resultado.erros).toHaveLength(0);
  });

  it('impede a transição para cliente ativo se a qualificação jurídica de Pessoa Física estiver incompleta', () => {
    const leadSemDocumentos: Partial<Cliente> = {
      tipo_pessoa: 'PF',
      nome_razao_social: 'João da Silva',
      telefone_whatsapp: '(11) 99999-9999',
      status_ciclo: 'lead',
    };

    const resultado = podeTransicionarCiclo(leadSemDocumentos, 'ativo');
    expect(resultado.permitido).toBe(false);
    expect(resultado.erros).toContain('CPF é obrigatório para qualificação de Pessoa Física');
    expect(resultado.erros).toContain('Endereço completo é obrigatório para qualificação');
  });

  it('permite a transição para ativo se todos os campos de qualificação civil de Pessoa Física forem fornecidos', () => {
    const clientePFCompleto: Partial<Cliente> = {
      tipo_pessoa: 'PF',
      nome_razao_social: 'Dr. Roberto de Souza',
      cpf_cnpj: '123.456.789-00',
      rg_ie: '12.345.678-9',
      nacionalidade: 'Brasileiro',
      estado_civil: 'Casado',
      profissao: 'Engenheiro Civil',
      telefone_whatsapp: '(11) 98888-7777',
      endereco_logradouro: 'Av. Paulista',
      endereco_numero: '1000',
      endereco_bairro: 'Bela Vista',
      endereco_cidade: 'São Paulo',
      endereco_uf: 'SP',
      endereco_cep: '01310-100',
      status_ciclo: 'lead',
    };

    const resultado = podeTransicionarCiclo(clientePFCompleto, 'ativo');
    expect(resultado.permitido).toBe(true);
    expect(resultado.erros).toHaveLength(0);
  });

  it('valida requisitos específicos para Pessoa Jurídica ao ativar o cliente', () => {
    const clientePJIncompleto: Partial<Cliente> = {
      tipo_pessoa: 'PJ',
      nome_razao_social: 'Empresa XYZ Ltda',
      telefone_whatsapp: '(11) 3333-2222',
    };

    const resultado = podeTransicionarCiclo(clientePJIncompleto, 'ativo');
    expect(resultado.permitido).toBe(false);
    expect(resultado.erros).toContain('CNPJ é obrigatório para qualificação de Pessoa Jurídica');
  });

  it('permite cadastrar novos campos como data de nascimento, sexo, representante e país', () => {
    const clienteCompletoComNovosCampos: Partial<Cliente> = {
      tipo_pessoa: 'PF',
      nome_razao_social: 'Maria Oliveira',
      cpf_cnpj: '321.654.987-11',
      rg_ie: '98.765.432-1',
      nacionalidade: 'Brasileira',
      estado_civil: 'Solteira',
      profissao: 'Arquiteta',
      data_nascimento: '1990-05-15',
      sexo: 'Feminino',
      pais: 'Brasil',
      telefone_whatsapp: '(11) 97777-6666',
      telefone_secundario: '(11) 3222-1111',
      anotacoes_gerais: 'Anotações confidenciais e senhas de portais',
      endereco_logradouro: 'Rua Augusta',
      endereco_numero: '500',
      endereco_cidade: 'São Paulo',
      endereco_uf: 'SP',
      endereco_cep: '01304-000',
      tem_representante: true,
      rep_nome: 'Carlos Oliveira',
      rep_cpf_cnpj: '111.222.333-44',
      rep_rg: '11.222.333-4',
      rep_data_nascimento: '1965-02-20',
      rep_pais: 'Brasil',
      rep_uf: 'SP',
      rep_cidade: 'São Paulo',
      rep_endereco: 'Rua Augusta, 500',
      rep_bairro: 'Consolação',
      rep_cep: '01304-000',
      status_ciclo: 'ativo',
    };

    const resultado = podeTransicionarCiclo(clienteCompletoComNovosCampos, 'ativo');
    expect(resultado.permitido).toBe(true);
    expect(resultado.erros).toHaveLength(0);
    expect(clienteCompletoComNovosCampos.data_nascimento).toBe('1990-05-15');
    expect(clienteCompletoComNovosCampos.tem_representante).toBe(true);
    expect(clienteCompletoComNovosCampos.rep_nome).toBe('Carlos Oliveira');
  });
});
