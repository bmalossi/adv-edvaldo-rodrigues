import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { LabelTooltip } from "@/components/calculadora/LabelTooltip";
import { calcularRescisaoCLT, type DadosCalculoCLT, type ResultadoCLT, type MotivoRescisao, type TipoAviso } from "@/lib/calculadora/clt";
import { DateInput } from "@/components/calculadora/DateInput";
import { CurrencyInput } from "@/components/calculadora/CurrencyInput";
import { PhoneInput } from "@/components/calculadora/PhoneInput";
import { ArrowLeft, ArrowRight, Calculator, FileText, Info, Loader2, MessageCircle, Printer, RotateCcw, User } from "lucide-react";
import { site } from "@/config/site";
import { toast } from "sonner";

const WEBHOOK_URL = "https://webhook.automab.dev/webhook/calculadora/notificacao";

const MOTIVO_LABELS: Record<MotivoRescisao, string> = {
    sem_justa_causa: "Dispensa SEM Justa Causa",
    pedido_demissao: "Pedido de Demissão",
    justa_causa: "Dispensa COM Justa Causa",
    acordo: "Rescisão por Acordo (Reforma)",
    rescisao_indireta: "Rescisão Indireta",
    termino_contrato: "Término de Contrato de Experiência",
    antecipado_empregador: "Fim Antecipado pelo Empregador (Exp.)",
    antecipado_empregado: "Fim Antecipado pelo Empregado (Exp.)",
};

const AVISO_LABELS: Record<TipoAviso, string> = {
    indenizado: "Indenizado",
    trabalhado: "Trabalhado",
    dispensado: "Dispensado do Cumprimento",
    descontado: "Descontado",
};

