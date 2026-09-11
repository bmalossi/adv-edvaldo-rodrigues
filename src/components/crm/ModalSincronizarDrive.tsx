import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  HardDrive,
  Search,
  CheckCircle2,
  AlertCircle,
  FolderSync,
  UserPlus,
  Link2,
  ExternalLink,
  Loader2,
  Filter,
  Check,
  Folder,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  encontrarMelhorCorrespondenciaCliente,
  ScanClienteFolderMatch,
} from "@/domain/crm/drive";
import {
  escanearProcessosPorAreaDrive,
  vincularPastaClienteCRM,
  cadastrarClienteAPartirDePasta,
} from "@/domain/crm/drive-service";

interface ModalSincronizarDriveProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSincronizacaoConcluida?: () => void;
}

interface ItemSincronizacao {
  folderId: string;
  folderName: string;
  areaName: string;
  webViewLink?: string;
  matchedClienteId?: string;
  matchedClienteNome?: string;
  score: number;
  acaoSugerida: "vincular" | "criar" | "ignorar";
  selecionado: boolean;
}

export function ModalSincronizarDrive({
  open,
  onOpenChange,
  onSincronizacaoConcluida,
}: ModalSincronizarDriveProps) {
  const { user } = useAuth();

  const [rootFolderInput, setRootFolderInput] = useState(() => {
    return localStorage.getItem("erf_drive_root_area_id") || "";
  });

  const [escaneando, setEscaneando] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);
  const [progresso, setProgresso] = useState<{ atual: number; total: number } | null>(null);

  const [itens, setItens] = useState<ItemSincronizacao[]>([]);
  const [filtroArea, setFiltroArea] = useState<string>("todas");
  const [filtroTexto, setFiltroTexto] = useState<string>("");
  const [areasEncontradas, setAreasEncontradas] = useState<string[]>([]);

  // Limpa o ID se o usuário colar um link completo do Google Drive
  const extrairIdPasta = (input: string): string => {
    const trimmed = input.trim();
    if (trimmed.includes("/folders/")) {
      const match = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) return match[1];
    }
    return trimmed;
  };

  const handleEscanear = async () => {
    const idLimpo = extrairIdPasta(rootFolderInput);
    setEscaneando(true);
    setItens([]);
    setAreasEncontradas([]);

    try {
      if (idLimpo) {
        localStorage.setItem("erf_drive_root_area_id", idLimpo);
      }

      // 1. Carrega todos os clientes do CRM para cruzamento
      const { data: clientesDb, error: errDb } = await supabase
        .from("clientes")
        .select("id, nome_razao_social, cpf_cnpj, google_drive_folder_id");

      if (errDb) {
        throw new Error(`Erro ao buscar clientes do CRM: ${errDb.message}`);
      }

      const clientes = clientesDb || [];

      // 2. Chama a Edge Function para escanear Áreas e Pastas de Clientes no Drive
      const scanResult = await escanearProcessosPorAreaDrive(idLimpo || undefined);

      const todasAreas: string[] = [];
      const listaItens: ItemSincronizacao[] = [];

      for (const area of scanResult.areas) {
        if (!todasAreas.includes(area.areaName)) {
          todasAreas.push(area.areaName);
        }

        for (const cf of area.clientFolders) {
          // Verifica se já tem cliente vinculado com essa pasta exata
          const clienteJaVinculado = clientes.find((c) => c.google_drive_folder_id === cf.folderId);

          if (clienteJaVinculado) {
            listaItens.push({
              folderId: cf.folderId,
              folderName: cf.folderName,
              areaName: area.areaName,
              webViewLink: cf.webViewLink,
              matchedClienteId: clienteJaVinculado.id,
              matchedClienteNome: clienteJaVinculado.nome_razao_social,
              score: 1.0,
              acaoSugerida: "ignorar", // já vinculado
              selecionado: false,
            });
            continue;
          }

          // Busca melhor correspondência por nome ou documento
          const match = encontrarMelhorCorrespondenciaCliente(cf.folderName, clientes);

          if (match.score >= 0.7 && match.clienteId) {
            listaItens.push({
              folderId: cf.folderId,
              folderName: cf.folderName,
              areaName: area.areaName,
              webViewLink: cf.webViewLink,
              matchedClienteId: match.clienteId,
              matchedClienteNome: match.clienteNome,
              score: match.score,
              acaoSugerida: "vincular",
              selecionado: true,
            });
          } else {
            listaItens.push({
              folderId: cf.folderId,
              folderName: cf.folderName,
              areaName: area.areaName,
              webViewLink: cf.webViewLink,
              score: 0,
              acaoSugerida: "criar",
              selecionado: true,
            });
          }
        }
      }

      setAreasEncontradas(todasAreas);
      setItens(listaItens);

      toast.success(
        `Varredura concluída! ${listaItens.length} pastas de clientes encontradas em ${todasAreas.length} áreas.`
      );
    } catch (err: any) {
      toast.error(err.message || "Erro ao escanear pastas do Google Drive.");
    } finally {
      setEscaneando(false);
    }
  };

  const alternarSelecaoTodos = (selecionar: boolean) => {
    setItens((prev) =>
      prev.map((it) => (it.acaoSugerida === "ignorar" ? it : { ...it, selecionado: selecionar }))
    );
  };

  const handleExecutarSincronizacao = async () => {
    const selecionados = itens.filter((it) => it.selecionado && it.acaoSugerida !== "ignorar");
    if (selecionados.length === 0) {
      toast.error("Nenhuma pasta selecionada para sincronização.");
      return;
    }

    setSincronizando(true);
    setProgresso({ atual: 0, total: selecionados.length });

    let vinculados = 0;
    let criados = 0;
    let falhas = 0;

    for (let i = 0; i < selecionados.length; i++) {
      const it = selecionados[i];
      setProgresso({ atual: i + 1, total: selecionados.length });

      try {
        if (it.acaoSugerida === "vincular" && it.matchedClienteId) {
          await vincularPastaClienteCRM(it.matchedClienteId, it.folderId);
          vinculados++;
        } else if (it.acaoSugerida === "criar") {
          await cadastrarClienteAPartirDePasta(it.folderName, it.folderId, it.areaName, user?.id);
          criados++;
        }
      } catch (err) {
        console.error("Falha ao sincronizar item:", it, err);
        falhas++;
      }
    }

    setSincronizando(false);
    setProgresso(null);

    toast.success(
      `Sincronização concluída! ${vinculados} cliente(s) vinculado(s), ${criados} novo(s) cadastrado(s).`
    );

    if (onSincronizacaoConcluida) {
      onSincronizacaoConcluida();
    }
    onOpenChange(false);
  };

  // Filtragem dos itens exibidos
  const itensFiltrados = itens.filter((it) => {
    if (filtroArea !== "todas" && it.areaName !== filtroArea) return false;
    if (filtroTexto) {
      const q = filtroTexto.toLowerCase();
      const matchFolder = it.folderName.toLowerCase().includes(q);
      const matchCliente = it.matchedClienteNome?.toLowerCase().includes(q);
      if (!matchFolder && !matchCliente) return false;
    }
    return true;
  });

  const totalSelecionados = itens.filter((it) => it.selecionado && it.acaoSugerida !== "ignorar").length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-white/10 text-slate-100 max-w-4xl max-h-[90vh] flex flex-col p-6">
        <DialogHeader className="pb-3 border-b border-white/10">
          <DialogTitle className="text-lg font-semibold flex items-center gap-2.5 text-white">
            <FolderSync className="w-5 h-5 text-[#C9A961]" />
            Sincronizador de Pastas do Google Drive ("Processos por área")
          </DialogTitle>
          <p className="text-xs text-slate-400">
            Reconheça a estrutura existente de clientes e processos no Google Drive e vincule
            automaticamente ao CRM sem mover arquivos do lugar.
          </p>
        </DialogHeader>

        {/* ─── Etapa 1: Configuração do ID / Link da Raiz ─── */}
        <div className="flex flex-col sm:flex-row gap-3 items-end pt-2">
          <div className="flex-1 w-full">
            <label className="text-xs text-slate-300 block mb-1 font-medium">
              ID ou Link da pasta "Processos por área" no Google Drive:
            </label>
            <Input
              value={rootFolderInput}
              onChange={(e) => setRootFolderInput(e.target.value)}
              placeholder="Cole o ID da pasta ou link completo (ou deixe vazio se configurado no Supabase)"
              className="bg-slate-950 border-white/10 text-xs text-white h-9 font-mono"
            />
          </div>
          <Button
            type="button"
            disabled={escaneando || sincronizando}
            onClick={handleEscanear}
            className="bg-[#C9A961] hover:bg-[#b09352] text-slate-950 font-medium text-xs h-9 gap-1.5 px-4 shrink-0 shadow-sm"
          >
            {escaneando ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Escaneando Drive...
              </>
            ) : (
              <>
                <Search className="w-3.5 h-3.5" />
                Escanear Áreas e Pastas
              </>
            )}
          </Button>
        </div>

        {/* ─── Etapa 2: Resultados da Varredura ─── */}
        {itens.length > 0 && (
          <div className="flex flex-col flex-1 min-h-0 gap-3 mt-4">
            {/* Barra de Filtros e Seleção Rápida */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/40 p-2.5 rounded-lg border border-white/5">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Filtro de Área */}
                <select
                  value={filtroArea}
                  onChange={(e) => setFiltroArea(e.target.value)}
                  className="bg-slate-900 border border-white/10 rounded px-2 py-1 text-xs text-slate-200 outline-none"
                >
                  <option value="todas">Todas as Áreas ({areasEncontradas.length})</option>
                  {areasEncontradas.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>

                {/* Filtro de Busca */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={filtroTexto}
                    onChange={(e) => setFiltroTexto(e.target.value)}
                    placeholder="Filtrar cliente..."
                    className="pl-7 h-7 text-xs bg-slate-900 border-white/10 w-40 text-slate-200"
                  />
                </div>
              </div>

              {/* Botões de Seleção */}
              <div className="flex items-center gap-2 text-xs">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => alternarSelecaoTodos(true)}
                  className="text-slate-300 hover:text-white h-7 text-xs px-2"
                >
                  Marcar Todos
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => alternarSelecaoTodos(false)}
                  className="text-slate-400 hover:text-white h-7 text-xs px-2"
                >
                  Desmarcar Todos
                </Button>
                <span className="text-[#C9A961] font-semibold ml-2">
                  {totalSelecionados} selecionados
                </span>
              </div>
            </div>

            {/* Tabela de Correspondências */}
            <div className="flex-1 overflow-y-auto border border-white/5 rounded-lg bg-slate-950/30 divide-y divide-white/5">
              {itensFiltrados.map((it) => (
                <div
                  key={it.folderId}
                  className={`flex items-center justify-between gap-3 p-3 hover:bg-white/[0.02] transition-colors text-xs ${
                    it.acaoSugerida === "ignorar" ? "opacity-60" : ""
                  }`}
                >
                  {/* Checkbox e Nome da Pasta */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <input
                      type="checkbox"
                      checked={it.selecionado}
                      disabled={it.acaoSugerida === "ignorar"}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setItens((prev) =>
                          prev.map((x) =>
                            x.folderId === it.folderId ? { ...x, selecionado: checked } : x
                          )
                        );
                      }}
                      className="rounded border-white/20 bg-slate-900 text-[#C9A961] focus:ring-[#C9A961] shrink-0"
                    />

                    <div className="w-7 h-7 rounded bg-slate-800/80 flex items-center justify-center text-slate-400 shrink-0">
                      <Folder className="w-4 h-4 text-[#C9A961]" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-200 truncate">{it.folderName}</span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400 border border-white/5">
                          {it.areaName}
                        </span>
                      </div>

                      {/* Status de Correspondência */}
                      <div className="mt-0.5 flex items-center gap-2 text-[11px]">
                        {it.acaoSugerida === "vincular" ? (
                          <span className="text-emerald-400 flex items-center gap-1 font-medium">
                            <Link2 className="w-3 h-3" />
                            Correspondência no CRM: {it.matchedClienteNome}
                          </span>
                        ) : it.acaoSugerida === "criar" ? (
                          <span className="text-amber-400 flex items-center gap-1">
                            <UserPlus className="w-3 h-3" />
                            Novo Cliente (será cadastrado automaticamente)
                          </span>
                        ) : (
                          <span className="text-slate-500 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-slate-500" />
                            Já vinculado anteriormente ({it.matchedClienteNome})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Ação / Seleção de Tipo */}
                  <div className="flex items-center gap-2 shrink-0">
                    {it.acaoSugerida !== "ignorar" && (
                      <select
                        value={it.acaoSugerida}
                        onChange={(e) => {
                          const novaAcao = e.target.value as "vincular" | "criar";
                          setItens((prev) =>
                            prev.map((x) =>
                              x.folderId === it.folderId ? { ...x, acaoSugerida: novaAcao } : x
                            )
                          );
                        }}
                        className="bg-slate-900 border border-white/10 rounded px-2 py-1 text-xs text-slate-300"
                      >
                        {it.matchedClienteId && <option value="vincular">Vincular a Cliente Existente</option>}
                        <option value="criar">Cadastrar como Novo Cliente</option>
                      </select>
                    )}

                    {it.webViewLink && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => window.open(it.webViewLink!, "_blank", "noopener,noreferrer")}
                        className="h-7 w-7 text-slate-400 hover:text-white"
                        title="Abrir no Google Drive"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── Rodapé com Ação de Sincronização ─── */}
        <DialogFooter className="mt-4 pt-3 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-400">
            {progresso && (
              <span className="text-emerald-400 font-medium">
                Sincronizando {progresso.atual} de {progresso.total}...
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={sincronizando}
              onClick={() => onOpenChange(false)}
              className="text-slate-400 hover:text-white text-xs"
            >
              Fechar
            </Button>

            {itens.length > 0 && (
              <Button
                type="button"
                size="sm"
                disabled={sincronizando || totalSelecionados === 0}
                onClick={handleExecutarSincronizacao}
                className="bg-[#C9A961] hover:bg-[#b09352] text-slate-950 font-medium text-xs px-4"
              >
                {sincronizando ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    Sincronizando...
                  </>
                ) : (
                  `Sincronizar ${totalSelecionados} Pastas Selecionadas`
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
