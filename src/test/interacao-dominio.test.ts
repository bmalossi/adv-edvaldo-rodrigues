import { describe, it, expect } from 'vitest';
import {
  InteracaoCliente,
  TipoInteracao,
  ordenarInteracoesCronologicamente,
  validarNovaInteracao,
} from '@/domain/crm/interacao';

describe('Domínio de CRM: Timeline de Interações com o Cliente', () => {
  it('valida que uma interação requer autor, descrição e tipo de canal válido', () => {
    const interacaoValida: Partial<InteracaoCliente> = {
      cliente_id: 'cli-123',
      autor_id: 'user-456',
      tipo: 'whatsapp',
      descricao: 'Cliente entrou em contato com dúvida sobre rescisão indireta.',
    };

    const resultado = validarNovaInteracao(interacaoValida);
    expect(resultado.valido).toBe(true);
    expect(resultado.erros).toHaveLength(0);
  });

  it('rejeita interações sem descrição ou com tipo inválido', () => {
    const interacaoInvalida: Partial<InteracaoCliente> = {
      cliente_id: 'cli-123',
      tipo: 'tipo_inexistente' as TipoInteracao,
      descricao: '   ',
    };

    const resultado = validarNovaInteracao(interacaoInvalida);
    expect(resultado.valido).toBe(false);
    expect(resultado.erros).toContain('A descrição da interação não pode estar vazia');
    expect(resultado.erros).toContain('Tipo de canal de interação inválido');
  });

  it('ordena interações da mais recente para a mais antiga (ordem cronológica decrescente)', () => {
    const interacoes: InteracaoCliente[] = [
      {
        id: '1',
        cliente_id: 'cli-1',
        autor_id: 'u1',
        tipo: 'ligacao',
        descricao: 'Primeiro contato telefônico',
        data_interacao: '2026-09-01T10:00:00Z',
        created_at: '2026-09-01T10:00:00Z',
      },
      {
        id: '2',
        cliente_id: 'cli-1',
        autor_id: 'u1',
        tipo: 'reuniao',
        descricao: 'Reunião no escritório com apresentação de documentos',
        data_interacao: '2026-09-05T14:30:00Z',
        created_at: '2026-09-05T14:30:00Z',
      },
      {
        id: '3',
        cliente_id: 'cli-1',
        autor_id: 'u1',
        tipo: 'whatsapp',
        descricao: 'Envio de comprovante de residência por WhatsApp',
        data_interacao: '2026-09-03T09:15:00Z',
        created_at: '2026-09-03T09:15:00Z',
      },
    ];

    const ordenadas = ordenarInteracoesCronologicamente(interacoes);
    expect(ordenadas[0].id).toBe('2'); // 05/09
    expect(ordenadas[1].id).toBe('3'); // 03/09
    expect(ordenadas[2].id).toBe('1'); // 01/09
  });
});
