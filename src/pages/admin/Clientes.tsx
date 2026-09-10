import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Users, Phone, Building2, UserCheck, Eye, ShieldAlert, FileSpreadsheet } from 'lucide-react';
import { supabase, Cliente, StatusCicloCliente } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ModalImportarClientes } from '@/components/admin/ModalImportarClientes';

import { PermissionGuard } from '@/components/admin/PermissionGuard';

const STATUS_CICLO_BADGES: Record<StatusCicloCliente, { label: string; color: string }> = {
  lead: { label: 'Lead / Prospecção', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  consulta: { label: 'Consulta / Reunião', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  ativo: { label: 'Cliente Ativo', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  encerrado: { label: 'Encerrado / Arquivado', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
};

export default function Clientes() {
  const { papel } = useAuth();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('');
  const [filtroTipo, setFiltroTipo] = useState<string>('');
  const [modalImportarOpen, setModalImportarOpen] = useState(false);

  const fetchClientes = async () => {
    setLoading(true);
    let query = supabase
      .from('clientes')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (filtroStatus) {
      query = query.eq('status_ciclo', filtroStatus);
    }
    if (filtroTipo) {
      query = query.eq('tipo_pessoa', filtroTipo);
    }

    const { data, error } = await query;
    if (!error && data) {
      setClientes(data as Cliente[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchClientes();
  }, [filtroStatus, filtroTipo]);

  const clientesFiltrados = clientes.filter((c) => {
    const termo = busca.toLowerCase();
    const nomeOk = c.nome_razao_social.toLowerCase().includes(termo);
    const docOk = c.cpf_cnpj ? c.cpf_cnpj.toLowerCase().includes(termo) : false;
    const telOk = c.telefone_whatsapp ? c.telefone_whatsapp.toLowerCase().includes(termo) : false;
    return nomeOk || docOk || telOk;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-3xl font-bold text-white tracking-tight">Clientes & CRM</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/10 text-slate-300 border border-white/10 uppercase">
              {papel}
            </span>
          </div>
          <p className="text-slate-300 text-sm mt-1">
            Gestão unificada da carteira e prospecções do escritório Dr. Edvaldo Rodrigues Ferreira.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <PermissionGuard modulo="clientes" acao="criar">
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalImportarOpen(true)}
              className="border-white/15 text-slate-200 hover:text-white hover:bg-slate-800 rounded-xl"
            >
              <FileSpreadsheet className="w-4 h-4 mr-2 text-secondary" />
              Importar Planilha
            </Button>
          </PermissionGuard>

          <PermissionGuard modulo="clientes" acao="criar">
            <Button asChild className="bg-cta-gold hover:opacity-90 text-primary font-bold shadow-lg rounded-xl">
              <Link to="/admin/crm/clientes/novo" className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Novo Cliente / Lead
              </Link>
            </Button>
          </PermissionGuard>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-wrap items-center gap-4 bg-card/50 border border-white/10 p-4 rounded-2xl shadow-sm">
        <div className="relative flex-1 min-w-[280px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Pesquisar por nome, CPF/CNPJ ou telefone..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-10 h-10 bg-slate-900/50 border-white/10 text-white placeholder:text-slate-400 focus:border-secondary rounded-xl"
          />
        </div>

        <div className="flex items-center gap-2 sm:ml-auto">
          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            className="h-10 px-3.5 bg-slate-900/50 border border-white/10 text-white text-sm rounded-xl focus:border-secondary cursor-pointer"
          >
            <option value="">Todos os estágios</option>
            <option value="lead">Leads</option>
            <option value="consulta">Em Consulta</option>
            <option value="ativo">Clientes Ativos</option>
            <option value="encerrado">Encerrados</option>
          </select>

          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="h-10 px-3.5 bg-slate-900/50 border border-white/10 text-white text-sm rounded-xl focus:border-secondary cursor-pointer"
          >
            <option value="">PF & PJ</option>
            <option value="PF">Pessoa Física</option>
            <option value="PJ">Pessoa Jurídica</option>
          </select>
        </div>
      </div>

      {/* Listagem em Tabela */}
      <div className="bg-card border border-white/10 rounded-2xl shadow-card overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-slate-400 text-sm font-medium italic animate-pulse">
            Carregando base de clientes...
          </div>
        ) : clientesFiltrados.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400">
              <Users className="w-7 h-7" />
            </div>
            <p className="font-serif text-lg text-white font-medium">Nenhum cliente ou lead encontrado</p>
            <p className="text-slate-400 text-xs max-w-sm">
              Não há registros com os filtros atuais. Cadastre um novo lead para alimentar o CRM.
            </p>
            <Button asChild className="mt-2 bg-cta-gold text-primary font-bold rounded-xl">
              <Link to="/admin/crm/clientes/novo">Cadastrar agora</Link>
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02] text-left text-slate-300 uppercase text-[11px] tracking-wider font-semibold">
                  <th className="px-6 py-4">Cliente / Razão Social</th>
                  <th className="px-6 py-4">Tipo</th>
                  <th className="px-6 py-4">Contato</th>
                  <th className="px-6 py-4">Estágio</th>
                  <th className="px-6 py-4">Visibilidade</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {clientesFiltrados.map((cliente) => (
                  <tr key={cliente.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-white group-hover:text-secondary transition-colors">
                          {cliente.nome_razao_social}
                        </span>
                        <span className="text-slate-400 text-xs font-mono mt-0.5">
                          {cliente.cpf_cnpj || 'Documento não informado'}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-white/10">
                        {cliente.tipo_pessoa === 'PF' ? (
                          <><UserCheck className="w-3 h-3 text-secondary" /> Física</>
                        ) : (
                          <><Building2 className="w-3 h-3 text-secondary" /> Jurídica</>
                        )}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-slate-300 text-xs">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{cliente.telefone_whatsapp}</span>
                      </div>
                      {cliente.email && (
                        <span className="text-[11px] text-slate-500 block truncate max-w-[180px]">
                          {cliente.email}
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={cn(
                          'inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border',
                          STATUS_CICLO_BADGES[cliente.status_ciclo]?.color
                        )}
                      >
                        {STATUS_CICLO_BADGES[cliente.status_ciclo]?.label}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-xs font-medium text-slate-400">
                      {cliente.visibilidade === 'privado' ? (
                        <span className="inline-flex items-center gap-1 text-amber-400/90">
                          <ShieldAlert className="w-3.5 h-3.5" /> Privada
                        </span>
                      ) : (
                        <span className="text-slate-400">Colegiada</span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <Button asChild variant="ghost" size="sm" className="h-8 px-2 text-slate-300 hover:text-white">
                        <Link to={`/admin/crm/clientes/${cliente.id}`}>
                          <Eye className="w-4 h-4 mr-1" />
                          Ficha
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ModalImportarClientes
        open={modalImportarOpen}
        onOpenChange={setModalImportarOpen}
        clientesExistentes={clientes}
        onSuccess={fetchClientes}
      />
    </div>
  );
}
