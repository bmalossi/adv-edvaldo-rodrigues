import { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  AlertCircle,
  CheckCircle2,
  Loader2,
  FileCheck,
  Building2,
  Scale
} from 'lucide-react';
import saveAs from 'file-saver';
import PizZip from 'pizzip';
import { supabase, TemplateMinuta, Cliente, Caso } from '@/lib/supabase';
import {
  prepararVariaveisDocumento,
  validarDadosParaMinuta,
  processarTemplateDocx
} from '@/domain/crm/minuta';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface ModalGerarMinutaProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cliente: Cliente;
  caso?: Caso | null;
  processoNumero?: string | null;
}

/**
 * Cria dinamicamente um buffer .docx padrão caso o arquivo do bucket ainda não tenha sido submetido.
 * Isso garante que a emissão funcione imediatamente no MVP.
 */
function criarTemplatePadraoBuffer(categoria: string, nome: string): Uint8Array {
  const zip = new PizZip();
  zip.file(
    '[Content_Types].xml',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
      '</Types>'
  );
  zip.file(
    '_rels/.rels',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
      '</Relationships>'
  );

  let conteudo = '';
  if (categoria === 'procuracao') {
    conteudo =
      '<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="32"/></w:rPr><w:t>PROCURAÇÃO AD JUDICIA ET EXTRA</w:t></w:r></w:p>' +
      '<w:p/>' +
      '<w:p><w:r><w:rPr><w:b/></w:rPr><w:t>OUTORGANTE: </w:t></w:r><w:r><w:t>{nome_cliente}, {nacionalidade}, {estado_civil}, {profissao}, portador(a) do RG nº {rg_ie} e inscrito(a) no CPF sob o nº {cpf_cnpj}, residente e domiciliado(a) em {endereco_completo}.</w:t></w:r></w:p>' +
      '<w:p/>' +
      '<w:p><w:r><w:rPr><w:b/></w:rPr><w:t>OUTORGADOS: </w:t></w:r><w:r><w:t>{advogado_nome}, advogado inscrito na {advogado_oab}, com escritório profissional nesta comarca.</w:t></w:r></w:p>' +
      '<w:p/>' +
      '<w:p><w:r><w:rPr><w:b/></w:rPr><w:t>PODERES: </w:t></w:r><w:r><w:t>Por este instrumento particular de mandato, o(a) Outorgante confere aos Outorgados amplos poderes para o foro em geral, com a cláusula ad judicia et extra, em qualquer Juízo, Tribunal ou Repartição Pública, especialmente para atuar na defesa de seus direitos relativos a {titulo_caso}, podendo propor as ações competentes, contestar, transigir, firmar compromisso, recorrer e praticar todos os atos necessários ao fiel cumprimento deste mandato.</w:t></w:r></w:p>' +
      '<w:p/>' +
      '<w:p><w:pPr><w:jc w:val="right"/></w:pPr><w:r><w:t>{data_extenso}.</w:t></w:r></w:p>' +
      '<w:p/>' +
      '<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:t>_____________________________________________</w:t></w:r></w:p>' +
      '<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>{nome_cliente}</w:t></w:r></w:p>';
  } else if (categoria === 'declaracao') {
    conteudo =
      '<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="32"/></w:rPr><w:t>DECLARAÇÃO DE HIPOSSUFICIÊNCIA</w:t></w:r></w:p>' +
      '<w:p/>' +
      '<w:p><w:r><w:t>Eu, {nome_cliente}, {nacionalidade}, {estado_civil}, {profissao}, portador(a) do RG nº {rg_ie} e CPF nº {cpf_cnpj}, residente em {endereco_completo}, DECLARO para os devidos fins de direito, sob as penas da lei, que não possuo condições financeiras de arcar com as custas processuais e honorários advocatícios sem prejuízo do meu sustento e de minha família, fazendo jus à concessão da Justiça Gratuita, na forma do art. 98 e seguintes do Código de Processo Civil.</w:t></w:r></w:p>' +
      '<w:p/>' +
      '<w:p><w:pPr><w:jc w:val="right"/></w:pPr><w:r><w:t>{data_extenso}.</w:t></w:r></w:p>' +
      '<w:p/>' +
      '<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:t>_____________________________________________</w:t></w:r></w:p>' +
      '<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>{nome_cliente}</w:t></w:r></w:p>';
  } else {
    conteudo =
      '<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="28"/></w:rPr><w:t>' +
      nome.toUpperCase() +
      '</w:t></w:r></w:p>' +
      '<w:p/>' +
      '<w:p><w:r><w:t>Referente ao cliente: {nome_cliente}, CPF/CNPJ: {cpf_cnpj}.</w:t></w:r></w:p>' +
      '<w:p><w:r><w:t>Endereço: {endereco_completo}.</w:t></w:r></w:p>' +
      '<w:p><w:r><w:t>Assunto: {titulo_caso}. Processo: {numero_processo}.</w:t></w:r></w:p>' +
      '<w:p/>' +
      '<w:p><w:pPr><w:jc w:val="right"/></w:pPr><w:r><w:t>{data_extenso}.</w:t></w:r></w:p>';
  }

  zip.file(
    'word/document.xml',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
      '<w:body>' +
      conteudo +
      '</w:body>' +
      '</w:document>'
  );

  return zip.generate({ type: 'uint8array' });
}

