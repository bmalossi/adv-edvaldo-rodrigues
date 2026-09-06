import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
    LayoutDashboard,
    FolderOpen,
    Bell,
    Settings,
    Scale,
    LogOut,
    Menu,
    X,
    FileText,
    PenSquare,
    Users,
    Briefcase,
    Calendar,
    FileCheck,
    ChevronDown,
} from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { BrandLogo } from '@/components/site/BrandLogo'

const crmNavItems = [
    { to: '/admin/crm/funil', label: 'Funil Comercial', icon: LayoutDashboard },
    { to: '/admin/crm/clientes', label: 'Clientes & Leads', icon: Users },
    { to: '/admin/crm/casos', label: 'Dossiê de Casos', icon: Briefcase },
    { to: '/admin/crm/agenda', label: 'Agenda & Prazos', icon: Calendar },
    { to: '/admin/crm/modelos', label: 'Modelos de Minutas', icon: FileCheck },
]

const justrackNavItems = [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/admin/processos', label: 'Processos', icon: FolderOpen },
    { to: '/admin/notificacoes', label: 'Notificações', icon: Bell },
    { to: '/admin/configuracoes', label: 'Configurações', icon: Settings },
]

const artigosNavItems = [
    { to: '/admin/artigos', label: 'Artigos', icon: FileText, end: true },
    { to: '/admin/artigos/novo', label: 'Novo Artigo', icon: PenSquare },
    { to: '/admin/artigos/imagens', label: 'Banco de Imagens', icon: FolderOpen },
]

