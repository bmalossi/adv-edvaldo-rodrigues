import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertCircle } from "lucide-react";
import React from "react";

interface LabelTooltipProps extends React.ComponentPropsWithoutRef<typeof Label> {
    tooltip?: string;
}

export function LabelTooltip({ tooltip, children, className, ...props }: LabelTooltipProps) {
    if (!tooltip) {
        return <Label className={className} {...props}>{children}</Label>;
    }

    return (
        <Label className={`flex items-center gap-2 ${className || ""}`} {...props}>
            {children}
            <TooltipProvider>
                <Tooltip delayDuration={300}>
                    <TooltipTrigger type="button" tabIndex={-1} className="cursor-help text-muted-foreground hover:text-primary transition-colors focus:outline-none">
                        <AlertCircle className="h-4 w-4" />
                        <span className="sr-only">Informação adicional</span>
                    </TooltipTrigger>
                    <TooltipContent side="top" align="center" className="max-w-[280px] sm:max-w-sm p-3">
                        <p className="text-sm font-normal text-muted-foreground leading-relaxed">{tooltip}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </Label>
    );
}
