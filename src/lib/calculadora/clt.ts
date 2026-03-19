export type MotivoRescisao =
    | "sem_justa_causa"
    | "pedido_demissao"
    | "justa_causa"
    | "acordo"
    | "rescisao_indireta"
    | "termino_contrato"
    | "antecipado_empregador"
    | "antecipado_empregado";

export type TipoAviso = "indenizado" | "trabalhado" | "dispensado" | "descontado";

export interface DadosCalculoCLT {
    dataAdmissao: string;
    dataDesligamento: string;
    salarioBase: number;
    verbasFixas: number;
    mediaHorasExtras: number;
    mediaVariavel: number;
    motivoRescisao: MotivoRescisao;
    tipoAviso: TipoAviso;
    dataTerminoContrato?: string; // Para contratos a prazo
    feriasVencidas: number;
    feriasEmDobro: boolean;
    saldoFGTS: number | null; // Se nulo, estima
    fgtsRegular: boolean;
    calcularDescontos: boolean;
    dependentes: number;
    conv132Ferias: boolean;
    conv132Decimo: boolean;
}

export interface ItemCalculo {
    nome: string;
    formula: string;
    valor: number;
    tipo: "+" | "−";
    baseLegal: string;
}

export interface ResultadoCLT {
    itens: ItemCalculo[];
    totalBruto: number;
    totalDescontos: number;
    totalLiquido: number;
    mesesTrabalhados: number;
    fgtsRescisao: number;
    saldoFGTSTotal: number;
    multaFGTS: number;
    percSaqueFGTS: string;
    fgtsEstimado: boolean;
    avisos: string[];
}

const round2 = (v: number) => {
    if (isNaN(v)) return 0;
    return Math.round(v * 100) / 100;
};

const isValidDate = (d: Date) => d instanceof Date && !isNaN(d.getTime());

// === TABELA INSS PROGRESSIVA 2024 (Art. 198 IN RFB) ===
function calcularINSS(base: number) {
    const faixas = [
        { teto: 1412.00, aliq: 0.075 },
        { teto: 2666.68, aliq: 0.09 },
        { teto: 4000.03, aliq: 0.12 },
        { teto: 7786.02, aliq: 0.14 }
    ];
    let inss = 0;
    let anterior = 0;
    for (let i = 0; i < faixas.length; i++) {
        const f = faixas[i];
        if (base <= f.teto) {
            inss += (base - anterior) * f.aliq;
            break;
        } else {
            inss += (f.teto - anterior) * f.aliq;
            anterior = f.teto;
        }
    }
    return round2(inss);
}

// === TABELA IRRF PROGRESSIVA 2024 ===
function calcularIRRF(base: number, inssCalc: number, dependentes: number) {
    const deducaoDep = dependentes * 189.59;
    const baseIR = base - inssCalc - deducaoDep;
    if (baseIR <= 0) return 0;
    const faixas = [
        { teto: 2259.20, aliq: 0, deduc: 0 },
        { teto: 2826.65, aliq: 0.075, deduc: 169.44 },
        { teto: 3751.05, aliq: 0.15, deduc: 381.44 },
        { teto: 4664.68, aliq: 0.225, deduc: 662.77 },
        { teto: Infinity, aliq: 0.275, deduc: 896.00 }
    ];
    for (let i = 0; i < faixas.length; i++) {
        if (baseIR <= faixas[i].teto) {
            const irrf = baseIR * faixas[i].aliq - faixas[i].deduc;
            return round2(Math.max(0, irrf));
        }
    }
    return 0;
}

function calcularSaldoSalario(remuneracao: number, diasTrabalhados: number) {
    return round2(remuneracao / 30 * diasTrabalhados);
}

function calcularDiasAviso(admissao: Date, desligamento: Date) {
    let anos = desligamento.getFullYear() - admissao.getFullYear();
    const aniv = new Date(admissao);
    aniv.setFullYear(desligamento.getFullYear());
    if (desligamento < aniv) anos--;
    anos = Math.max(0, anos);
    return Math.min(90, 30 + 3 * anos);
}

