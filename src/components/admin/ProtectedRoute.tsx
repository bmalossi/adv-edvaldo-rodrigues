import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

type Props = {
    children: React.ReactNode
}

export function ProtectedRoute({ children }: Props) {
    const { session, loading } = useAuth()
    const navigate = useNavigate()

    useEffect(() => {
        if (!loading && !session) {
            navigate('/login', { replace: true })
        }
    }, [session, loading, navigate])

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-slate-400 text-sm">Carregando...</span>
                </div>
            </div>
        )
    }

    if (!session) return null

    return <>{children}</>
}