export function ModalGerarMinuta({
  open,
  onOpenChange,
  cliente,
  caso,
  processoNumero,
}: ModalGerarMinutaProps) {
  const [templates, setTemplates] = useState<TemplateMinuta[]>([]);
  const [templateSelecionado, setTemplateSelecionado] = useState<TemplateMinuta | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [errosValidacao, setErrosValidacao] = useState<string[]>([]);

  useEffect(() => {
    if (!open) {
      setTemplateSelecionado(null);
      setErrosValidacao([]);
      return;
    }

    const buscarTemplates = async () => {
      setCarregando(true);
      const { data, error } = await supabase
        .from('templates_minutas')
        .select('*')
        .eq('ativo', true)
        .order('nome');

      if (!error && data && data.length > 0) {
        setTemplates(data);
        setTemplateSelecionado(data[0]);
      } else {
        // Fallback local se a tabela ainda não tiver sido populada
        const fallbacks: TemplateMinuta[] = [
          {
            id: 'local-proc',
            nome: 'Procuração Ad Judicia et Extra',
            descricao: 'Padrão com qualificação civil completa e poderes ad judicia.',
            categoria: 'procuracao',
            arquivo_url: '',
            exige_qualificacao_completa: true,
          },
          {
            id: 'local-dec',
            nome: 'Declaração de Hipossuficiência',
            descricao: 'Requerimento de gratuidade de justiça nos termos do art. 98 do CPC.',
            categoria: 'declaracao',
            arquivo_url: '',
            exige_qualificacao_completa: true,
          },
          {
            id: 'local-contrato',
            nome: 'Contrato de Honorários Advocatícios',
            descricao: 'Instrumento de fixação de honorários e obrigações.',
            categoria: 'contrato',
            arquivo_url: '',
            exige_qualificacao_completa: true,
          },
        ];
        setTemplates(fallbacks);
        setTemplateSelecionado(fallbacks[0]);
      }
      setCarregando(false);
    };

    buscarTemplates();
  }, [open]);

  useEffect(() => {
    if (!templateSelecionado) {
      setErrosValidacao([]);
      return;
    }
    const res = validarDadosParaMinuta(cliente, templateSelecionado);
    setErrosValidacao(res.erros);
  }, [templateSelecionado, cliente]);

  const handleGerar = async () => {
    if (!templateSelecionado) return;

    const validacao = validarDadosParaMinuta(cliente, templateSelecionado);
    if (!validacao.valido) {
      setErrosValidacao(validacao.erros);
      return;
    }

    setGerando(true);
    try {
      // 1. Prepara dados variáveis formatados
      const variaveis = prepararVariaveisDocumento({
        cliente,
        caso,
        processoNumero,
        advogadoNome: 'Dr. Edvaldo Rodrigues Ferreira',
        advogadoOab: 'OAB/SP 123.456',
      });

      let templateBuffer: Uint8Array;

      // 2. Busca o template do Supabase Storage se existir URL, senão usa gerador padrão em memória
      if (templateSelecionado.arquivo_url && templateSelecionado.arquivo_url.startsWith('http')) {
        const res = await fetch(templateSelecionado.arquivo_url);
        const arrayBuf = await res.arrayBuffer();
        templateBuffer = new Uint8Array(arrayBuf);
      } else {
        templateBuffer = criarTemplatePadraoBuffer(
          templateSelecionado.categoria,
          templateSelecionado.nome
        );
      }

      // 3. Processa no cliente via docxtemplater
      const docxFinal = await processarTemplateDocx(templateBuffer, variaveis);

      // 4. Dispara download imediato do .docx
      const blob = new Blob([docxFinal], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      const nomeSanitizado = (cliente.nome_razao_social || 'Cliente')
        .replace(/[^a-zA-Z0-9]/g, '_');
      const nomeDoc = `${templateSelecionado.nome.replace(/\s+/g, '_')}_${nomeSanitizado}.docx`;
      saveAs(blob, nomeDoc);

      onOpenChange(false);
    } catch (err: any) {
      setErrosValidacao([`Erro ao processar template: ${err.message}`]);
    } finally {
      setGerando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-serif">
            <FileText className="w-5 h-5 text-primary" />
            Emissão Client-Side de Minutas (.docx)
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Os dados são mesclados 100% no seu navegador com proteção total de privacidade.
          </DialogDescription>
        </DialogHeader>

        {carregando ? (
          <div className="py-8 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            Carregando modelos de documento...
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* Seleção do Template */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Selecione o Modelo de Minuta
              </label>
              <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTemplateSelecionado(t)}
                    className={`p-3 rounded-lg border text-left flex items-start gap-3 transition-all ${
                      templateSelecionado?.id === t.id
                        ? 'border-primary bg-primary/10 text-foreground'
                        : 'border-border bg-background hover:bg-muted/40 text-muted-foreground'
                    }`}
                  >
                    <FileCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <div className="text-sm font-medium text-foreground">{t.nome}</div>
                      {t.descricao && (
                        <div className="text-xs text-muted-foreground">{t.descricao}</div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Painel de Qualificação / Erros */}
            {errosValidacao.length > 0 ? (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-red-400">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  Qualificação incompleta para este modelo:
                </div>
                <ul className="text-xs text-red-400/90 list-disc list-inside space-y-0.5 pl-1">
                  {errosValidacao.map((e, idx) => (
                    <li key={idx}>{e}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg flex items-center gap-2 text-xs text-green-400">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                Dados do cliente e do caso qualificados com sucesso para emissão.
              </div>
            )}

            {/* Resumo do Destinatário */}
            <div className="p-3 rounded-lg bg-muted/40 border border-border text-xs space-y-1">
              <div className="font-semibold text-foreground">Resumo dos Dados:</div>
              <div className="text-muted-foreground">
                <strong>Cliente:</strong> {cliente.nome_razao_social} ({cliente.cpf_cnpj || 'Sem CPF/CNPJ'})
              </div>
              {caso && (
                <div className="text-muted-foreground">
                  <strong>Caso:</strong> {caso.titulo} ({caso.area_direito})
                </div>
              )}
            </div>

            {/* Botões de Ação */}
            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                disabled={gerando}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                disabled={gerando || errosValidacao.length > 0}
                onClick={handleGerar}
                className="gap-2"
              >
                {gerando ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Gerando .docx...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Gerar e Baixar .docx
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
