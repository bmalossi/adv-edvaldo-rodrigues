export const site = {
  brand: {
    name: "Edvaldo Rodrigues",
    subtitle: "Advocacia",
    fullName: "Edvaldo Rodrigues Ferreira",
    oab: "OAB/SP nº 465.818",
  },
  contact: {
    // Use apenas dígitos: 55 + DDD + número
    whatsappNumber: "5513997176826",
    phoneDisplay: "(13) 99717-6826",
    email: "edvaldorodrigues.advocacia@gmail.com",
    city: "Praia Grande, SP",
    addressLine: "Av. Pres. Costa e Silva, 733 - Boqueirão, Praia Grande - SP, 11701-000",
    hours: "Seg–Sex, 09:00–18:00",

    // Mapa (opcional)
    // Para embed: pegue o link "Incorporar um mapa" no Google Maps e cole o src do iframe aqui.
    googleMapsEmbedUrl:
      "https://maps.google.com/maps?q=Avenida%20Presidente%20Costa%20e%20Silva%2C%20733%20-%20Boqueir%C3%A3o%20-%20Praia%20Grande%2FSP&t=&z=16&ie=UTF8&iwloc=&output=embed",
    // Link leve (fallback) — use o link compartilhável do Google Maps.
    googleMapsLink:
      "https://www.google.com/maps/search/?api=1&query=Avenida%20Presidente%20Costa%20e%20Silva%2C%20733%20-%20Boqueir%C3%A3o%20-%20Praia%20Grande%2FSP",
  },
  features: {
    testimonials: true,
  },
  social: {
    instagram: "",
    linkedin: "",
    facebook: "",
  },
} as const;
