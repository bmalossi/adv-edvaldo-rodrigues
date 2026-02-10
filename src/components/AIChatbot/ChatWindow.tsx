import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import ChatMessage, { Message } from "./ChatMessage";
import ChatInput from "./ChatInput";

interface ChatWindowProps {
    isOpen: boolean;
    messages: Message[];
    isTyping: boolean;
    isFinished: boolean;
    onClose: () => void;
    onSendMessage: (message: string) => void;
    onReactivate: (phone: string) => boolean;
    language?: "pt" | "en";
}

const ChatWindow = ({
    isOpen,
    messages,
    isTyping,
    isFinished,
    onClose,
    onSendMessage,
    onReactivate,
    language = "pt",
}: ChatWindowProps) => {
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const [isConfirmingPhone, setIsConfirmingPhone] = useState(false);
    const [phoneInput, setPhoneInput] = useState("");

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, isTyping]);

    const handleReactivateClick = () => {
        setIsConfirmingPhone(true);
    };

    const handleConfirmPhone = (e: React.FormEvent) => {
        e.preventDefault();
        if (onReactivate(phoneInput)) {
            setIsConfirmingPhone(false);
            setPhoneInput("");
        }
    };

    const handleCancelReactivate = () => {
        setIsConfirmingPhone(false);
        setPhoneInput("");
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Mobile backdrop */}
            <div
                className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Chat window */}
            <div
                className="fixed z-50 flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl animate-slide-in-right
          bottom-0 left-0 right-0 top-0 md:bottom-24 md:right-8 md:top-auto md:left-auto md:h-[600px] md:w-[400px]"
                role="dialog"
                aria-label={language === "pt" ? "Janela de chat" : "Chat window"}
                aria-modal="true"
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border bg-card/80 px-4 py-3 backdrop-blur-sm">
                    <div className="flex items-center gap-2">
                        <div className="h-2 w-2 animate-pulse rounded-full bg-primary" aria-hidden="true" />
                        <h2 className="text-sm font-semibold text-foreground">
                            {language === "pt" ? "Assistente Virtual" : "Virtual Assistant"}
                        </h2>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="h-8 w-8"
                        aria-label={language === "pt" ? "Fechar chat" : "Close chat"}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                {/* Messages area */}
                <div
                    ref={messagesContainerRef}
                    className="flex-1 space-y-4 overflow-y-auto p-4 scroll-smooth"
                    style={{ scrollbarWidth: "thin" }}
                >
                    {messages.map((message) => (
                        <ChatMessage key={message.id} message={message} language={language} />
                    ))}

                    {/* Typing indicator */}
                    {isTyping && (
                        <div className="flex items-center gap-3 animate-fade-in">
                            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary">
                                <div className="flex gap-1">
                                    <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" style={{ animationDelay: "0ms" }} />
                                    <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" style={{ animationDelay: "150ms" }} />
                                    <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" style={{ animationDelay: "300ms" }} />
                                </div>
                            </div>
                            <span className="text-xs text-muted-foreground">
                                {language === "pt" ? "Digitando..." : "Typing..."}
                            </span>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Input area or Reactivation Flow */}
                <div className="border-t border-border bg-card/50 backdrop-blur-sm">
                    {isFinished ? (
                        <div className="p-4 flex flex-col gap-3">
                            {isConfirmingPhone ? (
                                <form onSubmit={handleConfirmPhone} className="flex flex-col gap-2 animate-fade-in">
                                    <p className="text-xs text-muted-foreground mb-1">
                                        {language === "pt" ? "Confirme seu telefone para reativar:" : "Confirm your phone to reactivate:"}
                                    </p>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={phoneInput}
                                            onChange={(e) => setPhoneInput(e.target.value)}
                                            placeholder={language === "pt" ? "Seu telefone..." : "Your phone..."}
                                            autoFocus
                                            className="flex-1 rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                        />
                                        <Button type="submit" size="sm">
                                            {language === "pt" ? "OK" : "Reopen"}
                                        </Button>
                                    </div>
                                    <Button type="button" variant="link" size="sm" onClick={handleCancelReactivate} className="text-[10px] h-4">
                                        {language === "pt" ? "Cancelar" : "Cancel"}
                                    </Button>
                                </form>
                            ) : (
                                <div className="flex flex-col items-center gap-2 animate-fade-in py-2">
                                    <p className="text-xs text-muted-foreground text-center italic">
                                        {language === "pt" ? "Atendimento encerrado." : "Service finished."}
                                    </p>
                                    <Button onClick={handleReactivateClick} className="w-full bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20">
                                        {language === "pt" ? "Reabrir Atendimento" : "Reopen Chat"}
                                    </Button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <ChatInput
                            onSendMessage={onSendMessage}
                            disabled={isTyping}
                            language={language}
                        />
                    )}
                </div>
            </div>
        </>
    );
};

export default ChatWindow;
