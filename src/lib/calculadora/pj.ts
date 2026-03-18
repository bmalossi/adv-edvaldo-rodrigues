export interface DadosCalculoPJ {
    dataInicio: string; // YYYY-MM
    dataFim: string; // YYYY-MM
    notaMedia: number; // Faturamento médio
    contador: number; // Gasto contador
    imposto: number; // Porcentagem do imposto (Simples, etc)
    outrasDespesas: number; // Vale, refeição
    percRisco: number; // Porcentagem de risco de sucesso (0-100)
}

export interface ResultadoPJ {
    meses: number;
    faturamentoTotal: number;
    despesasTotais: number;
    liquidoPJ: number;
    perda13: number;
    perdaFerias: number;
    perdaFGTS: number;
    perdaMultaFGTS: number;
    perdaAvisoPrevio: number;
    totalDireitosCLT: number;
    lucroDoEmpregador: number; // faturamentoTotal - totalDireitosCLT
    valorRisco: number;
}

const round2 = (v: number) => Math.round(v * 100) / 100;

function calcularMeses(inicio: string, fim: string): number {
    if (!inicio || !fim) return 0;
    const dInicio = new Date(`${inicio}-01T00:00:00`);
    const dFim = new Date(`${fim}-01T00:00:00`);

    if (isNaN(dInicio.getTime()) || isNaN(dFim.getTime())) return 0;

    const m = (dFim.getFullYear() - dInicio.getFullYear()) * 12 + (dFim.getMonth() - dInicio.getMonth()) + 1;
    return Math.max(0, m);
}

export function calcularAnalisePJ(dados: DadosCalculoPJ): ResultadoPJ {
    const meses = calcularMeses(dados.dataInicio, dados.dataFim);
    const anos = meses / 12;

    // 1. O que o PJ arrecadou e gastou na prestação
    const faturamentoTotal = round2(dados.notaMedia * meses);

    const custoImpostoMensal = dados.notaMedia * (dados.imposto / 100);
    const gastoMensal = dados.contador + custoImpostoMensal + dados.outrasDespesas;
    const despesasTotais = round2(gastoMensal * meses);

    const liquidoPJ = round2(faturamentoTotal - despesasTotais);

    // 2. O que ele perdeu por não ter CLT (Base de Cálculo: Faturamento Bruto como se fosse o Salário Base)
    // Assumimos que a Nota Fiscal Média era o Salário "Bruto" que a empresa pagava
    const salarioBaseAparente = dados.notaMedia;

    const perda13 = round2(salarioBaseAparente * anos);
    const perdaFerias = round2(salarioBaseAparente * (4 / 3) * anos);
    const perdaFGTS = round2(salarioBaseAparente * 0.08 * meses);
    const perdaMultaFGTS = round2(perdaFGTS * 0.40);

    // Aviso previo padrao de 30 dias + 3 dias por ano completo
    let diasAviso = 30 + (Math.floor(anos) * 3);
    if (diasAviso > 90) diasAviso = 90;
    const perdaAvisoPrevio = round2((salarioBaseAparente / 30) * diasAviso);

    const totalDireitosCLT = round2(perda13 + perdaFerias + perdaFGTS + perdaMultaFGTS + perdaAvisoPrevio);
    const lucroDoEmpregador = round2(faturamentoTotal - totalDireitosCLT);

    const valorRisco = round2(totalDireitosCLT * (dados.percRisco / 100));

    return {
        meses,
        faturamentoTotal,
        despesasTotais,
        liquidoPJ,
        perda13,
        perdaFerias,
        perdaFGTS,
        perdaMultaFGTS,
        perdaAvisoPrevio,
        totalDireitosCLT,
        lucroDoEmpregador,
        valorRisco
    };
}
