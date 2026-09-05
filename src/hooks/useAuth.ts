import { useEffect, useState } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase, Advogado, PerfilUsuario, PapelUsuario } from '@/lib/supabase'

type AuthState = {
    session: Session | null
    user: User | null
    advogado: Advogado | null
    perfil: PerfilUsuario | null
    papel: PapelUsuario
    loading: boolean
}

export function useAuth() {
    const [state, setState] = useState<AuthState>({
        session: null,
        user: null,
        advogado: null,
        perfil: null,
        papel: 'advogado',
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
                if (mounted) setState({ session: null, user: null, advogado: null, perfil: null, papel: 'advogado', loading: false })
                return
            }

            if (isFetching) return // Evita requisições duplicadas (getSession vs onAuthStateChange)
            isFetching = true

            try {
                // Tenta carregar perfil da tabela perfis (RBAC CRM)
                let perfilCarregado: PerfilUsuario | null = null
                let papelResolvido: PapelUsuario = 'advogado'

                const { data: perfilData } = await supabase
                    .from('perfis')
                    .select('*')
                    .eq('id', session.user.id)
                    .maybeSingle()

                if (perfilData) {
                    perfilCarregado = perfilData as PerfilUsuario
                    papelResolvido = perfilData.papel || 'advogado'
                }

                // Carrega advogado para compatibilidade com JusTrack
                const { data: advData, error } = await supabase
                    .from('advogados')
                    .select('*')
                    .eq('user_id', session.user.id)
                    .single()

                if (error && error.code === 'PGRST116') {
                    // Tenta auto-criar registro de advogado se inexistente
                    const { data: newAdvogado, error: insertError } = await supabase
                        .from('advogados')
                        .insert({
                            user_id: session.user.id,
                            nome: session.user.user_metadata?.nome || session.user.email || 'Advogado',
                            email: session.user.email
                        })
                        .select()
                        .single()

                    if (mounted) {
                        setState({
                            session,
                            user: session.user,
                            advogado: insertError ? null : newAdvogado,
                            perfil: perfilCarregado,
                            papel: papelResolvido,
                            loading: false
                        })
                    }
                    return
                }

                if (mounted) {
                    setState({
                        session,
                        user: session.user,
                        advogado: advData || null,
                        perfil: perfilCarregado,
                        papel: papelResolvido,
                        loading: false
                    })
                }
            } catch (err) {
                console.error('[useAuth] Exceção no loadProfile:', err)
                if (mounted) setState({ session, user: session.user, advogado: null, perfil: null, papel: 'advogado', loading: false })
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
