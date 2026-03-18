import { NavLink, useNavigate } from 'react-router-dom'
import {
    LayoutDashboard,
    FolderOpen,
    Bell,
    Settings,
    Scale,
    LogOut,
    Menu,
    X,
} from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { BrandLogo } from '@/components/site/BrandLogo'

const navItems = [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/admin/processos', label: 'Processos', icon: FolderOpen },
    { to: '/admin/notificacoes', label: 'Notificações', icon: Bell },
    { to: '/admin/configuracoes', label: 'Configurações', icon: Settings },
]

export function AdminLayout({ children }: { children: React.ReactNode }) {
    const { advogado, signOut } = useAuth()
    const navigate = useNavigate()
    const [sidebarOpen, setSidebarOpen] = useState(false)

    const handleLogout = async () => {
        await signOut()
        navigate('/login')
    }

    const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
        <aside
            className={cn(
                'flex flex-col bg-primary border-r border-white/5 shadow-2xl',
                mobile ? 'w-full h-full' : 'hidden lg:flex w-64 min-h-screen fixed top-0 left-0'
            )}
        >
            {/* Logo */}
            <div className="flex items-center gap-3 px-6 py-8 border-b border-white/5">
                <BrandLogo sizeClassName="h-10" />
            </div>

            {/* Nav */}
            <nav className="flex-1 px-3 py-4 space-y-1">
                {navItems.map(({ to, label, icon: Icon, end }) => (
                    <NavLink
                        key={to}
                        to={to}
                        end={end}
                        onClick={() => setSidebarOpen(false)}
                        className={({ isActive }) =>
                            cn(
                                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                                isActive
                                    ? 'bg-secondary text-primary shadow-lg shadow-secondary/10'
                                    : 'text-slate-200 hover:text-white hover:bg-white/10'
                            )
                        }
                    >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        {label}
                    </NavLink>
                ))}
            </nav>

            {/* Perfil + logout */}
            <div className="px-3 py-5 border-t border-white/5 bg-white/[0.02]">
                <div className="flex items-center gap-3 px-3 py-2 mb-3">
                    <div className="w-9 h-9 rounded-full bg-secondary/10 border border-secondary/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-secondary text-xs font-bold">
                            {advogado?.nome?.charAt(0)?.toUpperCase() ?? 'A'}
                        </span>
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-white text-[13px] font-bold truncate">{advogado?.nome ?? 'Advogado'}</p>
                        <p className="text-slate-300 text-[10px] uppercase tracking-wider truncate font-bold">{advogado?.oab ?? 'OAB Pendente'}</p>
                    </div>
                </div>
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-400/10 transition-all duration-200"
                >
                    <LogOut className="w-3.5 h-3.5" />
                    Encerrar Sessão
                </button>
            </div>
        </aside>
    )

    return (
        <div className="min-h-screen bg-background text-foreground dark">
            {/* Sidebar desktop */}
            <Sidebar />

            {/* Mobile overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-primary/80 backdrop-blur-sm lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Mobile sidebar */}
            {sidebarOpen && (
                <div className="fixed inset-y-0 left-0 z-50 w-72 lg:hidden">
                    <Sidebar mobile />
                </div>
            )}

            {/* Main */}
            <div className="lg:pl-64 flex flex-col min-h-screen">
                {/* Topbar mobile */}
                <header className="lg:hidden flex items-center justify-between px-5 py-4 bg-primary border-b border-white/5 sticky top-0 z-30 shadow-md">
                    <div className="flex items-center gap-2">
                        <BrandLogo sizeClassName="h-8" />
                    </div>
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="p-2 text-slate-300 hover:text-white bg-white/5 rounded-lg transition-colors"
                    >
                        {sidebarOpen ? <X className="size-5" /> : <Menu className="size-5" />}
                    </button>
                </header>

                {/* Conteúdo */}
                <main className="flex-1 px-4 py-6 lg:px-8">
                    {children}
                </main>
            </div>
        </div>
    )
}
