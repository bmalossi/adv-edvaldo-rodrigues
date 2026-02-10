import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Message } from "@/components/AIChatbot/ChatMessage";

interface CollectedData {
    nome?: string;
    email?: string;
    telefone?: string;
}

interface UseChatbotReturn {
    messages: Message[];
    isOpen: boolean;
    isTyping: boolean;
    isFinished: boolean;
    sessionId: string;
    toggleChat: () => void;
    sendMessage: (content: string) => void;
    reactivateChat: (phone: string) => boolean;
}

export const useChatbot = (language: "pt" | "en" = "pt"): UseChatbotReturn => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [isFinished, setIsFinished] = useState(false);
    const [sessionId, setSessionId] = useState<string>(() => {
        const saved = localStorage.getItem("advogado_chat_session_id");
        return saved || crypto.randomUUID();
    });
    const [collectedData, setCollectedData] = useState<CollectedData>({});
    const [conversationStep, setConversationStep] = useState(0);
    const [lastMessageTimes, setLastMessageTimes] = useState<number[]>([]);
    const [lastMessageContent, setLastMessageContent] = useState<string>("");
    const [webhookLeadSent, setWebhookLeadSent] = useState(false);
    const { toast } = useToast();

    // Webhook configuration (will be configurable via env/secrets later)
    const WEBHOOK_URL = "https://webhook.automab.dev/webhook/chatbot-adv/site"; // TODO: Update with actual webhook URL

    // Persist sessionId to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem("advogado_chat_session_id", sessionId);
    }, [sessionId]);

    // Check for existing session in Supabase on mount
    useEffect(() => {
        const recoverExistingSession = async () => {
            if (!sessionId) return;

            const { data, error } = await supabase
                .from("chatbot_conversations")
                .select("*")
                .eq("session_id", sessionId)
                .single();

            if (data && !error) {
                const sessionData = data as any;
                // If we have messages already in the database for this session, load them
                if (sessionData.historico_conversa && Array.isArray(sessionData.historico_conversa) && sessionData.historico_conversa.length > 0) {
                    const recoveredMessages = (sessionData.historico_conversa as any[]).map(m => ({
                        ...m,
                        timestamp: new Date(m.timestamp)
                    }));
                    setMessages(recoveredMessages);
                    setCollectedData(sessionData.dados_coletados || {});

                    // Recover status
                    if (sessionData.status === "finalizado") {
                        setIsFinished(true);
                    }

                    // Determine conversation step based on collected data
                    if (sessionData.telefone) setConversationStep(4);
                    else if (sessionData.email) setConversationStep(3);
                    else if (sessionData.nome) setConversationStep(2);
                    else setConversationStep(1);
                }
            }
        };

        recoverExistingSession();
    }, [sessionId]);

    // Helper: Simple string similarity (Levenshtein-ish for first 100 chars)
    const getSimilarity = (str1: string, str2: string): number => {
        const s1 = str1.toLowerCase().substring(0, 100);
        const s2 = str2.toLowerCase().substring(0, 100);
        if (s1 === s2) return 1;
        if (s1.length === 0 || s2.length === 0) return 0;

        let matches = 0;
        const minLen = Math.min(s1.length, s2.length);
        for (let i = 0; i < minLen; i++) {
            if (s1[i] === s2[i]) matches++;
        }
        return matches / Math.max(s1.length, s2.length);
    };

    // Welcome message on first open
    useEffect(() => {
        if (isOpen && messages.length === 0) {
            const welcomeMessage: Message = {
                id: crypto.randomUUID(),
                role: "bot",
                content:
                    language === "pt"
                        ? "Olá! 👋 Sou o assistente virtual da Advocacia Edvaldo Rodrigues. Estou aqui para ajudá-lo com suas questões jurídicas.\n\nAntes de começarmos, preciso coletar algumas informações. Qual é o seu nome?"
                        : "Hello! 👋 I'm the virtual assistant for Edvaldo Rodrigues Law Firm. I'm here to help you with your legal matters.\n\nBefore we start, I need to collect some information. What's your name?",
                timestamp: new Date(),
            };

            // LGPD notice
            const lgpdNotice: Message = {
                id: crypto.randomUUID(),
                role: "bot",
                content:
                    language === "pt"
                        ? "ℹ️ Ao continuar, você concorda com o armazenamento de suas informações de acordo com nossa Política de Privacidade."
                        : "ℹ️ By continuing, you agree to the storage of your information in accordance with our Privacy Policy.",
                timestamp: new Date(),
            };

            setMessages([lgpdNotice, welcomeMessage]);
            setConversationStep(1);
        }
    }, [isOpen, messages.length, language]);

    const toggleChat = useCallback(() => {
        setIsOpen((prev) => !prev);
    }, []);

    // AI response logic using Supabase Edge Function
    const getAIResponse = useCallback(
        async (history: Message[]): Promise<string> => {
            try {
                const { data, error } = await supabase.functions.invoke("chatbot-ai", {
                    body: {
                        messages: history.map(m => ({
                            role: m.role === "bot" ? "assistant" : m.role,
                            content: m.content
                        }))
                    },
                });

                if (error) throw error;
                return data.reply || (language === "pt" ? "Desculpe, tive um problema ao processar sua mensagem." : "Sorry, I had trouble processing your message.");
            } catch (error) {
                console.error("Error calling AI function:", error);
                return language === "pt"
                    ? "Ops! Tive um problema técnico. Você pode tentar de novo ou nos chamar no WhatsApp."
                    : "Oops! I hit a technical snag. You can try again or reach out via WhatsApp.";
            }
        },
        [language]
    );

    // Webhook Trigger
    const triggerWebhook = useCallback(async (eventType: string, data: any) => {
        console.log("[WEBHOOK DEBUG] triggerWebhook called with eventType:", eventType);
        console.log("[WEBHOOK DEBUG] WEBHOOK_URL:", WEBHOOK_URL);

        if (!WEBHOOK_URL) {
            console.warn("[WEBHOOK DEBUG] No WEBHOOK_URL configured, skipping webhook");
            return;
        }

        try {
            console.log("[WEBHOOK DEBUG] Sending webhook payload:", { event: eventType, data });
            await fetch(WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    event: eventType,
                    timestamp: new Date().toISOString(),
                    data
                })
            });
            console.log(`[WEBHOOK DEBUG] ✅ Webhook triggered successfully: ${eventType}`);
        } catch (error) {
            console.error("[WEBHOOK DEBUG] ❌ Error triggering webhook:", error);
        }
    }, []);

    // Save conversation to Supabase
    const saveToSupabase = useCallback(async (
        dataToSave: CollectedData,
        status: string = "em_andamento",
        finalMessages?: Message[],  // Optional: complete message history for final save
        aiSummary?: string          // Optional: AI-generated summary
    ) => {
        // Use finalMessages if provided, otherwise use current state
        const messagesToSave = finalMessages || messages;

        try {
            // @ts-ignore - chatbot_conversations table type not yet in generated types
            const { error } = await supabase.from("chatbot_conversations").upsert({
                session_id: sessionId,
                nome: dataToSave.nome,
                email: dataToSave.email,
                telefone: dataToSave.telefone,
                mensagem_inicial: messagesToSave.find((m) => m.role === "user")?.content,
                historico_conversa: messagesToSave.map((m) => ({
                    role: m.role,
                    content: m.content,
                    timestamp: m.timestamp.toISOString(),
                })),
                dados_coletados: dataToSave,
                status: status,
                origem: "advogado-website",
                dispositivo: navigator.userAgent,
            }, {
                onConflict: 'session_id'
            });

            if (error) throw error;

            // Trigger Webhook ONLY on conversation completion
            console.log("[WEBHOOK DEBUG] saveToSupabase called with status:", status);
            console.log("[WEBHOOK DEBUG] messagesToSave length:", messagesToSave.length);

            if (status === "finalizado") {
                console.log("[WEBHOOK DEBUG] ✅ Status is finalizado, preparing to trigger webhook");
                const conversationSummary = messagesToSave.map(m =>
                    `[${m.role === 'bot' ? 'Assistente' : 'Usuário'}]: ${m.content}`
                ).join('\n\n');

                console.log("[WEBHOOK DEBUG] Conversation summary created, calling triggerWebhook...");
                triggerWebhook("conversation_completed", {
                    ...dataToSave,
                    session_id: sessionId,
                    status,
                    historico_conversa: messagesToSave.map((m) => ({
                        role: m.role,
                        content: m.content,
                        timestamp: m.timestamp.toISOString(),
                    })),
                    resumo: aiSummary || conversationSummary
                });

                toast({
                    title: language === "pt" ? "Atendimento encerrado" : "Service finished",
                    description: language === "pt"
                        ? "Obrigado pelo seu contato!"
                        : "Thank you for contacting us!",
                });
            }
        } catch (error) {
            console.error("Error saving to Supabase:", error);
        }
    }, [sessionId, messages, language, toast, triggerWebhook]);

    const reactivateChat = useCallback((phone: string): boolean => {
        // Simple sanitization to compare numbers
        const cleanInput = phone.replace(/\D/g, '');
        const cleanSaved = (collectedData.telefone || '').replace(/\D/g, '');

        if (cleanInput === cleanSaved && cleanSaved.length > 0) {
            setIsFinished(false);
            toast({
                title: language === "pt" ? "Acesso liberado! ✅" : "Access granted! ✅",
                description: language === "pt"
                    ? "Chat reativado. Como podemos ajudar hoje?"
                    : "Chat reactivated. How can we help today?",
            });
            return true;
        }

        toast({
            variant: "destructive",
            title: language === "pt" ? "Dados incorretos" : "Incorrect data",
            description: language === "pt"
                ? "O telefone informado não coincide com os dados da sessão."
                : "The phone provided does not match the session data.",
        });
        return false;
    }, [collectedData.telefone, language, toast]);

    const sendMessage = useCallback(
        async (content: string) => {
            if (isFinished) return;

            const now = Date.now();

            // Anti-spam: Cooldown (1.5s)
            const lastTime = lastMessageTimes.length > 0 ? lastMessageTimes[lastMessageTimes.length - 1] : 0;
            if (now - lastTime < 1500) {
                toast({
                    variant: "destructive",
                    title: language === "pt" ? "Calma lá! ✋" : "Slow down! ✋",
                    description: language === "pt"
                        ? "Você está enviando mensagens rápido demais. Aguarde um instante."
                        : "You're sending messages too fast. Please wait a moment.",
                });
                return;
            }

            // Anti-spam: Rate limit (10 msgs/min)
            const recentMsgs = lastMessageTimes.filter(t => now - t < 60000);
            if (recentMsgs.length >= 10) {
                toast({
                    variant: "destructive",
                    title: language === "pt" ? "Muitas mensagens" : "Too many messages",
                    description: language === "pt"
                        ? "Limite de mensagens atingido. Tente novamente em um minuto."
                        : "Message limit reached. Please try again in a minute.",
                });
                return;
            }

            // Anti-spam: Duplicate/Similarity check
            if (getSimilarity(content, lastMessageContent) > 0.8) {
                toast({
                    variant: "destructive",
                    title: language === "pt" ? "Mensagem repetitiva" : "Repetitive message",
                    description: language === "pt"
                        ? "Por favor, evite enviar mensagens repetitivas ou sem nexo."
                        : "Please avoid sending repetitive or nonsensical messages.",
                });
                return;
            }

            // Update anti-spam state
            setLastMessageTimes([...recentMsgs, now]);
            setLastMessageContent(content);

            // Add user message
            const userMessage: Message = {
                id: crypto.randomUUID(),
                role: "user",
                content,
                timestamp: new Date(),
            };

            const updatedMessages = [...messages, userMessage];
            setMessages(updatedMessages);
            setIsTyping(true);

            // Simulate thinking time for bot responses
            await new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 500));

            let updatedData = { ...collectedData };
            let botResponseContent = "";
            let nextStep = conversationStep + 1;
            let finalStatus = "em_andamento";

            if (conversationStep === 1) {
                // User just provided Name
                updatedData.nome = content;
                setCollectedData(updatedData);
                botResponseContent = language === "pt"
                    ? "Perfeito! Agora, me informe seu telefone/WhatsApp com DDD?"
                    : "Perfect! Now, please provide your phone/WhatsApp number with area code?";
            } else if (conversationStep === 2) {
                // User just provided Phone
                updatedData.telefone = content;
                setCollectedData(updatedData);

                // Trigger lead_captured webhook (only once)
                if (!webhookLeadSent && updatedData.nome && updatedData.telefone) {
                    triggerWebhook("lead_captured", {
                        nome: updatedData.nome,
                        telefone: updatedData.telefone,
                        session_id: sessionId
                    });
                    setWebhookLeadSent(true);
                }

                // Persistence check
                try {
                    // @ts-ignore
                    const { data, error } = await supabase.rpc('get_conversation_by_phone', {
                        phone_number: content
                    });

                    if (data && (data as any[]).length > 0 && !error) {
                        const existingConv = (data as any[])[0];
                        if (existingConv.session_id !== sessionId) {
                            const recoveredMessages = (existingConv.historico_conversa as any[]).map(m => ({
                                ...m,
                                timestamp: new Date(m.timestamp)
                            }));
                            setMessages(recoveredMessages);
                            setCollectedData(existingConv.dados_coletados || {});
                            setSessionId(existingConv.session_id);
                            setIsFinished(existingConv.status === "finalizado");
                            setConversationStep(4);
                            setIsTyping(false);
                            toast({
                                title: language === "pt" ? "Conexão recuperada! 🔄" : "Connection restored! 🔄",
                                description: language === "pt"
                                    ? "Encontramos seu histórico anterior e o restauramos."
                                    : "We found your previous history and restored it.",
                            });
                            return;
                        }
                    }
                } catch (err) {
                    console.error("Error recovering by phone:", err);
                }

                botResponseContent = language === "pt"
                    ? "E qual o seu melhor e-mail?"
                    : "And what is your best email?";
            } else if (conversationStep === 3) {
                // User just provided Email -> Now AI takes over
                updatedData.email = content;
                setCollectedData(updatedData);

                // Get AI response using full history
                botResponseContent = await getAIResponse(updatedMessages);

                // Save lead
                saveToSupabase(updatedData, "em_andamento");
            } else {
                // AI conducts the rest of the conversation (step 4+)
                console.log("[WEBHOOK DEBUG] Getting AI response for conversation step:", conversationStep);
                const aiRawResponse = await getAIResponse(updatedMessages);
                console.log("[WEBHOOK DEBUG] AI raw response:", aiRawResponse.substring(0, 100) + "...");

                // Check for summary and closure tags
                const hasSummaryTag = aiRawResponse.includes("[[SUMMARY:");
                const hasCloseTag = aiRawResponse.includes("[[CLOSE_CHAT]]");

                let aiSummary = "";

                if (hasSummaryTag) {
                    const summaryPart = aiRawResponse.split("[[SUMMARY:")[1].split("]]")[0];
                    aiSummary = summaryPart.trim();
                    // Clean the response to users
                    botResponseContent = aiRawResponse.replace(/\[\[SUMMARY:.*?\]\]/s, "").replace("[[CLOSE_CHAT]]", "").trim();
                } else if (hasCloseTag) {
                    botResponseContent = aiRawResponse.replace("[[CLOSE_CHAT]]", "").trim();
                } else {
                    botResponseContent = aiRawResponse;
                }

                if (hasCloseTag) {
                    console.log("[WEBHOOK DEBUG] ✅ CLOSE_CHAT tag detected! Setting finalStatus to finalizado");
                    setIsFinished(true);
                    finalStatus = "finalizado";
                }

                console.log("[WEBHOOK DEBUG] finalStatus:", finalStatus);
                console.log("[WEBHOOK DEBUG] conversationStep:", conversationStep);

                // Create bot message to include in history
                const botMessage: Message = {
                    id: crypto.randomUUID(),
                    role: "bot",
                    content: botResponseContent,
                    timestamp: new Date(),
                };

                // Periodically save or save final status
                const shouldSave = conversationStep % 2 === 0 || finalStatus !== "em_andamento";
                console.log("[WEBHOOK DEBUG] Should save?", shouldSave, "(step % 2 === 0:", conversationStep % 2 === 0, ", finalStatus !== em_andamento:", finalStatus !== "em_andamento", ")");

                if (shouldSave) {
                    console.log("[WEBHOOK DEBUG] Calling saveToSupabase with finalStatus:", finalStatus);
                    // Pass complete history including the final bot response
                    const completeHistory = [...updatedMessages, botMessage];

                    // Passing the AI Summary if available
                    saveToSupabase(updatedData, finalStatus, completeHistory, aiSummary);
                }

                // Add bot message to state
                setMessages((prev) => [...prev, botMessage]);
                setIsTyping(false);
                setConversationStep(nextStep);
                return; // Exit early since we already handled message state
            }

            const botMessage: Message = {
                id: crypto.randomUUID(),
                role: "bot",
                content: botResponseContent,
                timestamp: new Date(),
            };

            setMessages((prev) => [...prev, botMessage]);
            setIsTyping(false);
            setConversationStep(nextStep);
        },
        [conversationStep, getAIResponse, saveToSupabase, collectedData, messages, sessionId, language, toast, isFinished, lastMessageTimes, lastMessageContent]
    );

    return {
        messages,
        isOpen,
        isTyping,
        isFinished,
        sessionId,
        toggleChat,
        sendMessage,
        reactivateChat
    };
};
