export type Testimonial = {
  name: string;
  role?: string;
  city?: string;
  content: string;
};

// Conteúdo editável (placeholders). Substitua por depoimentos reais sem dados sensíveis.
export const testimonials: Testimonial[] = [
  {
    name: "Luiz Guilherme",
    city: "Praia Grande/SP",
    content:
      "Atendimento claro e objetivo. Recebi orientação completa sobre os próximos passos e me senti seguro durante todo o processo.",
  },
  {
    name: "Bruno Malossi",
    city: "Praia Grande/SP",
    content:
      "Profissionalismo e atenção aos detalhes. Recomendo pelo comprometimento e pela forma transparente de conduzir o caso.",
  },
  {
    name: "Julio",
    city: "Praia Grande/SP",
    content:
      "Excelente comunicação e pontualidade. Tive retorno rápido e informações sempre bem explicadas.",
  },
];