function calcularAvisoPrevio(remuneracao: number, diasAviso: number, motivo: MotivoRescisao, tipoAviso: TipoAviso) {
    const naoAplica: MotivoRescisao[] = ["justa_causa", "termino_contrato"];
    if (naoAplica.includes(motivo)) return { valor: 0, desconto: 0, dias: 0, tipo: "nao_aplica" };

    if (motivo === "pedido_demissao") {
        if (tipoAviso === "descontado") return { valor: 0, desconto: round2(remuneracao), dias: 30, tipo: "desconto" };
        return { valor: 0, desconto: 0, dias: 0, tipo: "nao_aplica" };
    }

    if (motivo === "acordo") {
        if (tipoAviso === "indenizado" || tipoAviso === "dispensado") {
            const val = round2(remuneracao / 30 * diasAviso * 0.5);
            return { valor: val, desconto: 0, dias: diasAviso, tipo: "acordo_50" };
        }
        return { valor: 0, desconto: 0, dias: diasAviso, tipo: "trabalhado" };
    }

    if (tipoAviso === "indenizado" || tipoAviso === "dispensado") {
        return { valor: round2(remuneracao / 30 * diasAviso), desconto: 0, dias: diasAviso, tipo: "indenizado" };
    }
    return { valor: 0, desconto: 0, dias: diasAviso, tipo: "trabalhado" };
}

function calcularAvos(admissao: Date, desligamento: Date) {
    const anoDesl = desligamento.getFullYear();
    const inicioAno = new Date(anoDesl, 0, 1);
    const dataInicio = admissao > inicioAno ? admissao : inicioAno;
    let avos = 0;

    for (let m = dataInicio.getMonth(); m <= desligamento.getMonth(); m++) {
        const inicioMes = new Date(anoDesl, m, 1);
        const fimMes = new Date(anoDesl, m + 1, 0);
        const di = (dataInicio > inicioMes) ? dataInicio.getDate() : 1;
        const df = (m === desligamento.getMonth()) ? desligamento.getDate() : fimMes.getDate();
        const dias = df - di + 1;
        if (dias >= 15) avos++;
    }
    return Math.min(12, avos);
}

function calcularDecimoTerceiro(remuneracao: number, avos: number, motivo: MotivoRescisao, flagAvancado: boolean) {
    if (motivo === "justa_causa" && !flagAvancado) return 0;
    return round2(remuneracao / 12 * avos);
}

function calcularFeriasVencidas(remuneracao: number, periodos: number, emDobro: boolean) {
    if (periodos <= 0) return 0;
    let val = remuneracao * periodos * (4 / 3);
    if (emDobro) val *= 2;
    return round2(val);
}

function calcularAvosFerias(admissao: Date, desligamento: Date) {
    const diffMeses = (desligamento.getFullYear() - admissao.getFullYear()) * 12 + (desligamento.getMonth() - admissao.getMonth());
    let mesesCompletos = diffMeses;
    if (desligamento.getDate() < admissao.getDate()) mesesCompletos--;

    let avosTotais = mesesCompletos % 12;
    const diaInicio = admissao.getDate();
    const diaFim = desligamento.getDate();
    let diasParcial = 0;

    if (diaFim >= diaInicio) {
        diasParcial = diaFim - diaInicio;
    } else {
        const ultimoDia = new Date(desligamento.getFullYear(), desligamento.getMonth() + 1, 0).getDate();
        diasParcial = (ultimoDia - diaInicio) + diaFim;
    }

    if (diasParcial >= 15 && avosTotais < 11) avosTotais++;
    return Math.min(11, Math.max(0, avosTotais));
}

function calcularFeriasProporcionais(remuneracao: number, avosFerias: number, motivo: MotivoRescisao, flagConv132: boolean) {
    if (motivo === "justa_causa" && !flagConv132) return 0;
    if (avosFerias <= 0) return 0;
    return round2((remuneracao / 12 * avosFerias) * (4 / 3));
}

function calcularIndenizacao479(remuneracao: number, mesesRestantes: number) {
    if (mesesRestantes <= 0) return 0;
    return round2(remuneracao * mesesRestantes * 0.5);
}

function calcularFGTSRescisao(saldoSalario: number, valorAviso: number, decimoTerceiro: number) {
    return round2((saldoSalario + valorAviso + decimoTerceiro) * 0.08);
}

function getPercentualMultaFGTS(motivo: MotivoRescisao) {
    const m40: MotivoRescisao[] = ["sem_justa_causa", "rescisao_indireta", "antecipado_empregador"];
    if (m40.includes(motivo)) return 0.40;
    if (motivo === "acordo") return 0.20;
    return 0;
}

function estimarFGTS(remuneracao: number, meses: number) {
    return round2(remuneracao * 0.08 * meses);
}

function calcularMesesTrabalhados(admissao: Date, desligamento: Date) {
    let m = (desligamento.getFullYear() - admissao.getFullYear()) * 12 + (desligamento.getMonth() - admissao.getMonth());
    if (desligamento.getDate() < admissao.getDate()) m--;
    return Math.max(0, m);
}

