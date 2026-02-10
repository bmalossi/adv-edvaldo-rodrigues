import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bot, User } from "lucide-react";

export interface Message {
  id: string;
  role: "user" | "bot";
  content: string;
  timestamp: Date;
}

interface ChatMessageProps {
  message: Message;
  language?: "pt" | "en";
}

const ChatMessage = ({ message, language = "pt" }: ChatMessageProps) => {
  const isBot = message.role === "bot";
  const isNotice = message.content.startsWith("ℹ️");

  const formattedTime = formatDistanceToNow(message.timestamp, {
    addSuffix: true,
    locale: language === "pt" ? ptBR : undefined,
  });

  return (
    <div
      className={`flex gap-3 ${isBot ? "justify-start" : "justify-end"} animate-fade-in`}
      role="article"
      aria-label={`${isBot ? "Bot" : "Você"}: ${message.content}`}
    >
      {isBot && (
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary">
          <Bot className="h-4 w-4" aria-hidden="true" />
        </div>
      )}

      <div
        className={`flex max-w-[75%] flex-col gap-1 ${isBot ? "items-start" : "items-end"}`}
      >
        <div
          className={`rounded-2xl leading-relaxed ${isNotice
              ? "text-xs italic text-muted-foreground bg-transparent border border-border/40 px-3 py-2"
              : `px-4 py-2.5 text-sm ${isBot
                ? "bg-[hsl(var(--chat-bot-bg))] text-foreground"
                : "bg-[hsl(var(--chat-user-bg))] text-foreground"
              }`
            }`}
        >
          {message.content}
        </div>
        <span
          className="text-[10px] text-[hsl(var(--chat-timestamp))]"
          aria-label={`Enviado ${formattedTime}`}
        >
          {formattedTime}
        </span>
      </div>

      {!isBot && (
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary">
          <User className="h-4 w-4" aria-hidden="true" />
        </div>
      )}
    </div>
  );
};

export default ChatMessage;
