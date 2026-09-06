import { describe, it, expect } from 'vitest';
import {
  obterDiasDoMes,
  obterDiasDaSemana,
  formatarDataChave,
  agruparPendenciasPorData,
  classificarStatusEvento,
  type DiaCalendario,
} from '@/domain/crm/agenda-calendario';
import type { PendenciaCRM } from '@/domain/crm/agenda';

describe('Agenda Calendário - Domínio', () => {
  describe('obterDiasDoMes', () => {
    it('gera a grade correta para setembro de 2026', () => {
      // Setembro 2026 começa em uma terça-feira (dia 1) e tem 30 dias
      const grade = obterDiasDoMes(2026, 8); // mês 8 = setembro (0-indexed)
      
      expect(grade.length % 7).toBe(0);
      expect(grade.length).toBeGreaterThanOrEqual(35);

      // O dia 1 de setembro de 2026 deve existir e ser terça-feira (diaSemana 2)
      const dia1 = grade.find((d) => d.ano === 2026 && d.mes === 8 && d.dia === 1);
      expect(dia1).toBeDefined();
      expect(dia1?.diaSemana).toBe(2);
      expect(dia1?.pertenceAoMesAtual).toBe(true);

      // O domingo anterior a 1 de setembro deve ser 30 de agosto
      const primeiroDiaGrid = grade[0];
      expect(primeiroDiaGrid.pertenceAoMesAtual).toBe(false);
      expect(primeiroDiaGrid.mes).toBe(7); // Agosto
      expect(primeiroDiaGrid.dia).toBe(30);
    });

    it('identifica corretamente o dia de hoje se estiver no período', () => {
      const hoje = new Date();
      const grade = obterDiasDoMes(hoje.getFullYear(), hoje.getMonth());
      const diaHoje = grade.find((d) => d.eHoje);
      expect(diaHoje).toBeDefined();
      expect(diaHoje?.dia).toBe(hoje.getDate());
    });
  });

  describe('obterDiasDaSemana', () => {
    it('retorna exatamente 7 dias começando no domingo', () => {
      const data = new Date(2026, 8, 6); // 6 de setembro de 2026 (domingo)
      const dias = obterDiasDaSemana(data);
      expect(dias).toHaveLength(7);
      expect(dias[0].diaSemana).toBe(0); // Domingo
      expect(dias[6].diaSemana).toBe(6); // Sábado
      expect(dias[0].dia).toBe(6);
      expect(dias[6].dia).toBe(12);
    });
  });

  describe('formatarDataChave', () => {
    it('formata ano, mês e dia com 2 dígitos', () => {
      expect(formatarDataChave(2026, 8, 6)).toBe('2026-09-06');
      expect(formatarDataChave(2026, 0, 5)).toBe('2026-01-05');
    });
  });

  describe('agruparPendenciasPorData', () => {
    it('agrupa compromissos pela chave da data YYYY-MM-DD', () => {
      const pendencias: Partial<PendenciaCRM>[] = [
        { id: '1', data_vencimento: '2026-09-06T14:30:00.000Z', titulo: 'Audiência' },
        { id: '2', data_vencimento: '2026-09-06T18:00:00.000Z', titulo: 'Prazo Contestação' },
        { id: '3', data_vencimento: '2026-09-07T10:00:00.000Z', titulo: 'Reunião Cliente' },
      ];

      const mapa = agruparPendenciasPorData(pendencias as PendenciaCRM[]);
      expect(mapa['2026-09-06']).toHaveLength(2);
      expect(mapa['2026-09-07']).toHaveLength(1);
      expect(mapa['2026-09-08']).toBeUndefined();
    });
  });

  describe('classificarStatusEvento', () => {
    it('classifica como concluido se status for concluido', () => {
      const p: Partial<PendenciaCRM> = { status: 'concluido', data_vencimento: '2026-09-01T10:00:00Z' };
      expect(classificarStatusEvento(p as PendenciaCRM)).toBe('concluido');
    });

    it('classifica como atrasado se vencimento estiver no passado e não concluído', () => {
      const p: Partial<PendenciaCRM> = { status: 'pendente', data_vencimento: '2020-01-01T10:00:00Z' };
      expect(classificarStatusEvento(p as PendenciaCRM)).toBe('atrasado');
    });

    it('classifica como pendente se estiver no futuro', () => {
      const futuro = new Date(Date.now() + 86400000 * 5).toISOString();
      const p: Partial<PendenciaCRM> = { status: 'pendente', data_vencimento: futuro };
      expect(classificarStatusEvento(p as PendenciaCRM)).toBe('pendente');
    });
  });
});