function getMapaVerbas(motivo: MotivoRescisao) {
    const mapa: Record<MotivoRescisao, { saldo: boolean, aviso: boolean, ferias_venc: boolean, ferias_prop: boolean, decimo: boolean, multa: number, ind479: boolean }> = {
        sem_justa_causa: { saldo: true, aviso: true, ferias_venc: true, ferias_prop: true, decimo: true, multa: 0.40, ind479: false },
        pedido_demissao: { saldo: true, aviso: false, ferias_venc: true, ferias_prop: true, decimo: true, multa: 0, ind479: false },
        justa_causa: { saldo: true, aviso: false, ferias_venc: true, ferias_prop: false, decimo: false, multa: 0, ind479: false },
        acordo: { saldo: true, aviso: true, ferias_venc: true, ferias_prop: true, decimo: true, multa: 0.20, ind479: false },
        rescisao_indireta: { saldo: true, aviso: true, ferias_venc: true, ferias_prop: true, decimo: true, multa: 0.40, ind479: false },
        termino_contrato: { saldo: true, aviso: false, ferias_venc: true, ferias_prop: true, decimo: true, multa: 0, ind479: false },
        antecipado_empregador: { saldo: true, aviso: true, ferias_venc: true, ferias_prop: true, decimo: true, multa: 0.40, ind479: true },
        antecipado_empregado: { saldo: true, aviso: false, ferias_venc: true, ferias_prop: true, decimo: true, multa: 0, ind479: false }
    };
    return mapa[motivo] || mapa.sem_justa_causa;
}

