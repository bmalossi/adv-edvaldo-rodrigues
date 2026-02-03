import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { site } from "@/config/site";
import { buildMailToUrl, buildWhatsAppUrl } from "@/lib/contact-links";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send } from "lucide-react";

import { useState } from "react";

const schema = z.object({
  name: z.string().trim().min(2, "Informe seu nome").max(100, "Máx. 100 caracteres"),
  email: z.string().trim().email("E-mail inválido").max(255, "Máx. 255 caracteres"),
  phone: z
    .string()
    .trim()
    .min(8, "Informe um telefone")
    .max(30, "Máx. 30 caracteres"),
  area: z.string().trim().min(1, "Selecione uma área"),
  message: z.string().trim().min(10, "Descreva brevemente seu caso").max(1200, "Máx. 1200 caracteres"),
});

type FormValues = z.infer<typeof schema>;

function safeOpen(url: string) {
  const win = window.open(url, "_blank", "noopener,noreferrer");
  if (!win) window.location.href = url;
}

export function ContactForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      area: "",
      message: "",
    },
    mode: "onTouched",
  });

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);

    try {
      // 1. Enviar para o Webhook
      const response = await fetch("https://webhook.automab.dev/webhook/v1/forms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        throw new Error("Erro ao enviar para o webhook");
      }

      // 2. Abrir WhatsApp em nova aba
      const body = [
        `Olá! Acabei de enviar o formulário pelo site.`,
        "",
        `Nome: ${values.name}`,
        `E-mail: ${values.email}`,
        `Telefone: ${values.phone}`,
        `Área: ${values.area}`,
        "",
        `Mensagem: ${values.message}`,
      ].join("\n");

      const waUrl = buildWhatsAppUrl(body);
      window.open(waUrl, "_blank", "noopener,noreferrer");

      // 3. Sucesso!
      setIsSuccess(true);
      toast.success("Dados enviados com sucesso!");
      form.reset();
    } catch (error) {
      console.error("Erro na submissão:", error);
      toast.error("Ocorreu um erro ao enviar sua mensagem. Por favor, tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center rounded-xl border bg-card p-6 text-center shadow-sm md:p-8">
        <div className="mb-4 rounded-full bg-highlight/20 p-4">
          <Send className="size-8 text-secondary" />
        </div>
        <h3 className="font-serif text-2xl font-semibold tracking-tight text-foreground">Enviado com sucesso!</h3>
        <p className="mt-4 max-w-sm text-muted-foreground">
          Logo o Dr. Edvaldo Rodrigues atenderá a sua solicitação. Caso já queira adiantar algo, a janela do WhatsApp foi aberta em uma nova aba.
        </p>
        <Button
          variant="outline"
          className="mt-8"
          onClick={() => setIsSuccess(false)}
        >
          Enviar outra mensagem
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm md:p-8">
      <div className="mb-6">
        <h3 className="font-serif text-2xl font-semibold tracking-tight">Agende sua avaliação inicial</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Preencha o formulário e retornaremos em breve. Atendimento: {site.contact.hours}.
        </p>
        <p className="mt-3 text-xs text-muted-foreground">
          Para sua segurança, evite enviar dados sensíveis ou documentos por aqui. Após o contato, orientaremos o melhor
          canal para encaminhamento.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome completo</FormLabel>
                <FormControl>
                  <Input placeholder="Digite seu nome" autoComplete="name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-5 md:grid-cols-2">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-mail</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="seu@email.com" autoComplete="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone</FormLabel>
                  <FormControl>
                    <Input type="tel" placeholder="(00) 00000-0000" autoComplete="tel" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="area"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Área de interesse</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma área" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Direito Civil">Direito Civil</SelectItem>
                    <SelectItem value="Direito Previdenciário">Direito Previdenciário</SelectItem>
                    <SelectItem value="Direito Trabalhista">Direito Trabalhista</SelectItem>
                    <SelectItem value="Direito Criminal">Direito Criminal</SelectItem>
                    <SelectItem value="Direito de Família">Direito de Família</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="message"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descreva seu caso</FormLabel>
                <FormControl>
                  <Textarea rows={6} placeholder="Conte-nos sobre sua situação jurídica…" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Enviando...
              </span>
            ) : (
              <>
                <Send className="size-4" aria-hidden="true" />
                Solicitar avaliação inicial
              </>
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
}
