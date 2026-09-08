import { supabase } from '@/lib/supabase'

export interface UploadResult {
  url: string | null
  error: string | null
  requiresFallback?: boolean
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5MB

/**
 * Realiza upload de imagem para o Cloudflare R2 através de URL assinada emitida pela Edge Function
 */
export async function uploadArticleImage(file: File): Promise<UploadResult> {
  // 1. Validação de formato
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      url: null,
      error: 'Formato inválido. Selecione uma imagem nos formatos JPEG, PNG ou WebP.',
    }
  }

  // 2. Validação de tamanho
  if (file.size > MAX_SIZE_BYTES) {
    return {
      url: null,
      error: 'Tamanho excedido. O arquivo de imagem deve ter no máximo 5MB.',
    }
  }

  try {
    // 3. Obter token JWT de autenticação
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return {
        url: null,
        error: 'Sessão expirada. Faça login novamente para realizar o upload.',
      }
    }

    // 4. Invocar a Edge Function generate-upload-url
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-upload-url`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type,
        }),
      }
    )

    const data = await response.json()

    if (!response.ok) {
      const isR2NotConfigured =
        data.error === 'R2_SECRETS_NOT_CONFIGURED' ||
        response.status === 503

      return {
        url: null,
        error:
          data.message ||
          'Não foi possível gerar a URL de upload para o armazenamento.',
        requiresFallback: isR2NotConfigured,
      }
    }

    // 5. Enviar arquivo diretamente para o R2 via PUT assinado
    const uploadRes = await fetch(data.uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type,
      },
      body: file,
    })

    if (!uploadRes.ok) {
      const errorText = await uploadRes.text().catch(() => '')
      console.error('Erro de upload no R2:', uploadRes.status, errorText)
      return {
        url: null,
        error: `Falha na transferência do arquivo para o bucket (${uploadRes.status}). ${errorText}`,
      }
    }

    // 6. Registra no banco de imagens para reuso posterior (não bloqueia caso a tabela ainda não exista)
    try {
      await supabase.from('article_images').upsert(
        {
          url: data.publicUrl,
          file_name: file.name,
          content_type: file.type,
          file_size: file.size,
        },
        { onConflict: 'url' }
      )
    } catch (dbErr) {
      console.warn('[upload] Não foi possível catalogar em article_images:', dbErr)
    }

    return {
      url: data.publicUrl,
      error: null,
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return {
      url: null,
      error: `Erro ao conectar ao serviço de upload: ${message}`,
      requiresFallback: true,
    }
  }
}