export function AdminLayout({ children }: { children: React.ReactNode }) {
    const { advogado, signOut } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()
    const [sidebarOpen, setSidebarOpen] = useState(false)

    const handleLogout = async () => {
        await signOut()
        navigate('/login')
    }

    const [openSections, setOpenSections] = useState<{ [key: string]: boolean }>({
        crm: location.pathname.startsWith('/admin/crm'),
        justrack: location.pathname === '/admin' || location.pathname.startsWith('/admin/processos') || location.pathname.startsWith('/admin/notificacoes') || location.pathname.startsWith('/admin/configuracoes'),
        conteudo: location.pathname.startsWith('/admin/artigos'),
    })

    const toggleSection = (section: string) => {
        setOpenSections((prev) => ({
            ...prev,
            [section]: !prev[section],
        }))
    }

    const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
        <aside
            className={cn(
                'flex flex-col bg-primary border-r border-white/5 shadow-2xl',
                mobile ? 'w-full h-full' : 'hidden lg:flex w-64 min-h-screen fixed top-0 left-0'
            )}
        >
            {/* Logo */}
            <div className="flex items-center gap-3 px-5 py-6 border-b border-white/5 overflow-hidden">
                <BrandLogo variant="dark" compact sizeClassName="h-9" />
            </div>

            {/* Nav */}
            <nav className="flex-1 px-3 py-4 space-y-3 overflow-y-auto">
                {/* Seção CRM Jurídico */}
                <div className="rounded-lg bg-white/[0.02] border border-white/[0.04] overflow-hidden">
                    <button
                        type="button"
                        onClick={() => toggleSection('crm')}
                        className="w-full px-3 py-2.5 flex items-center justify-between text-left hover:bg-white/5 transition-colors group"
                    >
                        <div className="flex items-center gap-2">
                            <Scale className="w-4 h-4 text-secondary" />
                            <span className="text-xs font-bold tracking-wider text-secondary uppercase">
                                CRM Jurídico
                            </span>
                            <span className="bg-secondary/20 text-secondary text-[9px] px-1.5 py-0.5 rounded font-semibold">Novo</span>
                        </div>
                        <ChevronDown
                            className={cn(
                                'w-4 h-4 text-slate-400 transition-transform duration-200 group-hover:text-white',
                                openSections.crm && 'transform rotate-180 text-secondary'
                            )}
                        />
                    </button>
                    {openSections.crm && (
                        <div className="px-2 pb-2 pt-1 space-y-1 border-t border-white/[0.04]">
                            {crmNavItems.map(({ to, label, icon: Icon }) => (
                                <NavLink
                                    key={to}
                                    to={to}
                                    onClick={() => setSidebarOpen(false)}
                                    className={({ isActive }) =>
                                        cn(
                                            'flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-all duration-200',
                                            isActive
                                                ? 'bg-secondary text-primary shadow-md shadow-secondary/10 font-bold'
                                                : 'text-slate-300 hover:text-white hover:bg-white/10'
                                        )
                                    }
                                >
                                    <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                                    {label}
                                </NavLink>
                            ))}
                        </div>
                    )}
                </div>

                {/* Seção JusTrack */}
                <div className="rounded-lg bg-white/[0.02] border border-white/[0.04] overflow-hidden">
                    <button
                        type="button"
                        onClick={() => toggleSection('justrack')}
                        className="w-full px-3 py-2.5 flex items-center justify-between text-left hover:bg-white/5 transition-colors group"
                    >
                        <div className="flex items-center gap-2">
                            <FolderOpen className="w-4 h-4 text-slate-300 group-hover:text-white transition-colors" />
                            <span className="text-xs font-bold tracking-wider text-slate-300 uppercase group-hover:text-white transition-colors">
                                JusTrack
                            </span>
                        </div>
                        <ChevronDown
                            className={cn(
                                'w-4 h-4 text-slate-400 transition-transform duration-200 group-hover:text-white',
                                openSections.justrack && 'transform rotate-180 text-secondary'
                            )}
                        />
                    </button>
                    {openSections.justrack && (
                        <div className="px-2 pb-2 pt-1 space-y-1 border-t border-white/[0.04]">
                            {justrackNavItems.map(({ to, label, icon: Icon, end }) => (
                                <NavLink
                                    key={to}
                                    to={to}
                                    end={end}
                                    onClick={() => setSidebarOpen(false)}
                                    className={({ isActive }) =>
                                        cn(
                                            'flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-all duration-200',
                                            isActive
                                                ? 'bg-secondary text-primary shadow-md shadow-secondary/10 font-bold'
                                                : 'text-slate-300 hover:text-white hover:bg-white/10'
                                        )
                                    }
                                >
                                    <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                                    {label}
                                </NavLink>
                            ))}
                        </div>
                    )}
                </div>

                {/* Seção Conteúdo Jurídico */}
                <div className="rounded-lg bg-white/[0.02] border border-white/[0.04] overflow-hidden">
                    <button
                        type="button"
                        onClick={() => toggleSection('conteudo')}
                        className="w-full px-3 py-2.5 flex items-center justify-between text-left hover:bg-white/5 transition-colors group"
                    >
                        <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-secondary" />
                            <span className="text-xs font-bold tracking-wider text-secondary uppercase">
                                Conteúdo Jurídico
                            </span>
                            <span className="bg-secondary/20 text-secondary text-[9px] px-1.5 py-0.5 rounded font-semibold">Blog</span>
                        </div>
                        <ChevronDown
                            className={cn(
                                'w-4 h-4 text-slate-400 transition-transform duration-200 group-hover:text-white',
                                openSections.conteudo && 'transform rotate-180 text-secondary'
                            )}
                        />
                    </button>
                    {openSections.conteudo && (
                        <div className="px-2 pb-2 pt-1 space-y-1 border-t border-white/[0.04]">
                            {artigosNavItems.map(({ to, label, icon: Icon, end }) => (
                                <NavLink
                                    key={to}
                                    to={to}
                                    end={end}
                                    onClick={() => setSidebarOpen(false)}
                                    className={({ isActive }) =>
                                        cn(
                                            'flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-all duration-200',
                                            isActive
                                                ? 'bg-secondary text-primary shadow-md shadow-secondary/10 font-bold'
                                                : 'text-slate-300 hover:text-white hover:bg-white/10'
                                        )
                                    }
                                >
                                    <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                                    {label}
                                </NavLink>
                            ))}
                        </div>
                    )}
                </div>
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
                <header className="lg:hidden flex items-center justify-between px-4 py-3.5 bg-primary border-b border-white/5 sticky top-0 z-30 shadow-md">
                    <div className="flex items-center gap-2 min-w-0 flex-1 mr-2 overflow-hidden">
                        <BrandLogo variant="dark" compact sizeClassName="h-8" />
                    </div>
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="p-2 text-slate-300 hover:text-white bg-white/5 rounded-lg transition-colors shrink-0"
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
