import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { calcularRescisaoCLT, type DadosCalculoCLT, type ResultadoCLT, type MotivoRescisao, type TipoAviso } from "@/lib/calculadora/clt";
import { ArrowLeft, ArrowRight, Calculator, FileText, Info, RotateCcw } from "lucide-react";
import { toast } from "sonner";

export function CalculadoraCLT() {
    const [step, setStep] = useState(1);
    const [dados, setDados] = useState<DadosCalculoCLT>({
        dataAdmissao: "",
        dataDesligamento: "",
        salarioBase: 0,
        verbasFixas: 0,
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

    const [resultado, setResultado] = useState<ResultadoCLT | null>(null);

    const handleCalculate = () => {
        if (!dados.dataAdmissao || !dados.dataDesligamento) {
            toast.error("Por favor, informe a data de admissão e desligamento.");
            setStep(1); // Go back to first step to fix
            return;
        }
        const res = calcularRescisaoCLT(dados);
        setResultado(res);
        setStep(4); // Result Step
    };

    const resetParams = () => {
        setResultado(null);
        setStep(1);
    };

    const fmt = (v: number) => `R$ ${v.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;

    const hasAviso = ["sem_justa_causa", "pedido_demissao", "acordo", "rescisao_indireta"].includes(dados.motivoRescisao);
    const isPrazo = ["termino_contrato", "antecipado_empregado", "antecipado_empregador"].includes(dados.motivoRescisao);

    return (
        <div className="mx-auto w-full max-w-4xl rounded-xl border border-border bg-card shadow-sm">
            {/* Progress Bar */}
            <div className="flex flex-wrap border-b border-border bg-muted/40">
                {[1, 2, 3, 4].map((s) => (
                    <div
                        key={s}
                        className={`flex-1 px-2 py-3 text-center text-xs sm:text-sm font-medium transition-colors ${step >= s ? "border-b-2 border-primary text-primary" : "text-muted-foreground"
                            }`}
                    >
                        {s === 1 && "1. Contrato"}
                        {s === 2 && "2. Remuneração"}
                        {s === 3 && "3. Férias e Descontos"}
                        {s === 4 && "4. Relatório"}
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
                                <Label htmlFor="dataAdmissao">Data de Admissão</Label>
                                <Input
                                    id="dataAdmissao"
                                    type="date"
                                    value={dados.dataAdmissao}
                                    onChange={(e) => setDados({ ...dados, dataAdmissao: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="dataDesligamento">Data de Desligamento</Label>
                                <Input
                                    id="dataDesligamento"
                                    type="date"
                                    value={dados.dataDesligamento}
                                    onChange={(e) => setDados({ ...dados, dataDesligamento: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="motivoRescisao">Motivo da Rescisão</Label>
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
                                    <Label htmlFor="tipoAviso">Situação do Aviso Prévio</Label>
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
                                    <Label htmlFor="dataTerminoContrato">Data Prevista para Término do Contrato</Label>
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
                                <Label htmlFor="salarioBase">Salário Base Mensal (R$)</Label>
                                <Input
                                    id="salarioBase"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={dados.salarioBase || ""}
                                    onChange={(e) => setDados({ ...dados, salarioBase: parseFloat(e.target.value) || 0 })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="verbasFixas">Adicionais Fixos (Periculosidade, Insalubridade)</Label>
                                <Input
                                    id="verbasFixas"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={dados.verbasFixas || ""}
                                    onChange={(e) => setDados({ ...dados, verbasFixas: parseFloat(e.target.value) || 0 })}
                                />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="mediaVariavel">Média de Horas Extras e Comissões (R$)</Label>
                                <Input
                                    id="mediaVariavel"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={dados.mediaVariavel || ""}
                                    onChange={(e) => setDados({ ...dados, mediaVariavel: parseFloat(e.target.value) || 0 })}
                                />
                                <p className="text-xs text-muted-foreground">Some o valor de horas extras dos últimos 12 meses e divida por 12.</p>
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
                                <Label>Períodos de Férias Vencidas</Label>
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
                                        <Label htmlFor="em-dobro" className="text-xs font-normal">Pagar em dobro?</Label>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Dependentes para IRRF</Label>
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
                            <Button onClick={handleCalculate} className="bg-cta-gold text-foreground hover:bg-cta-gold/90">
                                <Calculator className="mr-2 h-4 w-4" /> Simular Rescisão
                            </Button>
                        </div>
                    </div>
                )}

                {/* STEP 4: Relatório */}
                {step === 4 && resultado && (
                    <div className="space-y-8 animate-in zoom-in-95">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-serif font-semibold tracking-tight">Relatório de Rescisão (CLT)</h2>
                                <p className="text-sm text-muted-foreground">Simulação baseada nas informações fornecidas.</p>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => window.print()}>
                                Imprimir
                            </Button>
                        </div>

                        {/* Summary Cards */}
                        <div className="grid gap-4 md:grid-cols-3">
                            <div className="rounded-lg border bg-card p-4 shadow-sm">
                                <p className="text-sm text-muted-foreground font-medium">Total de Proventos</p>
                                <p className="text-2xl font-bold mt-1 text-green-600 dark:text-green-500">{fmt(resultado.totalBruto)}</p>
                            </div>
                            <div className="rounded-lg border bg-card p-4 shadow-sm">
                                <p className="text-sm text-muted-foreground font-medium">Total de Descontos</p>
                                <p className="text-2xl font-bold mt-1 text-red-600 dark:text-red-500">{fmt(resultado.totalDescontos)}</p>
                            </div>
                            <div className="rounded-lg border-2 border-primary bg-primary/5 p-4 shadow-sm">
                                <p className="text-sm text-primary font-medium">Total Líquido a Receber</p>
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
                                                    <span className="block text-xs text-muted-foreground font-normal mt-0.5">{i.baseLegal}</span>
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

                        <div className="flex justify-between pt-4 border-t">
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
