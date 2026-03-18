import { useEffect, useState } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase, Advogado } from '@/lib/supabase'

type AuthState = {
    session: Session | null
    user: User | null
    advogado: Advogado | null
    loading: boolean
}

export function useAuth() {
    const [state, setState] = useState<AuthState>({
        session: null,
        user: null,
        advogado: null,
        loading: true,
    })

    useEffect(() => {
        let mounted = true
        let isFetching = false

        // Timeout de segurança: nunca deixa a tela travada no loading por mais de 8s
        const safetyTimeout = setTimeout(() => {
            if (mounted) {
                setState(s => s.loading ? { ...s, loading: false } : s)
            }
        }, 8000)

        const loadProfile = async (session: Session | null) => {
            if (!session?.user) {
                if (mounted) setState({ session: null, user: null, advogado: null, loading: false })
                return
            }

            if (isFetching) return // Evita requisições duplicadas (getSession vs onAuthStateChange)
            isFetching = true

            try {
                const { data, error } = await supabase
                    .from('advogados')
                    .select('*')
                    .eq('user_id', session.user.id)
                    .single()

                if (error && error.code === 'PGRST116') {
                    // Tenta auto-criar
                    const { data: newAdvogado, error: insertError } = await supabase
                        .from('advogados')
                        .insert({
                            user_id: session.user.id,
                            nome: session.user.user_metadata?.nome || session.user.email || 'Advogado',
                            email: session.user.email
                        })
                        .select()
                        .single()

                    if (mounted) setState({ session, user: session.user, advogado: insertError ? null : newAdvogado, loading: false })
                    return
                }

                if (mounted) setState({ session, user: session.user, advogado: data || null, loading: false })
            } catch (err) {
                console.error('[useAuth] Exceção no loadProfile:', err)
                if (mounted) setState({ session, user: session.user, advogado: null, loading: false })
            } finally {
                isFetching = false
            }
        }

        // Inicializa fluxo com catch robusto
        Promise.resolve().then(async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession()
                if (error) throw error
                await loadProfile(session)
            } catch (err) {
                console.error('[useAuth] Erro ao buscar sessão inicial:', err)
                if (mounted) setState(s => ({ ...s, loading: false }))
            }
        })

        // Listener de eventos de autenticação
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            loadProfile(session).catch(err => {
                console.error('[useAuth] Erro no onAuthStateChange:', err)
                if (mounted) setState(s => ({ ...s, loading: false }))
            })
        })

        return () => {
            mounted = false
            clearTimeout(safetyTimeout)
            subscription.unsubscribe()
        }
    }, [])

    const signOut = async () => {
        setState(s => ({ ...s, loading: true }))
        await supabase.auth.signOut()
    }

    return { ...state, signOut }
}
