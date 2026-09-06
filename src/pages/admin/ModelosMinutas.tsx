import { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Copy,
  Edit2,
  Trash2,
  Upload,
  FileCode,
  Loader2,
  AlertCircle,
  Check,
  FileCheck,
} from 'lucide-react';
import {
  supabase,
  TemplateMinuta,
  CategoriaTemplate,
  CATEGORIAS_TEMPLATE,
  validarNovoTemplate,
  extrairVariaveisDoTexto,
  filtrarTemplatesAtivos,
} from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

// Variáveis disponíveis no sistema para inserção rápida
const VARIAVEIS_DISPONIVEIS: { tag: string; descricao: string }[] = [
  { tag: '{nome_cliente}', descricao: 'Nome completo ou Razão Social' },
  { tag: '{cpf_cnpj}', descricao: 'CPF ou CNPJ formatado' },
  { tag: '{rg_ie}', descricao: 'RG ou Inscrição Estadual' },
  { tag: '{nacionalidade}', descricao: 'Nacionalidade (ex: brasileiro)' },
  { tag: '{estado_civil}', descricao: 'Estado civil (ex: casado)' },
  { tag: '{profissao}', descricao: 'Profissão' },
  { tag: '{email}', descricao: 'E-mail principal' },
  { tag: '{telefone}', descricao: 'Telefone / WhatsApp' },
  { tag: '{endereco_completo}', descricao: 'Endereço completo estruturado' },
  { tag: '{endereco_logradouro}', descricao: 'Logradouro / Rua' },
  { tag: '{endereco_numero}', descricao: 'Número' },
  { tag: '{endereco_complemento}', descricao: 'Complemento' },
  { tag: '{endereco_bairro}', descricao: 'Bairro' },
  { tag: '{endereco_cidade}', descricao: 'Cidade' },
  { tag: '{endereco_uf}', descricao: 'UF / Estado' },
  { tag: '{endereco_cep}', descricao: 'CEP' },
  { tag: '{titulo_caso}', descricao: 'Título ou Ação do Caso' },
  { tag: '{area_direito}', descricao: 'Área do Direito' },
  { tag: '{tipo_demanda}', descricao: 'Tipo (judicial, extrajudicial, etc.)' },
  { tag: '{numero_processo}', descricao: 'Número do processo CNJ' },
  { tag: '{advogado_nome}', descricao: 'Nome do Advogado responsável' },
  { tag: '{advogado_oab}', descricao: 'Número da OAB do Advogado' },
  { tag: '{data_extenso}', descricao: 'Cidade, dia de mês de ano' },
  { tag: '{dia_atual}', descricao: 'Dia do mês (ex: 06)' },
  { tag: '{mes_atual}', descricao: 'Mês por extenso (ex: setembro)' },
  { tag: '{ano_atual}', descricao: 'Ano corrente (ex: 2026)' },
];

