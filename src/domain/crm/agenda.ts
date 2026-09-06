// ─── Tipos ───────────────────────────────────────────────────────────────────

export type TipoPendencia = 'prazo_fatal' | 'tarefa'

export type StatusPendencia = 'pendente' | 'em_execucao' | 'concluido'

export interface PendenciaCRM {
  id: string
  tipo: TipoPendencia
  titulo: string
  descricao: string | null
  responsavel_id: string
  caso_id: string | null
  cliente_id: string | null
  status: StatusPendencia
  /** ISO-8601 string or null */
  data_vencimento: string | null
  hora?: string | null
  dia_inteiro?: boolean
  local?: string | null
  tags?: string[]
  mostrar_na_agenda?: boolean
  /** ISO-8601 string: when completed */
  concluido_em: string | null
  /** perfil.id of executor */
  concluido_por: string | null
  created_at: string
  updated_at: string
}

// ─── Validação ───────────────────────────────────────────────────────────────

export interface NovaPendenciaInput {
  tipo: TipoPendencia
  titulo: string
  responsavel_id: string
  data_vencimento: string | null
}

/**
 * Validates a new pendência before persisting.
 * Returns an array of human-readable error strings (empty = valid).
 */
export function validarNovaPendencia(input: NovaPendenciaInput): string[] {
  const erros: string[] = []

  if (!input.titulo || input.titulo.trim().length === 0) {
    erros.push('título é obrigatório')
  }

  if (!input.responsavel_id || input.responsavel_id.trim().length === 0) {
    erros.push('responsável é obrigatório')
  }

  if (input.tipo === 'prazo_fatal' && !input.data_vencimento) {
    erros.push('prazo_fatal exige data_vencimento')
  }

  return erros
}

// ─── Filtragem para alertas de lembrete ──────────────────────────────────────

/**
 * Returns only prazo_fatal pendências whose data_vencimento falls within
 * the next `horasAntecedencia` hours AND whose status is not 'concluido'.
 *
 * Used by the scheduled Edge Function to select prazos that need email alerts.
 *
 * @param pendencias - Full list of pendências
 * @param horasAntecedencia - Alert window in hours (24 or 48)
 */
export function filtrarPrazosNaJanela(
  pendencias: PendenciaCRM[],
  horasAntecedencia: 24 | 48
): PendenciaCRM[] {
  const agora = Date.now()
  const limiteMs = horasAntecedencia * 60 * 60 * 1000

  return pendencias.filter((p) => {
    if (p.tipo !== 'prazo_fatal') return false
    if (p.status === 'concluido') return false
    if (!p.data_vencimento) return false

    const vencimento = new Date(p.data_vencimento).getTime()
    const diferenca = vencimento - agora

    // dentro da janela: vence no futuro e antes do limite
    return diferenca > 0 && diferenca <= limiteMs
  })
}

// ─── Tempo restante ───────────────────────────────────────────────────────────

/**
 * Returns the hours remaining until data_vencimento.
 * Negative when overdue. Returns null when there is no data_vencimento.
 */
export function calcularTempoRestante(pendencia: PendenciaCRM): number | null {
  if (!pendencia.data_vencimento) return null

  const agora = Date.now()
  const vencimento = new Date(pendencia.data_vencimento).getTime()
  return (vencimento - agora) / (1000 * 60 * 60)
}
