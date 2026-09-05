import { describe, it, expect } from 'vitest'
import {
  filtrarPrazosNaJanela,
  validarNovaPendencia,
  calcularTempoRestante,
  type PendenciaCRM,
  type TipoPendencia,
  type StatusPendencia,
} from '@/domain/crm/agenda'

// ─── helpers ────────────────────────────────────────────────────────────────

function makePendencia(
  overrides: Partial<PendenciaCRM> = {}
): PendenciaCRM {
  return {
    id: 'p-1',
    tipo: 'tarefa',
    titulo: 'Protocolar petição',
    descricao: null,
    responsavel_id: 'user-1',
    caso_id: null,
    cliente_id: null,
    status: 'pendente',
    data_vencimento: null,
    concluido_em: null,
    concluido_por: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

function horasAPartirDeAgora(horas: number): string {
  const d = new Date()
  d.setHours(d.getHours() + horas)
  return d.toISOString()
}

// ─── filtrarPrazosNaJanela ────────────────────────────────────────────────

describe('filtrarPrazosNaJanela', () => {
  it('inclui prazo_fatal que vence em 30h (dentro da janela de 48h)', () => {
    const prazo = makePendencia({
      tipo: 'prazo_fatal',
      data_vencimento: horasAPartirDeAgora(30),
      status: 'pendente',
    })
    const resultado = filtrarPrazosNaJanela([prazo], 48)
    expect(resultado).toHaveLength(1)
    expect(resultado[0].id).toBe('p-1')
  })

  it('exclui prazo_fatal que vence em 50h (fora da janela de 48h)', () => {
    const prazo = makePendencia({
      tipo: 'prazo_fatal',
      data_vencimento: horasAPartirDeAgora(50),
      status: 'pendente',
    })
    const resultado = filtrarPrazosNaJanela([prazo], 48)
    expect(resultado).toHaveLength(0)
  })

  it('inclui prazo_fatal que vence em 20h (dentro da janela de 24h)', () => {
    const prazo = makePendencia({
      tipo: 'prazo_fatal',
      data_vencimento: horasAPartirDeAgora(20),
      status: 'pendente',
    })
    const resultado = filtrarPrazosNaJanela([prazo], 24)
    expect(resultado).toHaveLength(1)
  })

  it('exclui prazo_fatal já concluído mesmo que dentro da janela de 48h', () => {
    const prazo = makePendencia({
      tipo: 'prazo_fatal',
      data_vencimento: horasAPartirDeAgora(10),
      status: 'concluido',
    })
    const resultado = filtrarPrazosNaJanela([prazo], 48)
    expect(resultado).toHaveLength(0)
  })

  it('exclui tarefa (não é prazo_fatal) mesmo que dentro da janela', () => {
    const tarefa = makePendencia({
      tipo: 'tarefa',
      data_vencimento: horasAPartirDeAgora(10),
      status: 'pendente',
    })
    const resultado = filtrarPrazosNaJanela([tarefa], 48)
    expect(resultado).toHaveLength(0)
  })
})

// ─── validarNovaPendencia ─────────────────────────────────────────────────

describe('validarNovaPendencia', () => {
  it('rejeita prazo_fatal sem data_vencimento', () => {
    const erros = validarNovaPendencia({
      tipo: 'prazo_fatal',
      titulo: 'Prazo para contestação',
      responsavel_id: 'user-1',
      data_vencimento: null,
    })
    expect(erros).toContain('prazo_fatal exige data_vencimento')
  })

  it('aceita tarefa sem data_vencimento', () => {
    const erros = validarNovaPendencia({
      tipo: 'tarefa',
      titulo: 'Ligar para cliente',
      responsavel_id: 'user-1',
      data_vencimento: null,
    })
    expect(erros).toHaveLength(0)
  })

  it('rejeita pendência sem título', () => {
    const erros = validarNovaPendencia({
      tipo: 'tarefa',
      titulo: '',
      responsavel_id: 'user-1',
      data_vencimento: null,
    })
    expect(erros).toContain('título é obrigatório')
  })

  it('rejeita pendência sem responsável', () => {
    const erros = validarNovaPendencia({
      tipo: 'tarefa',
      titulo: 'Tarefa',
      responsavel_id: '',
      data_vencimento: null,
    })
    expect(erros).toContain('responsável é obrigatório')
  })
})

// ─── calcularTempoRestante ───────────────────────────────────────────────

describe('calcularTempoRestante', () => {
  it('retorna horas positivas para prazo futuro', () => {
    const prazo = makePendencia({
      tipo: 'prazo_fatal',
      data_vencimento: horasAPartirDeAgora(36),
    })
    const horas = calcularTempoRestante(prazo)
    expect(horas).toBeGreaterThan(35)
    expect(horas).toBeLessThan(37)
  })

  it('retorna horas negativas para prazo vencido', () => {
    const prazo = makePendencia({
      tipo: 'prazo_fatal',
      data_vencimento: horasAPartirDeAgora(-5),
    })
    const horas = calcularTempoRestante(prazo)
    expect(horas).toBeLessThan(0)
  })

  it('retorna null quando não há data_vencimento', () => {
    const tarefa = makePendencia({ data_vencimento: null })
    const resultado = calcularTempoRestante(tarefa)
    expect(resultado).toBeNull()
  })
})
