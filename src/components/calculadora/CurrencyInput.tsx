import { useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";

interface CurrencyInputProps {
    id?: string;
    value: number;
    onChange: (value: number) => void;
    placeholder?: string;
    className?: string;
}

function formatCurrency(cents: number): string {
    if (cents === 0) return "";
    const reais = cents / 100;
    return reais.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

function parseCurrencyInput(raw: string): number {
    // Strip everything that is not a digit
    const digits = raw.replace(/\D/g, "");
    return parseInt(digits, 10) || 0;
}

export function CurrencyInput({ id, value, onChange, placeholder, className }: CurrencyInputProps) {
    const inputRef = useRef<HTMLInputElement>(null);

    // value is in reais (e.g. 1500.50), we work internally with cents
    const centsFromValue = Math.round(value * 100);

    const handleChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const raw = e.target.value;
            const cents = parseCurrencyInput(raw);
            onChange(cents / 100);
        },
        [onChange]
    );

    const displayValue = formatCurrency(centsFromValue);

    return (
        <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                R$
            </span>
            <Input
                ref={inputRef}
                id={id}
                type="text"
                inputMode="numeric"
                className={`pl-10 ${className || ""}`}
                value={displayValue}
                onChange={handleChange}
                placeholder={placeholder || "0,00"}
            />
        </div>
    );
}