const fmt = (v: number) => `R$ ${v.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;

export function calcularRescisaoCLT(dados: DadosCalculoCLT): ResultadoCLT {
    let admissao = new Date(dados.dataAdmissao + "T00:00:00");
    let desligamento = new Date(dados.dataDesligamento + "T00:00:00");

    // Fallback if Date construction fails (empty strings, etc.)
    if (!isValidDate(admissao)) admissao = new Date();
    if (!isValidDate(desligamento)) desligamento = new Date();

    const remuneracao = round2(dados.salarioBase + dados.verbasFixas + dados.mediaHorasExtras + dados.mediaVariavel);
    const mapa = getMapaVerbas(dados.motivoRescisao);

    const itens: ItemCalculo[] = [];
    let totalBruto = 0;
    let totalDesc = 0;
    const avisos: string[] = [];

    // 1. Saldo de Salário
    const diasUltimoMes = desligamento.getDate();
    const saldoSal = calcularSaldoSalario(remuneracao, diasUltimoMes);
    itens.push({ nome: "Saldo de Salário", formula: `${diasUltimoMes}/30 × ${fmt(remuneracao)}`, valor: saldoSal, tipo: "+", baseLegal: "CLT Art. 477" });
    totalBruto += saldoSal;

    // 2. Aviso Prévio
    const diasAviso = calcularDiasAviso(admissao, desligamento);
    const aviso = calcularAvisoPrevio(remuneracao, diasAviso, dados.motivoRescisao, dados.tipoAviso);
    if (aviso.valor > 0) {
        const descAviso = aviso.tipo === "acordo_50" ? `50% × ${aviso.dias} dias × ${fmt(remuneracao)}/30` : `${aviso.dias}/30 × ${fmt(remuneracao)}`;
        itens.push({ nome: `Aviso Prévio (${aviso.dias} dias)`, formula: descAviso, valor: aviso.valor, tipo: "+", baseLegal: "CLT Art. 487 / Lei 12.506/2011" });
        totalBruto += aviso.valor;
    }
    if (aviso.desconto > 0) {
        itens.push({ nome: "Desconto Aviso Prévio (30 dias)", formula: `30/30 × ${fmt(remuneracao)}`, valor: aviso.desconto, tipo: "−", baseLegal: "CLT Art. 487 §2º" });
        totalDesc += aviso.desconto;
    }

    // 3. 13º Proporcional
    const avos13 = calcularAvos(admissao, desligamento);
    const decimo = calcularDecimoTerceiro(remuneracao, avos13, dados.motivoRescisao, dados.conv132Decimo);
    if (mapa.decimo || (dados.motivoRescisao === "justa_causa" && dados.conv132Decimo)) {
        itens.push({ nome: "13º Salário Proporcional", formula: `${avos13}/12 × ${fmt(remuneracao)}`, valor: decimo, tipo: "+", baseLegal: "Lei 4.090/62" });
        totalBruto += decimo;
    }

    // 4. Férias Vencidas
    if (dados.feriasVencidas > 0) {
        const fVenc = calcularFeriasVencidas(remuneracao, dados.feriasVencidas, dados.feriasEmDobro);
        const fDesc = `${dados.feriasVencidas} per. × ${fmt(remuneracao)} × 4/3` + (dados.feriasEmDobro ? " × 2 (dobro)" : "");
        itens.push({ nome: "Férias Vencidas + 1/3", formula: fDesc, valor: fVenc, tipo: "+", baseLegal: "CLT Art. 477" });
        totalBruto += fVenc;
    }

    // 5. Férias Proporcionais
    const avosFerias = calcularAvosFerias(admissao, desligamento);
    const fProp = calcularFeriasProporcionais(remuneracao, avosFerias, dados.motivoRescisao, dados.conv132Ferias);
    if ((mapa.ferias_prop || (dados.motivoRescisao === "justa_causa" && dados.conv132Ferias)) && fProp > 0) {
        itens.push({ nome: "Férias Proporcionais + 1/3", formula: `${avosFerias}/12 × ${fmt(remuneracao)} × 4/3`, valor: fProp, tipo: "+", baseLegal: "CLT Art. 477 / Súmula 171 TST" });
        totalBruto += fProp;
    }

    // 6. Indenização Art. 479
    if (mapa.ind479 && dados.motivoRescisao === "antecipado_empregador" && dados.dataTerminoContrato) {
        const dtTerm = new Date(dados.dataTerminoContrato + "T00:00:00");
        const mesesRest = Math.max(0, (dtTerm.getFullYear() - desligamento.getFullYear()) * 12 + (dtTerm.getMonth() - desligamento.getMonth()));
        const ind479 = calcularIndenizacao479(remuneracao, mesesRest);
        if (ind479 > 0) {
            itens.push({ nome: "Indenização Art. 479", formula: `50% × ${mesesRest} meses × ${fmt(remuneracao)}`, valor: ind479, tipo: "+", baseLegal: "CLT Art. 479" });
            totalBruto += ind479;
        }
    }

    // 7. FGTS
    const fgtsResc = calcularFGTSRescisao(saldoSal, aviso.valor, decimo);
    const mesesTrab = calcularMesesTrabalhados(admissao, desligamento);

    let saldoFGTS = 0;
    let fgtsEstimado = false;
    if (dados.saldoFGTS && dados.saldoFGTS > 0) {
        saldoFGTS = dados.saldoFGTS;
    } else {
        saldoFGTS = estimarFGTS(remuneracao, mesesTrab);
        fgtsEstimado = true;
    }

    const saldoFGTSTotal = round2(saldoFGTS + fgtsResc);
    const percMulta = getPercentualMultaFGTS(dados.motivoRescisao);
    const multaFGTS = round2(saldoFGTSTotal * percMulta);

    // 8. INSS e IRRF
    if (dados.calcularDescontos) {
        const baseINSS = saldoSal + (aviso.tipo === "trabalhado" ? remuneracao : 0);
        const inssVal = calcularINSS(baseINSS);
        const irrfVal = calcularIRRF(baseINSS, inssVal, dados.dependentes);

        if (inssVal > 0) {
            itens.push({ nome: "INSS", formula: `Tabela progressiva sobre ${fmt(baseINSS)}`, valor: inssVal, tipo: "−", baseLegal: "IN RFB / Tabela 2024" });
            totalDesc += inssVal;
        }
        if (irrfVal > 0) {
            itens.push({ nome: "IRRF", formula: `Tabela progressiva (base: ${fmt(baseINSS - inssVal - dados.dependentes * 189.59)})`, valor: irrfVal, tipo: "−", baseLegal: "Tabela IRRF 2024" });
            totalDesc += irrfVal;
        }
    }

    if (dados.motivoRescisao === "justa_causa" && (dados.conv132Ferias || dados.conv132Decimo)) {
        avisos.push("Divergência Jurisprudencial: Férias proporcionais e/ou 13º foram incluídos na justa causa (Convenção 132 OIT). Consulte um advogado.");
    }

    return {
        itens,
        totalBruto: round2(totalBruto),
        totalDescontos: round2(totalDesc),
        totalLiquido: round2(totalBruto - totalDesc),
        mesesTrabalhados: mesesTrab,
        fgtsRescisao: fgtsResc,
        saldoFGTSTotal,
        multaFGTS,
        percSaqueFGTS: dados.motivoRescisao === "acordo" ? "80%" : (percMulta > 0 ? "100%" : "Não aplicável"),
        fgtsEstimado,
        avisos
    };
}
