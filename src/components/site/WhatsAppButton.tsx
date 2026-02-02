import { motion } from "framer-motion";
import { MessageCircle } from "lucide-react";

export function WhatsAppButton() {
    const whatsappUrl = "https://wa.me/5513997176826?text=Ol%C3%A1%2C%20vim%20do%20site%20e%20quero%20conversar%20com%20voc%C3%AA"; // Substituir pelo número real se necessário

    return (
        <motion.a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
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
        >
            <div className="relative">
                <MessageCircle className="h-7 w-7 fill-current" />
                <span className="absolute -right-1 -top-1 flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-highlight opacity-75"></span>
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-highlight"></span>
                </span>
            </div>
        </motion.a>
    );
}
