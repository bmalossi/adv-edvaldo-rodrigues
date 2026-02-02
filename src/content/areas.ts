import type { LucideIcon } from "lucide-react";
import { Briefcase, Gavel, Scale, Shield, Users } from "lucide-react";

export type AreaKey = "civil" | "previdenciario" | "trabalhista" | "criminal" | "familia";

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
    | "bg-area-familia";
};

export const practiceAreas: PracticeArea[] = [
  {
    key: "civil",
    title: "Direito Civil",
    description: "Atuação em contratos, responsabilidade civil, imóveis e relações de consumo.",
    bullets: ["Contratos em geral", "Direito imobiliário", "Responsabilidade civil"],
    icon: Scale,
    gradientClass: "bg-area-civil",
  },
  {
    key: "previdenciario",
    title: "Direito Previdenciário",
    description: "Aposentadorias, pensões, auxílios e revisões com acompanhamento completo.",
    bullets: ["Aposentadorias", "Benefícios e auxílios", "Revisões"],
    icon: Shield,
    gradientClass: "bg-area-previdenciario",
  },
  {
    key: "trabalhista",
    title: "Direito Trabalhista",
    description: "Orientação e defesa em verbas, rescisões, horas extras e assédio.",
    bullets: ["Verbas rescisórias", "Horas extras", "Assédio e acidentes"],
    icon: Briefcase,
    gradientClass: "bg-area-trabalhista",
  },
  {
    key: "criminal",
    title: "Direito Criminal",
    description: "Defesa técnica, recursos e medidas urgentes com atuação estratégica.",
    bullets: ["Defesa criminal", "Recursos", "Habeas corpus"],
    icon: Gavel,
    gradientClass: "bg-area-criminal",
  },
  {
    key: "familia",
    title: "Direito de Família",
    description: "Divórcio, guarda, pensão e partilha com foco em soluções responsáveis.",
    bullets: ["Divórcio", "Guarda", "Pensão e partilha"],
    icon: Users,
    gradientClass: "bg-area-familia",
  },
];
