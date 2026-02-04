import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import type { PracticeArea } from "@/content/areas";
import { Check, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { site } from "@/config/site";

type Props = {
    area: PracticeArea | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

export function AreaDetailDialog({ area, open, onOpenChange }: Props) {
    if (!area) return null;

    const Icon = area.icon;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader className="text-left">
                    <div className="flex items-center gap-4 mb-2">
                        <div className={cn("grid size-12 place-items-center rounded-lg shadow-sm", area.gradientClass)}>
                            <Icon className="size-6 text-primary-foreground" />
                        </div>
                        <div>
                            <DialogTitle className="font-serif text-2xl">{area.title}</DialogTitle>
                            <DialogDescription>{area.description}</DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="mt-4 space-y-4">
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                        {area.content.split('\n\n').map((paragraph, i) => {
                            // Simple bold parsing: **text** -> <strong>text</strong>
                            const parts = paragraph.split(/(\*\*.*?\*\*)/g);
                            return (
                                <p key={i} className="text-foreground/90 leading-relaxed whitespace-pre-wrap mb-4 last:mb-0">
                                    {parts.map((part, j) => {
                                        if (part.startsWith('**') && part.endsWith('**')) {
                                            return <strong key={j} className="text-foreground font-semibold">{part.slice(2, -2)}</strong>;
                                        }
                                        return part;
                                    })}
                                </p>
                            );
                        })}
                    </div>

                    <div className="rounded-xl border bg-muted/30 p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <ClipboardList className="size-5 text-primary" />
                            <h4 className="font-semibold">Principais frentes de atuação</h4>
                        </div>
                        <ul className="grid gap-3 sm:grid-cols-2">
                            {area.bullets.map((bullet) => (
                                <li key={bullet} className="flex items-start gap-2 text-sm text-foreground/80">
                                    <Check className="mt-0.5 size-4 text-accent shrink-0" />
                                    <span>{bullet}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                        <Button asChild className="flex-1 bg-cta-gold text-secondary-foreground hover:opacity-90">
                            <a href={`https://wa.me/${site.contact.whatsappNumber}`} target="_blank" rel="noopener noreferrer">
                                Falar com o advogado agora
                            </a>
                        </Button>
                        <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                            Fechar
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
