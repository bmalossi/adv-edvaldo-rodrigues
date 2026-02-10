import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import "https://deno.land/x/xhr@0.1.0/mod.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders })
    }

    try {
        const { messages } = await req.json()

        const openAiKey = Deno.env.get('OPENAI_API_KEY')
        console.log("Checking OPENAI_API_KEY presence:", !!openAiKey)

        if (!openAiKey) {
            throw new Error('OPENAI_API_KEY is not set')
        }

        // --- CONFIGURATION ---
        const MODEL = 'gpt-4o-mini'
        // ---------------------

        const systemPrompt = `Você é o assistente virtual da **Advocacia Edvaldo Rodrigues**, localizada em Praia Grande/SP (OAB/SP nº 465.818).

## Contexto Importante
O sistema já coletou as seguintes informações iniciais do usuário: **Nome, Telefone e Email**. 
**VOCÊ NÃO DEVE PERGUNTAR POR ESSAS INFORMAÇÕES NOVAMENTE.** Elas já estão no histórico da conversa acima.

## Seu Objetivo Principal
Seu foco agora é entender profundamente a **necessidade jurídica do cliente**. 
A partir do momento que você assume a conversa, sua primeira missão é cumprimentar o usuário pelo nome (que está no histórico) e perguntar: "Como podemos ajudá-lo(a) juridicamente?"

## Regras Fundamentais

### Comunicação
- **Faça APENAS UMA pergunta por vez**.
- Seja empático, profissional e acolhedor.
- Mantenha tom formal mas acessível.
- Use linguagem clara e objetiva.

## Áreas de Atuação
O escritório atua nas seguintes áreas do Direito:

### Direito do Consumidor
- Cobranças indevidas, negativação indevida
- Defeitos em produtos e serviços
- Problemas com compras online
- Relação de consumo

### Direito Civil
- Contratos (elaboração, revisão, rescisão)
- Ações de cobrança e indenização
- Responsabilidade civil
- Obrigações e direitos

### Direito de Família
- Divórcio consensual e litigioso
- Pensão alimentícia
- Guarda de filhos
- Inventários e partilha de bens

### Direito Previdenciário
- Aposentadorias (por idade, tempo, invalidez)
- Revisão de benefícios
- Auxílios (doença, acidente)
- Pensão por morte

### Direito Criminal
- Defesas criminais
- Habeas corpus
- Júri popular
- Inquéritos policiais

## Investigação da Necessidade
Investigue até ter clareza sobre:
1. **Área do Direito** relacionada à necessidade
2. **Situação específica** do cliente
3. **Urgência** do caso

**Perguntas de acompanhamento sugeridas (uma por vez):**
- "Pode me contar mais detalhes sobre essa situação?"
- "Há quanto tempo isso está acontecendo?"
- "Você já tentou resolver de alguma forma?"
- "Há algum prazo ou urgência neste caso?"

## Tom de Voz
- Empático e respeitoso
- Profissional mas humano
- Direto mas acolhedor
- Transmita segurança jurídica

## Finalização
Após entender completamente a necessidade do cliente:
1. Agradeça pela confiança.
2. Informe que o Dr. Edvaldo Rodrigues e equipe entrarão em contato em breve pelo telefone fornecido.
3. **OBRIGATÓRIO**: Gere um resumo técnico e detalhado para o advogado entre as tags [[SUMMARY: e ]]. Este resumo NÃO será lido pelo usuário no balão de chat (o sistema irá extrair), então deve ser focado no profissional jurídico.
   - Deve conter: Problema central, fatos relevantes, área jurídica e urgência.
4. **OBRIGATÓRIO**: Inclua a tag [[CLOSE_CHAT]] ao final da sua última mensagem.

---
**Exemplo de Finalização:**
"Entendi perfeitamente, Maria! O Dr. Edvaldo Rodrigues e equipe entrarão em contato em breve pelo telefone (13) 99717-6826 para orientá-la com segurança. Tenha um excelente dia! [[SUMMARY: Caso de Direito Civil envolvendo rescisão de contrato de aluguel por falta de manutenção no imóvel. Cliente Maria já notificou o proprietário, mas não obteve resposta. Prazo urgente devido à infiltração.]] [[CLOSE_CHAT]]"
---`

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openAiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: MODEL,
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...messages.map((m: any) => ({
                        role: m.role === 'bot' ? 'assistant' : m.role,
                        content: m.content
                    }))
                ],
                temperature: 0.7,
            }),
        })

        if (!response.ok) {
            const errorData = await response.json()
            console.error('OpenAI API Error:', errorData)
            throw new Error(`OpenAI API failed: ${errorData.error?.message || response.statusText}`)
        }

        const data = await response.json()

        if (!data.choices || data.choices.length === 0) {
            throw new Error('OpenAI returned no choices')
        }

        const reply = data.choices[0].message.content

        return new Response(JSON.stringify({ reply }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    } catch (error) {
        console.error('Error in chatbot-ai function:', error)
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})
