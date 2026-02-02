import { site } from "@/config/site";

export function buildWhatsAppUrl(message: string, number = site.contact.whatsappNumber) {
  const text = encodeURIComponent(message);
  // wa.me exige número em formato internacional, sem + e sem caracteres especiais
  return `https://wa.me/${number}?text=${text}`;
}

export function buildMailToUrl(subject: string, body: string, to = site.contact.email) {
  const s = encodeURIComponent(subject);
  const b = encodeURIComponent(body);
  return `mailto:${to}?subject=${s}&body=${b}`;
}
