import { useState, useRef, useEffect, KeyboardEvent, FormEvent } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatInputProps {
    onSendMessage: (message: string) => void;
    disabled?: boolean;
    language?: "pt" | "en";
}

const ChatInput = ({ onSendMessage, disabled = false, language = "pt" }: ChatInputProps) => {
    const [input, setInput] = useState("");
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-focus when component becomes enabled (after bot finishes typing)
    useEffect(() => {
        if (!disabled && textareaRef.current) {
            textareaRef.current.focus();
        }
    }, [disabled]);

    const handleSubmit = (e?: FormEvent) => {
        e?.preventDefault();
        const trimmedInput = input.trim();

        if (!trimmedInput || disabled) return;

        onSendMessage(trimmedInput);
        setInput("");

        // Reset textarea height and maintain focus
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.focus();
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        // Enter without Shift sends the message
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInput(e.target.value);

        // Auto-resize textarea
        const textarea = e.target;
        textarea.style.height = "auto";
        textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="flex items-end gap-2 border-t border-border bg-card/50 p-4 backdrop-blur-sm"
        >
            <textarea
                ref={textareaRef}
                value={input}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                disabled={disabled}
                placeholder={
                    language === "pt"
                        ? "Digite sua mensagem..."
                        : "Type your message..."
                }
                rows={1}
                className="flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50"
                style={{ maxHeight: "120px", minHeight: "40px" }}
                aria-label={language === "pt" ? "Campo de mensagem" : "Message input"}
            />
            <Button
                type="submit"
                size="icon"
                disabled={disabled || !input.trim()}
                className="h-10 w-10 flex-shrink-0"
                aria-label={language === "pt" ? "Enviar mensagem" : "Send message"}
            >
                <Send className="h-4 w-4" aria-hidden="true" />
            </Button>
        </form>
    );
};

export default ChatInput;