export function CalculadoraCLT() {
    const [step, setStep] = useState(1);
    const [dados, setDados] = useState<DadosCalculoCLT>({
        dataAdmissao: "",
        dataDesligamento: "",
        salarioBase: 0,
        verbasFixas: 0,
        mediaHorasExtras: 0,
        mediaVariavel: 0,
        motivoRescisao: "sem_justa_causa",
        tipoAviso: "indenizado",
        dataTerminoContrato: "",
        feriasVencidas: 0,
        feriasEmDobro: false,
        saldoFGTS: null,
        fgtsRegular: true,
        dependentes: 0,
        calcularDescontos: true,
        conv132Ferias: false,
        conv132Decimo: false,
    });

    const [contato, setContato] = useState({ nome: "", whatsapp: "" });
    const [enviando, setEnviando] = useState(false);
    const [resultado, setResultado] = useState<ResultadoCLT | null>(null);



    const handleSubmitContato = async () => {
        if (!contato.nome.trim()) {
            toast.error("Por favor, informe seu nome completo.");
            return;
        }
        if (contato.whatsapp.length < 10) {
            toast.error("Informe um número de WhatsApp válido.");
            return;
        }

        const res = calcularRescisaoCLT(dados);

        const fmtDate = (d: string) => d.split("-").reverse().join("/");

        // Formatar mensagem estruturada para o advogado
        const resumoMensagem = [
            "👤 *Dados do Cliente*",
            `Nome: ${contato.nome}`,
            `WhatsApp: ${contato.whatsapp}\n`,
            "📅 *Dados do Contrato*",
            `Admissão: ${fmtDate(dados.dataAdmissao)}`,
            `Desligamento: ${fmtDate(dados.dataDesligamento)}`,
            `Motivo: ${MOTIVO_LABELS[dados.motivoRescisao]}`,
            `Aviso Prévio: ${AVISO_LABELS[dados.tipoAviso]}`,
            `Salário Base: ${fmt(dados.salarioBase)}\n`,
            "📄 *Resumo de Cálculo (CLT)*",
            ...res.itens.map(i => {
                const emoji = i.tipo === "+" ? "➕" : "➖";
                const prefix = i.tipo === "−" || i.tipo === "-" ? "- " : "";
                return `${emoji} *${i.nome}*\nValor: ${prefix}${fmt(i.valor)}\nFórmula: ${i.formula}\n`;
            }),
            `💰 *Líquido a Receber: ${fmt(res.totalLiquido)}*`
        ].join("\n");

        setEnviando(true);
        try {
            await fetch(WEBHOOK_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    nome: contato.nome,
                    whatsapp: contato.whatsapp,
                    tipo: "CLT",
                    resumo: resumoMensagem,
                    dados: {
                        dataAdmissao: dados.dataAdmissao,
                        dataDesligamento: dados.dataDesligamento,
                        salarioBase: dados.salarioBase,
                        verbasFixas: dados.verbasFixas,
                        mediaHorasExtras: dados.mediaHorasExtras,
                        mediaVariavel: dados.mediaVariavel,
                        motivoRescisao: dados.motivoRescisao,
                        tipoAviso: dados.tipoAviso,
                        feriasVencidas: dados.feriasVencidas,
                        dependentes: dados.dependentes,
                    },
                    resultado: {
                        totalBruto: res.totalBruto,
                        totalDescontos: res.totalDescontos,
                        totalLiquido: res.totalLiquido,
                        fgtsRescisao: res.fgtsRescisao,
                        multaFGTS: res.multaFGTS,
                        saldoFGTSTotal: res.saldoFGTSTotal,
                        itens: res.itens.map(i => ({
                            nome: i.nome,
                            valor: i.valor,
                            tipo: i.tipo,
                            formula: i.formula
                        }))
                    }
                }),
            });
        } catch {
            console.warn("[Webhook] Falha ao enviar dados de contato.");
        }

        setEnviando(false);
        setResultado(res);
        setStep(5);
    };

    const resetParams = () => {
        setResultado(null);
        setContato({ nome: "", whatsapp: "" });
        setStep(1);
    };

    const fmt = (v: number) => `R$ ${v.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;

    const hasAviso = ["sem_justa_causa", "pedido_demissao", "acordo", "rescisao_indireta"].includes(dados.motivoRescisao);
    const isPrazo = ["termino_contrato", "antecipado_empregado", "antecipado_empregador"].includes(dados.motivoRescisao);

    const stepLabels = ["1. Contrato", "2. Remuneração", "3. Férias e Descontos", "4. Contato", "5. Relatório"];

    return (
        <div className="mx-auto w-full max-w-4xl rounded-xl border border-border bg-card shadow-sm">
            {/* Progress Bar */}
            <div className="flex flex-wrap border-b border-border bg-muted/40 print:hidden">
                {stepLabels.map((label, idx) => (
                    <div
                        key={idx}
                        className={`flex-1 px-2 py-3 text-center text-xs sm:text-sm font-medium transition-colors ${step >= idx + 1 ? "border-b-2 border-primary text-primary" : "text-muted-foreground"
                            }`}
                    >
                        {label}
                    </div>
                ))}
            </div>

            <div className="p-6 md:p-8">
                {/* STEP 1: Contrato */}
                {step === 1 && (
                    <div className="space-y-6 animate-in slide-in-from-right-4">
                        <div className="space-y-1">
                            <h2 className="text-2xl font-semibold tracking-tight">Vínculo e Motivo</h2>
                            <p className="text-sm text-muted-foreground">Informe as datas e o motivo do seu desligamento.</p>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <LabelTooltip htmlFor="dataAdmissao" tooltip="Data em que o seu contrato de trabalho iniciou na empresa, registrada na sua carteira.">Data de Admissão</LabelTooltip>
                                <DateInput
                                    id="dataAdmissao"
                                    value={dados.dataAdmissao}
                                    onChange={(v) => setDados({ ...dados, dataAdmissao: v })}
                                />
                            </div>
                            <div className="space-y-2">
                                <LabelTooltip htmlFor="dataDesligamento" tooltip="Seu último dia trabalhado na empresa (ou último dia do aviso trabalhado).">Data de Desligamento</LabelTooltip>
                                <DateInput
                                    id="dataDesligamento"
                                    value={dados.dataDesligamento}
                                    onChange={(v) => setDados({ ...dados, dataDesligamento: v })}
                                />
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <LabelTooltip htmlFor="motivoRescisao" tooltip="A forma como aconteceu a quebra ou encerramento do contrato (isso afeta muito todos os direitos).">Motivo da Rescisão</LabelTooltip>
                                <Select
                                    value={dados.motivoRescisao}
                                    onValueChange={(val) => setDados({ ...dados, motivoRescisao: val as MotivoRescisao })}
                                >
                                    <SelectTrigger id="motivoRescisao">
                                        <SelectValue placeholder="Selecione o motivo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="sem_justa_causa">Dispensa SEM Justa Causa</SelectItem>
                                        <SelectItem value="pedido_demissao">Pedido de Demissão</SelectItem>
                                        <SelectItem value="justa_causa">Dispensa COM Justa Causa</SelectItem>
                                        <SelectItem value="acordo">Rescisão por Acordo (Reforma)</SelectItem>
                                        <SelectItem value="rescisao_indireta">Rescisão Indireta (Justa causa do empregador)</SelectItem>
                                        <SelectItem value="termino_contrato">Término de Contrato de Experiência</SelectItem>
                                        <SelectItem value="antecipado_empregador">Fim Antecipado pelo Empregador (Exp.)</SelectItem>
                                        <SelectItem value="antecipado_empregado">Fim Antecipado pelo Empregado (Exp.)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {hasAviso && (
                                <div className="space-y-2 md:col-span-2">
                                    <LabelTooltip htmlFor="tipoAviso" tooltip="Como os 30 dias obrigatórios antes da demissão foram cumpridos ou pagos?">Situação do Aviso Prévio</LabelTooltip>
                                    <Select
                                        value={dados.tipoAviso}
                                        onValueChange={(val) => setDados({ ...dados, tipoAviso: val as TipoAviso })}
                                    >
                                        <SelectTrigger id="tipoAviso">
                                            <SelectValue placeholder="Selecione o tipo de aviso" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="indenizado">Indenizado (Não trabalhou, empresa paga)</SelectItem>
                                            <SelectItem value="trabalhado">Trabalhado (Cumpriu os dias)</SelectItem>
                                            {dados.motivoRescisao === "pedido_demissao" && (
                                                <SelectItem value="descontado">Descontado (Não trabalhou, empresa desconta)</SelectItem>
                                            )}
                                            <SelectItem value="dispensado">Dispensado do Cumprimento</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {isPrazo && (
                                <div className="space-y-2 md:col-span-2">
                                    <LabelTooltip htmlFor="dataTerminoContrato" tooltip="A data que estava combinada no contrato para terminar (importante para calcular multas caso você ou a empresa tenham encerrado antes).">Data Prevista para Término do Contrato</LabelTooltip>
                                    <Input
                                        id="dataTerminoContrato"
                                        type="date"
                                        value={dados.dataTerminoContrato || ""}
                                        onChange={(e) => setDados({ ...dados, dataTerminoContrato: e.target.value })}
                                    />
                                    <p className="text-xs text-muted-foreground">Obrigatório para calcular indenização (Art. 479/480 CLT).</p>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end pt-4">
                            <Button onClick={() => setStep(2)}>
                                Próximo <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}

                {/* STEP 2: Remuneração */}
                {step === 2 && (
                    <div className="space-y-6 animate-in slide-in-from-right-4">
                        <div className="space-y-1">
                            <h2 className="text-2xl font-semibold tracking-tight">Dados Salariais</h2>
                            <p className="text-sm text-muted-foreground">Informe o seu último salário e médias.</p>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <LabelTooltip htmlFor="salarioBase" tooltip="Valor do salário fixo bruto registrado na sua carteira de trabalho ou contrato.">Salário Base</LabelTooltip>
                                <CurrencyInput
                                    id="salarioBase"
                                    value={dados.salarioBase}
                                    onChange={(v) => setDados({ ...dados, salarioBase: v })}
                                />
                            </div>
                            <div className="space-y-2">
                                <LabelTooltip htmlFor="verbasFixas" tooltip="Adicionais listados no holerite que você recebe todo mês com valor fixo (ex: periculosidade, insalubridade, adicional noturno, gratificação de função).">Adicionais Fixos (Mensais)</LabelTooltip>
                                <CurrencyInput
                                    id="verbasFixas"
                                    value={dados.verbasFixas}
                                    onChange={(v) => setDados({ ...dados, verbasFixas: v })}
                                />
                                <p className="text-xs text-muted-foreground">Periculosidade, insalubridade, etc.</p>
                            </div>
                            <div className="space-y-2">
                                <LabelTooltip htmlFor="mediaHorasExtras" tooltip="A média em dinheiro que você recebeu de horas extras nos últimos 12 meses (ou durante todo o contrato, se menor que 1 ano).">Média de Horas Extras</LabelTooltip>
                                <CurrencyInput
                                    id="mediaHorasExtras"
                                    value={dados.mediaHorasExtras}
                                    onChange={(v) => setDados({ ...dados, mediaHorasExtras: v })}
                                />
                                <p className="text-xs text-muted-foreground">Some os últimos 12 meses e divida por 12.</p>
                            </div>
                            <div className="space-y-2">
                                <LabelTooltip htmlFor="mediaVariavel" tooltip="A média em dinheiro que você recebeu de comissões, prêmios ou gorjetas nos últimos 12 meses.">Média de Adicionais Variáveis</LabelTooltip>
                                <CurrencyInput
                                    id="mediaVariavel"
                                    value={dados.mediaVariavel}
                                    onChange={(v) => setDados({ ...dados, mediaVariavel: v })}
                                />
                                <p className="text-xs text-muted-foreground">Gratificações, comissões, etc.</p>
                            </div>
                        </div>

                        <div className="flex justify-between pt-4">
                            <Button variant="outline" onClick={() => setStep(1)}>
                                <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                            </Button>
                            <Button onClick={() => setStep(3)}>
                                Próximo <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}

                {/* STEP 3: Benefícios e Descontos */}
                {step === 3 && (
                    <div className="space-y-6 animate-in slide-in-from-right-4">
                        <div className="space-y-1">
                            <h2 className="text-2xl font-semibold tracking-tight">Férias e Adicionais</h2>
                            <p className="text-sm text-muted-foreground">Configure os períodos de férias abertos e opções avançadas.</p>
                        </div>

                        <div className="grid gap-6 md:grid-cols-2 bg-muted/30 p-4 rounded-lg border">
                            <div className="space-y-2">
                                <LabelTooltip tooltip="Quantidade de períodos de férias anuais completas (12 meses de trabalho) que você já tem direito, mas ainda não tirou nem recebeu o pagamento.">Períodos de Férias Vencidas</LabelTooltip>
                                <div className="flex items-center gap-4">
                                    <Input
                                        type="number"
                                        min="0"
                                        max="5"
                                        className="w-24"
                                        value={dados.feriasVencidas}
                                        onChange={(e) => setDados({ ...dados, feriasVencidas: parseInt(e.target.value) || 0 })}
                                    />
                                    <div className="flex items-center space-x-2">
                                        <Switch
                                            id="em-dobro"
                                            checked={dados.feriasEmDobro}
                                            onCheckedChange={(c) => setDados({ ...dados, feriasEmDobro: c })}
                                        />
                                        <LabelTooltip htmlFor="em-dobro" className="text-xs font-normal" tooltip="Marque apenas se alguma destas férias estiverem acumuladas (vencidas) há mais de 2 anos sem você tirar (gera pagamento em dobro).">Pagar em dobro?</LabelTooltip>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <LabelTooltip tooltip="Número de filhos ou familiares que dependem de você legalmente e estão declarados no seu Imposto de Renda. Isso reduz o desconto de IRRF na sua rescisão.">Dependentes para IRRF</LabelTooltip>
                                <Input
                                    type="number"
                                    min="0"
                                    max="15"
                                    className="w-24"
                                    value={dados.dependentes}
                                    onChange={(e) => setDados({ ...dados, dependentes: parseInt(e.target.value) || 0 })}
                                />
                            </div>

                            {(dados.motivoRescisao === "justa_causa") && (
                                <div className="col-span-2 space-y-4 rounded-md border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
                                    <div className="flex items-center gap-2 text-sm font-medium text-amber-800 dark:text-amber-300">
                                        <Info className="h-4 w-4" /> Opcionais de Convenção (Justa Causa)
                                    </div>
                                    <div className="flex flex-col gap-3">
                                        <div className="flex items-center space-x-2">
                                            <Switch id="conv-ferias" checked={dados.conv132Ferias} onCheckedChange={(c) => setDados({ ...dados, conv132Ferias: c })} />
                                            <Label htmlFor="conv-ferias" className="text-sm">Forçar cálculo de Férias Proporcionais (OIT 132)</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Switch id="conv-decimo" checked={dados.conv132Decimo} onCheckedChange={(c) => setDados({ ...dados, conv132Decimo: c })} />
                                            <Label htmlFor="conv-decimo" className="text-sm">Forçar cálculo de 13º Salário (OIT 132)</Label>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-between pt-4 mt-8 border-t">
                            <Button variant="outline" onClick={() => setStep(2)}>
                                <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                            </Button>
                            <Button onClick={() => setStep(4)}>
                                Próximo <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}

                {/* STEP 4: Contato (Lead Capture) */}
                {step === 4 && (
                    <div className="space-y-6 animate-in slide-in-from-right-4">
                        <div className="space-y-1">
                            <h2 className="text-2xl font-semibold tracking-tight">Seus Dados de Contato</h2>
                            <p className="text-sm text-muted-foreground">
                                Informe seus dados para receber o resultado da simulação.
                            </p>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <LabelTooltip htmlFor="nomeContato" tooltip="Insira seu nome completo para iniciarmos o seu atendimento de forma personalizada.">Seu Nome</LabelTooltip>
                                <div className="relative">
                                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                        <User className="h-4 w-4" />
                                    </span>
                                    <Input
                                        id="nomeContato"
                                        type="text"
                                        className="pl-10"
                                        placeholder="Seu nome completo"
                                        value={contato.nome}
                                        onChange={(e) => setContato({ ...contato, nome: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <LabelTooltip htmlFor="whatsappContato" tooltip="Usado apenas para que o nosso sistema e nossos especialistas enviem a simulação completa para você.">WhatsApp</LabelTooltip>
                                <PhoneInput
                                    id="whatsappContato"
                                    value={contato.whatsapp}
                                    onChange={(v) => setContato({ ...contato, whatsapp: v })}
                                />
                            </div>
                        </div>

                        <div className="rounded-lg border bg-blue-50/50 p-4 dark:bg-blue-950/20">
                            <p className="text-xs text-muted-foreground">
                                Seus dados serão utilizados exclusivamente para envio do resultado da simulação via WhatsApp.
                            </p>
                        </div>

                        <div className="flex justify-between pt-4 border-t">
                            <Button variant="outline" onClick={() => setStep(3)}>
                                <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                            </Button>
                            <Button
                                onClick={handleSubmitContato}
                                disabled={enviando}
                                className="bg-cta-gold text-foreground hover:bg-cta-gold/90"
                            >
                                {enviando ? (
                                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processando...</>
                                ) : (
                                    <><Calculator className="mr-2 h-4 w-4" /> Ver Resultado</>
                                )}
                            </Button>
                        </div>
                    </div>
                )}

                {/* STEP 5: Relatório */}
                {step === 5 && resultado && (
                    <div className="space-y-8 animate-in zoom-in-95">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-serif font-semibold tracking-tight">Relatório de Rescisão (CLT)</h2>
                                <p className="text-sm text-muted-foreground">Simulação baseada nas informações fornecidas.</p>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => window.print()} className="print:hidden">
                                <Printer className="mr-2 h-4 w-4" /> Imprimir
                            </Button>
                        </div>

                        {/* Print-Only: Ficha de Dados Informados */}
                        <div className="hidden print:block border rounded-lg p-4 mb-4">
                            <h3 className="font-semibold text-lg mb-3 border-b pb-2">Dados Informados</h3>
                            <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
                                <div><strong>Nome:</strong> {contato.nome}</div>
                                <div><strong>WhatsApp:</strong> {contato.whatsapp}</div>
                                <div><strong>Admissão:</strong> {dados.dataAdmissao.split("-").reverse().join("/")}</div>
                                <div><strong>Desligamento:</strong> {dados.dataDesligamento.split("-").reverse().join("/")}</div>
                                <div><strong>Motivo:</strong> {MOTIVO_LABELS[dados.motivoRescisao]}</div>
                                <div><strong>Aviso Prévio:</strong> {AVISO_LABELS[dados.tipoAviso]}</div>
                                <div><strong>Salário Base:</strong> {fmt(dados.salarioBase)}</div>
                                <div><strong>Adicionais Fixos:</strong> {fmt(dados.verbasFixas)}</div>
                                <div><strong>Horas Extras (média):</strong> {fmt(dados.mediaHorasExtras)}</div>
                                <div><strong>Adicionais Variáveis (média):</strong> {fmt(dados.mediaVariavel)}</div>
                                <div><strong>Férias Vencidas:</strong> {dados.feriasVencidas} período(s)</div>
                                <div><strong>Dependentes IRRF:</strong> {dados.dependentes}</div>
                            </div>
                        </div>

                        {/* Summary Cards */}
                        <div className="grid gap-4 md:grid-cols-3">
                            <div className="rounded-lg border bg-card p-4 shadow-sm">
                                <p className="text-sm text-muted-foreground font-medium">Proventos</p>
                                <p className="text-2xl font-bold mt-1 text-green-600 dark:text-green-500">{fmt(resultado.totalBruto)}</p>
                            </div>
                            <div className="rounded-lg border bg-card p-4 shadow-sm">
                                <p className="text-sm text-muted-foreground font-medium">Descontos</p>
                                <p className="text-2xl font-bold mt-1 text-red-600 dark:text-red-500">{fmt(resultado.totalDescontos)}</p>
                            </div>
                            <div className="rounded-lg border-2 border-primary bg-primary/5 p-4 shadow-sm">
                                <p className="text-sm text-primary font-medium">Líquido a Receber</p>
                                <p className="text-2xl font-bold mt-1">{fmt(resultado.totalLiquido)}</p>
                            </div>
                        </div>

                        {/* Memory Table */}
                        <div className="rounded-xl border bg-card overflow-hidden">
                            <div className="bg-muted px-4 py-3 border-b font-medium">
                                Memória de Cálculo
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b bg-muted/50 text-left text-muted-foreground">
                                            <th className="px-4 py-3 font-medium">Verba/Item</th>
                                            <th className="px-4 py-3 font-medium">Fórmula</th>
                                            <th className="px-4 py-3 font-medium text-right">Valor Extrato</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {resultado.itens.map((i, idx) => (
                                            <tr key={idx} className="border-b last:border-0 hover:bg-muted/30">
                                                <td className="px-4 py-3 font-medium">
                                                    {i.nome}
                                                </td>
                                                <td className="px-4 py-3 text-muted-foreground">{i.formula}</td>
                                                <td className={`px-4 py-3 text-right font-medium ${i.tipo === '+' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                    {i.tipo} {fmt(i.valor)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* FGTS Info */}
                        {resultado.fgtsRescisao > 0 || resultado.multaFGTS > 0 ? (
                            <div className="rounded-lg border bg-blue-50/50 p-4 dark:bg-blue-950/20">
                                <div className="flex items-center gap-2 text-sm font-medium text-blue-800 dark:text-blue-300">
                                    <FileText className="h-4 w-4" /> Resumo FGTS (Caixa Econômica)
                                </div>
                                <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                                    <div className="flex justify-between border-b pb-1">
                                        <span className="text-muted-foreground">Depósito na Rescisão:</span>
                                        <span className="font-medium">{fmt(resultado.fgtsRescisao)}</span>
                                    </div>
                                    <div className="flex justify-between border-b pb-1">
                                        <span className="text-muted-foreground">Multa Rescisória:</span>
                                        <span className="font-medium">{fmt(resultado.multaFGTS)}</span>
                                    </div>
                                    <div className="flex justify-between pt-1 sm:col-span-2">
                                        <span className="font-semibold text-blue-900 dark:text-blue-200">Total Previsto p/ Saque ({resultado.percSaqueFGTS}):</span>
                                        <span className="font-bold text-blue-900 dark:text-blue-200">
                                            {resultado.percSaqueFGTS !== "Não aplicável"
                                                ? fmt((resultado.saldoFGTSTotal) * (parseFloat(resultado.percSaqueFGTS) / 100 || 0) + resultado.multaFGTS)
                                                : "Permanece bloqueado"}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ) : null}

                        {resultado.avisos.length > 0 && (
                            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
                                <p className="font-medium mb-1">Avisos Importantes:</p>
                                <ul className="list-disc pl-5 space-y-1">
                                    {resultado.avisos.map((a, i) => <li key={i}>{a}</li>)}
                                </ul>
                            </div>
                        )}

                        <div className="rounded-lg border border-primary/20 bg-primary/5 p-6 text-center shadow-sm print:hidden">
                            <h3 className="text-lg font-semibold text-primary mb-2">Próximo Passo: Consulta Gratuita</h3>
                            <p className="text-sm text-muted-foreground mb-4">
                                Estes valores são uma estimativa inicial. Para garantir seus direitos e entender as nuances do seu caso,
                                é fundamental falar com um advogado. <strong>O contato é totalmente gratuito.</strong>
                                Como você já preencheu a simulação, nosso advogado já recebeu seus dados e está pronto para te orientar.
                            </p>
                            <Button asChild size="lg" className="bg-green-600 hover:bg-green-700 text-white font-bold w-full sm:w-auto">
                                <a
                                    href={`https://wa.me/${site.contact.whatsappNumber}?text=${encodeURIComponent("Olá! Acabei de fazer uma simulação na calculadora de rescisão e gostaria de tirar algumas dúvidas sobre o meu caso.")}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <MessageCircle className="mr-2 h-5 w-5" /> Enviar Mensagem agora
                                </a>
                            </Button>
                        </div>

                        <div className="flex justify-between pt-4 border-t print:hidden">
                            <p className="text-xs text-muted-foreground max-w-lg">
                                Esta é uma simulação demonstrativa. Valores exatos dependem dos centavos arredondados em folha, DSRs exatos do mês base, dissídios, INSS sobre 13º e detalhes da sua convenção sindical.
                            </p>
                            <Button variant="outline" onClick={resetParams}>
                                <RotateCcw className="mr-2 h-4 w-4" /> Nova Simulação
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
