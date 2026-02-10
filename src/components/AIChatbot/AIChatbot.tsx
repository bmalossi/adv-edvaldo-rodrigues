import { motion } from "framer-motion";
import { MessageCircle } from "lucide-react";
import { useChatbot } from "@/hooks/useChatbot";
import ChatWindow from "./ChatWindow";

interface AIChatbotProps {
    language?: "pt" | "en";
}

const AIChatbot = ({ language = "pt" }: AIChatbotProps) => {
    const { messages, isOpen, isTyping, isFinished, toggleChat, sendMessage, reactivateChat } = useChatbot(language);

    return (
        <>
            {/* Premium Floating chat button (Reuses WhatsApp button design) */}
            <motion.button
                onClick={toggleChat}
                className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-cta-gold text-primary shadow-2xl transition-transform hover:scale-110 active:scale-95 border-2 border-highlight/50"
                initial={{ scale: 0, opacity: 0 }}
                animate={{
                    scale: 1,
                    opacity: 1,
                    boxShadow: [
                        "0 0 0 0 rgba(201, 169, 97, 0)",
                        "0 0 0 15px rgba(201, 169, 97, 0.2)",
                        "0 0 0 0 rgba(201, 169, 97, 0)"
                    ]
                }}
                transition={{
                    duration: 0.5,
                    boxShadow: {
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }
                }}
                whileHover={{
                    y: -5,
                    transition: { duration: 0.2 }
                }}
                aria-label={
                    language === "pt"
                        ? isOpen
                            ? "Fechar assistente virtual"
                            : "Abrir assistente virtual"
                        : isOpen
                            ? "Close virtual assistant"
                            : "Open virtual assistant"
                }
                aria-expanded={isOpen}
            >
                <div className="relative">
                    <MessageCircle className="h-7 w-7 fill-current" />

                    {/* Notification badge */}
                    {!isOpen && (
                        <span className="absolute -right-1 -top-1 flex h-3 w-3">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-highlight opacity-75" />
                            <span className="relative inline-flex h-3 w-3 rounded-full bg-highlight" />
                        </span>
                    )}
                </div>
            </motion.button>

            {/* Chat window */}
            <ChatWindow
                isOpen={isOpen}
                messages={messages}
                isTyping={isTyping}
                isFinished={isFinished}
                onClose={toggleChat}
                onSendMessage={sendMessage}
                onReactivate={reactivateChat}
                language={language}
            />
        </>
    );
};

export default AIChatbot;
