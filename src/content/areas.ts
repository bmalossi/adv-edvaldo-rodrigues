import type { LucideIcon } from "lucide-react";
import { Briefcase, Gavel, Home, Scale, Shield, Users } from "lucide-react";

export type AreaKey = "civil" | "previdenciario" | "trabalhista" | "criminal" | "familia" | "empresarial" | "militar";

export type PracticeArea = {
  key: AreaKey;
  title: string;
  description: string;
  bullets: string[];
  icon: LucideIcon;
  gradientClass:
  | "bg-area-civil"
  | "bg-area-previdenciario"
  | "bg-area-trabalhista"
  | "bg-area-criminal"
  | "bg-area-familia"
  | "bg-area-empresarial"
  | "bg-area-militar";
  content: string;
};

export const practiceAreas: PracticeArea[] = [
  {
    key: "civil",
    title: "Direito Civil",
    description: "Atuação em contratos, responsabilidade civil, imóveis e relações de consumo.",
    bullets: ["Contratos em geral", "Direito imobiliário", "Responsabilidade civil"],
    icon: Scale,
    gradientClass: "bg-area-civil",
    content: `A atuação no Direito Civil é focada na **proteção estratégica dos seus direitos patrimoniais e pessoais**. Minha abordagem combina rigor técnico com uma visão consultiva, buscando prevenir conflitos antes que se tornem litígios onerosos.

Acredito que cada caso exige uma solução única. Por isso, realizo uma análise individualizada para identificar o caminho mais eficaz — seja por meio de negociações estratégicas ou de uma atuação judicial firme e técnica.

**Minha prática no Direito Civil abrange:**

- Elaboração, análise e gestão estratégica de **contratos complexos**;
- Ações de **indenização** (danos materiais e morais);
- Questões de **responsabilidade civil** e relações de consumo;
- Proteção de **direitos possessórios e patrimoniais**;
- Defesa técnica em demandas cíveis de alta complexidade.

Atuo com transparência absoluta e acompanhamento próximo, garantindo que você tenha clareza em todas as etapas e a segurança de uma defesa comprometida com os melhores resultados possíveis.`,
  },
  {
    key: "previdenciario",
    title: "Direito Previdenciário",
    description: "Aposentadorias, pensões, auxílios e revisões com acompanhamento completo.",
    bullets: ["Aposentadorias", "Benefícios e auxílios", "Revisões"],
    icon: Shield,
    gradientClass: "bg-area-previdenciario",
    content: `O Direito Previdenciário demanda um olhar minucioso e estratégico para garantir que anos de trabalho se transformem na **segurança financeira que você merece**. Minha atuação é focada em assegurar que cada segurado receba o melhor benefício possível.

Realizo um estudo aprofundado do histórico contributivo (CNIS), identificando períodos especiais, vínculos não reconhecidos e oportunidades de revisão que muitas vezes passam despercebidas pelo INSS.

**Destaques da minha atuação previdenciária:**

- **Planejamento Previdenciário** para a escolha da melhor regra de transição;
- Concessão de **aposentadorias especiais**, por idade ou tempo de contribuição;
- Restabelecimento de **benefícios por incapacidade** (auxílio-doença/invalidez);
- Revisões administrativas e judiciais para aumento do valor da renda mensal;
- Atuação técnica no encaminhamento de pensões e auxílios.

Busco sempre a eficiência da via administrativa, mas estou pronto para agir com firmeza técnica no âmbito judicial quando o seu direito for negado injustamente. Meu compromisso é com a clareza total sobre suas chances reais e a busca incansável pela sua proteção social.`,
  },
  {
    key: "trabalhista",
    title: "Direito Trabalhista",
    description: "Orientação e defesa em verbas, rescisões, horas extras e assédio.",
    bullets: ["Verbas rescisórias", "Horas extras", "Assédio e acidentes"],
    icon: Briefcase,
    gradientClass: "bg-area-trabalhista",
    content: `As relações de trabalho são o pilar da estabilidade financeira e profissional. Minha atuação no Direito Trabalhista foca no **equilíbrio e na justiça**, garantindo que direitos sejam respeitados e riscos sejam mitigados através de uma advocacia técnica e atualizada.

Seja na proteção do trabalhador ou no auxílio a empresas para redução de passivos, minha estratégia é baseada em evidências sólidas, análise detalhada de rotinas e conformidade com a legislação vigente.

**Minha prática trabalhista envolve:**

- Reconhecimento de **vínculo empregatício** e verbas rescisórias;
- Demandas envolvendo **horas extras, assédio e acidentes de trabalho**;
- Consultoria para **prevenção de litígios** e redução de riscos operacionais;
- Elaboração de acordos judiciais e extrajudiciais equilibrados;
- Defesa técnica em reclamações trabalhistas com foco em resultados.

Trabalho de forma ética e transparente, oferecendo orientações realistas e uma atuação firme para assegurar que a justiça prevaleça em todas as relações laborais.`,
  },
  {
    key: "criminal",
    title: "Direito Criminal",
    description: "Defesa técnica, recursos e medidas urgentes com atuação estratégica.",
    bullets: ["Defesa criminal", "Recursos", "Habeas corpus"],
    icon: Gavel,
    gradientClass: "bg-area-criminal",
    content: `O Direito Criminal exige **firmeza técnica e resposta rápida**. Minha atuação é pautada pela defesa intransigente das garantias constitucionais, assegurando que o devido processo legal seja respeitado em cada detalhe.

Atuo com agilidade em situações urgentes e com profundidade estratégica em processos complexos, analisando cada prova e procedimento sob o prisma da legalidade e da justiça.

**Frentes de atuação na esfera criminal:**

- **Defesa técnica** em inquéritos policiais e ações penais;
- Atendimento em **audiências de custódia** e medidas urgentes;
- Impetração de **Habeas Corpus** para garantia da liberdade;
- Elaboração de recursos em instâncias superiores;
- Atuação estratégica em crimes comuns e da legislação especial.

Em momentos críticos, meu compromisso é oferecer uma defesa combativa e responsável, mantendo o cliente e sua família informados e seguros durante toda a condução processual.`,
  },
  {
    key: "familia",
    title: "Direito de Família",
    description: "Divórcio, guarda, pensão e partilha com foco em soluções responsáveis.",
    bullets: ["Divórcio", "Guarda", "Pensão e partilha"],
    icon: Users,
    gradientClass: "bg-area-familia",
    content: `Demandas familiares exigem não apenas conhecimento jurídico, mas **equilíbrio e sensibilidade estratégica**. Minha abordagem busca soluções duradouras que preservem o patrimônio e, acima de tudo, o bem-estar dos envolvidos.

Priorizo a resolução consensual, por ser mais célere e gerar menos desgaste emocional, mas atuo com firmeza técnica inabalável no contencioso quando os direitos dos meus clientes estão em jogo.

**Atuação especializada em Direito de Família:**

- **Divórcios e dissoluções** de união estável (judiciais e extrajudiciais);
- **Partilha de bens** estratégica para proteção do patrimônio;
- Regulamentação de **guarda, convivência e pensão alimentícia**;
- Ações de filiação e planejamento sucessório familiar;
- Medidas protetivas e tutelas de urgência.

Minha missão é oferecer segurança jurídica em momentos de transição, pautando cada passo pela ética, discrição e compromisso com a proteção da sua estrutura familiar.`,
  },
  {
    key: "empresarial",
    title: "Direito Empresarial",
    description: "Assessoria jurídica para empresas, contratos comerciais e societário.",
    bullets: ["Contratos sociais", "Fusões e aquisições", "Gestão de riscos"],
    icon: Briefcase,
    gradientClass: "bg-area-empresarial",
    content: `No cenário corporativo, a **agilidade e a segurança jurídica** são decisivas para o sucesso. Minha assessoria empresarial é focada em mitigar riscos e oferecer soluções pragmáticas que impulsionem o crescimento do seu negócio.

Do suporte preventivo em contratos à defesa em litígios societários, minha atuação é voltada para a proteção dos ativos e a estabilidade da governança da empresa.

**Destaques da consultoria empresarial:**

- Estruturação de **contratos comerciais e parcerias estratégicas**;
- Constituição, alteração e **reestruturação de sociedades**;
- Mediação de conflitos entre sócios e governança corporativa;
- Planejamento sucessório corporativo;
- Defesa técnica de interesses empresariais em juízo.

Ofereço um atendimento direto e especializado, entendendo as particularidades do seu mercado para prover uma advocacia que funcione como um verdadeiro braço estratégico da sua empresa.`,
  },
  {
    key: "militar",
    title: "Direito Militar",
    description: "Defesa de militares em processos disciplinares, pensões e reformas.",
    bullets: ["Processos disciplinares", "Pensões militares", "Promoções e reformas"],
    icon: Shield,
    gradientClass: "bg-area-militar",
    content: `O Direito Militar possui particularidades que exigem um **conhecimento profundo dos regulamentos e da carreira**. Minha atuação é dedicada à defesa dos direitos e da honra daqueles que servem ao país, garantindo o respeito às suas prerrogativas.

Atuo com o rigor e a seriedade que as instituições militares demandam, protegendo militares e seus familiares contra arbitrariedades e garantindo o acesso a benefícios conquistados.

**Frentes de atuação no Direito Militar:**

- Defesa em **Processos Administrativos Disciplinares (PAD)**;
- Ações para concessão de **reformas, pensões e revisões de proventos**;
- Questões de carreira: promoções, preterições e transferências;
- Defesa técnica perante a **Justiça Militar**;
- Assessoria jurídica em habilitação de herdeiros e direitos estatutários.

Minha missão é assegurar que o sacrifício e a dedicação da vida militar sejam acompanhados por uma proteção jurídica firme, técnica e comprometida com a justiça.`,
  },
];