export default function ModelosMinutas() {
  const [templates, setTemplates] = useState<TemplateMinuta[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('todos');

  // Modal de criação / edição
  const [modalAberto, setModalAberto] = useState(false);
  const [templateEditando, setTemplateEditando] = useState<TemplateMinuta | null>(null);
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [categoria, setCategoria] = useState<CategoriaTemplate>('procuracao');
  const [exigeQualificacao, setExigeQualificacao] = useState(true);
  const [conteudoTexto, setConteudoTexto] = useState('');
  const [arquivoUpload, setArquivoUpload] = useState<File | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erros, setErros] = useState<string[]>([]);
  const [copiadoTag, setCopiadoTag] = useState<string | null>(null);

  const carregarTemplates = async () => {
    setCarregando(true);
    const { data, error } = await supabase
      .from('templates_minutas')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setTemplates(data);
    }
    setCarregando(false);
  };

  useEffect(() => {
    carregarTemplates();
  }, []);

  const abrirNovo = () => {
    setTemplateEditando(null);
    setNome('');
    setDescricao('');
    setCategoria('procuracao');
    setExigeQualificacao(true);
    setConteudoTexto('');
    setArquivoUpload(null);
    setErros([]);
    setModalAberto(true);
  };

  const abrirEdicao = (tpl: TemplateMinuta) => {
    setTemplateEditando(tpl);
    setNome(tpl.nome);
    setDescricao(tpl.descricao || '');
    setCategoria(tpl.categoria);
    setExigeQualificacao(tpl.exige_qualificacao_completa);
    setConteudoTexto(tpl.conteudo_texto || '');
    setArquivoUpload(null);
    setErros([]);
    setModalAberto(true);
  };

  const copiarTag = (tag: string) => {
    navigator.clipboard.writeText(tag);
    setCopiadoTag(tag);
    setTimeout(() => setCopiadoTag(null), 2000);
  };

  const inserirTagNoTexto = (tag: string) => {
    setConteudoTexto((prev) => prev + (prev.endsWith(' ') || prev.length === 0 ? '' : ' ') + tag);
  };

  const handleSalvar = async () => {
    const validacao = validarNovoTemplate({ nome, categoria });
    if (!validacao.valido) {
      setErros(validacao.erros);
      return;
    }

    setSalvando(true);
    setErros([]);

    try {
      let arquivoUrlFinal = templateEditando ? templateEditando.arquivo_url : '';

      // Upload do arquivo .docx se selecionado
      if (arquivoUpload) {
        const nomeArquivoSanitizado = `${Date.now()}_${arquivoUpload.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        const { error: uploadError } = await supabase.storage
          .from('templates-minutas')
          .upload(nomeArquivoSanitizado, arquivoUpload, {
            contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            upsert: true,
          });

        if (uploadError) {
          throw new Error(`Falha no upload do arquivo .docx: ${uploadError.message}`);
        }

        const { data: publicUrlData } = supabase.storage
          .from('templates-minutas')
          .getPublicUrl(nomeArquivoSanitizado);

        arquivoUrlFinal = publicUrlData.publicUrl;
      }

      const variaveis = extrairVariaveisDoTexto(conteudoTexto);

      const payload = {
        nome: nome.trim(),
        descricao: descricao.trim() || null,
        categoria,
        exige_qualificacao_completa: exigeQualificacao,
        conteudo_texto: conteudoTexto.trim() || null,
        arquivo_url: arquivoUrlFinal,
        variaveis_disponiveis: variaveis,
        updated_at: new Date().toISOString(),
      };

      if (templateEditando) {
        const { error: updateError } = await supabase
          .from('templates_minutas')
          .update(payload)
          .eq('id', templateEditando.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('templates_minutas')
          .insert({
            ...payload,
            ativo: true,
          });

        if (insertError) throw insertError;
      }

      setModalAberto(false);
      await carregarTemplates();
    } catch (err: any) {
      setErros([err.message || 'Erro inesperado ao salvar modelo de minuta']);
    } finally {
      setSalvando(false);
    }
  };

  const alternarAtivo = async (tpl: TemplateMinuta) => {
    const novoStatus = !tpl.ativo;
    const { error } = await supabase
      .from('templates_minutas')
      .update({ ativo: novoStatus, updated_at: new Date().toISOString() })
      .eq('id', tpl.id);

    if (!error) {
      setTemplates((prev) =>
        prev.map((item) => (item.id === tpl.id ? { ...item, ativo: novoStatus } : item))
      );
    }
  };

  const templatesFiltrados = templates.filter((tpl) => {
    const matchBusca =
      tpl.nome.toLowerCase().includes(busca.toLowerCase()) ||
      (tpl.descricao && tpl.descricao.toLowerCase().includes(busca.toLowerCase()));
    const matchCat = categoriaFiltro === 'todos' || tpl.categoria === categoriaFiltro;
    return matchBusca && matchCat;
  });

  return (
    <div className="space-y-6">
      {/* Header da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-serif font-bold text-foreground flex items-center gap-2">
            <FileCode className="w-6 h-6 text-primary" />
            Modelos de Documentos e Minutas
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Gerencie modelos de contratos, procurações e declarações com tags para preenchimento automático.
          </p>
        </div>
        <Button onClick={abrirNovo} className="gap-2">
          <Plus className="w-4 h-4" />
          Novo Modelo
        </Button>
      </div>

      {/* Filtros e Busca */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Buscar por nome ou descrição do modelo..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
          <select
            value={categoriaFiltro}
            onChange={(e) => setCategoriaFiltro(e.target.value)}
            className="text-xs bg-background border border-border rounded-md px-2.5 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="todos">Todas as Categorias</option>
            {CATEGORIAS_TEMPLATE.map((c) => (
              <option key={c.valor} value={c.valor}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabela ou Lista de Templates */}
      {carregando ? (
        <div className="py-16 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          Carregando modelos cadastrados...
        </div>
      ) : templatesFiltrados.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-border rounded-lg p-8">
          <FileText className="w-10 h-10 text-muted-foreground/50 mx-auto mb-2" />
          <p className="text-sm font-medium text-foreground">Nenhum modelo de documento encontrado</p>
          <p className="text-xs text-muted-foreground mt-1">
            Clique em "Novo Modelo" para cadastrar sua primeira minuta personalizada.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templatesFiltrados.map((tpl) => (
            <div
              key={tpl.id}
              className={`border rounded-xl p-4 bg-card flex flex-col justify-between transition-all ${
                tpl.ativo ? 'border-border' : 'border-border/50 opacity-60 bg-muted/20'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary">
                    {CATEGORIAS_TEMPLATE.find((c) => c.valor === tpl.categoria)?.label || tpl.categoria}
                  </span>
                  <button
                    onClick={() => alternarAtivo(tpl)}
                    className="text-xs flex items-center gap-1 transition-colors"
                    title={tpl.ativo ? 'Clique para desativar' : 'Clique para ativar'}
                  >
                    {tpl.ativo ? (
                      <span className="flex items-center gap-1 text-green-400 text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Ativo
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-muted-foreground text-[11px]">
                        <XCircle className="w-3.5 h-3.5" /> Inativo
                      </span>
                    )}
                  </button>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-foreground line-clamp-1">{tpl.nome}</h3>
                  {tpl.descricao && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{tpl.descricao}</p>
                  )}
                </div>

                <div className="text-[11px] text-muted-foreground/80 space-y-1 pt-1">
                  <div>
                    <strong>Tipo:</strong>{' '}
                    {tpl.conteudo_texto ? 'Texto com Tags' : tpl.arquivo_url ? 'Arquivo .DOCX' : 'Padrão do Sistema'}
                  </div>
                  {tpl.exige_qualificacao_completa && (
                    <div className="text-amber-400 text-[10px] font-medium">
                      Exige qualificação civil completa
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 mt-2 border-t border-border/50">
                <Button variant="outline" size="sm" onClick={() => abrirEdicao(tpl)} className="text-xs gap-1.5">
                  <Edit2 className="w-3.5 h-3.5" />
                  Editar
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Criação / Edição */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-serif">
              <FileCode className="w-5 h-5 text-primary" />
              {templateEditando ? 'Editar Modelo de Minuta' : 'Novo Modelo de Minuta'}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Configure as informações e o conteúdo da minuta para preenchimento com dados do CRM.
            </DialogDescription>
          </DialogHeader>

          {erros.length > 0 && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-red-400">
                <AlertCircle className="w-4 h-4 shrink-0" />
                Por favor, corrija os erros abaixo:
              </div>
              <ul className="text-xs text-red-400 list-disc list-inside">
                {erros.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-4 py-2">
            {/* Linha 1: Nome e Categoria */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Nome do Modelo *</label>
                <Input
                  placeholder="Ex: Contrato de Honorários para Ação Cível"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Categoria *</label>
                <select
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value as CategoriaTemplate)}
                  className="w-full text-xs bg-background border border-border rounded-md px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {CATEGORIAS_TEMPLATE.map((c) => (
                    <option key={c.valor} value={c.valor}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Descrição */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Descrição / Finalidade</label>
              <Input
                placeholder="Breve descrição sobre a finalidade deste documento..."
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                className="text-xs"
              />
            </div>

            {/* Checkbox Qualificação */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="exigeQualif"
                checked={exigeQualificacao}
                onChange={(e) => setExigeQualificacao(e.target.checked)}
                className="rounded border-border text-primary focus:ring-primary h-4 w-4"
              />
              <label htmlFor="exigeQualif" className="text-xs text-foreground cursor-pointer">
                Exigir qualificação civil completa do cliente (CPF, RG, Estado Civil, Profissão e Endereço)
              </label>
            </div>

            {/* Upload opcional de arquivo .docx */}
            <div className="border border-dashed border-border rounded-lg p-3 bg-muted/20 space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-primary" />
                Upload de Arquivo Modelo (.docx) - Opcional
              </label>
              <p className="text-[11px] text-muted-foreground">
                Se você já tiver um arquivo Word (.docx) pronto com as tags como {'{nome_cliente}'}, envie aqui.
              </p>
              <input
                type="file"
                accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setArquivoUpload(e.target.files[0]);
                  }
                }}
                className="text-xs file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-primary/20 file:text-primary hover:file:bg-primary/30"
              />
              {arquivoUpload && (
                <p className="text-[11px] text-green-400">Arquivo selecionado: {arquivoUpload.name}</p>
              )}
            </div>

            {/* Editor de Texto do Modelo */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground">
                  Redação / Corpo do Documento (com tags dinâmicas)
                </label>
              </div>
              <textarea
                rows={8}
                value={conteudoTexto}
                onChange={(e) => setConteudoTexto(e.target.value)}
                placeholder="Exemplo:
Por este instrumento particular de procuração, o OUTORGANTE {nome_cliente}, inscrito no CPF sob nº {cpf_cnpj}, residente em {endereco_completo}, nomeia e constitui seu procurador o {advogado_nome}, OAB {advogado_oab}...
{data_extenso}."
                className="w-full text-xs font-mono bg-muted/20 border border-border rounded-md p-3 text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-y"
              />
            </div>

            {/* Tabela de Variáveis Disponíveis com inserção rápida */}
            <div className="border border-border rounded-lg p-3 bg-card space-y-2">
              <div className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>Variáveis Disponíveis para Preenchimento Automático</span>
                <span className="text-[10px] text-muted-foreground">Clique para copiar ou inserir</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-40 overflow-y-auto pr-1">
                {VARIAVEIS_DISPONIVEIS.map((v) => (
                  <button
                    key={v.tag}
                    type="button"
                    onClick={() => {
                      copiarTag(v.tag);
                      inserirTagNoTexto(v.tag);
                    }}
                    className="text-left p-1.5 rounded border border-border/60 bg-muted/30 hover:bg-primary/10 hover:border-primary/50 transition-colors flex items-center justify-between group"
                  >
                    <div className="min-w-0">
                      <span className="text-[11px] font-mono font-medium text-primary block truncate">
                        {v.tag}
                      </span>
                      <span className="text-[9px] text-muted-foreground block truncate">
                        {v.descricao}
                      </span>
                    </div>
                    {copiadoTag === v.tag ? (
                      <Check className="w-3 h-3 text-green-400 shrink-0 ml-1" />
                    ) : (
                      <Copy className="w-3 h-3 text-muted-foreground group-hover:text-primary shrink-0 ml-1 opacity-60 group-hover:opacity-100" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button variant="outline" size="sm" onClick={() => setModalAberto(false)} disabled={salvando}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSalvar} disabled={salvando} className="gap-2">
              {salvando ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Modelo'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
