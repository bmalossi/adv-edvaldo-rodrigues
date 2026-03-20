import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Calendar } from "lucide-react";

interface DateInputProps {
    id?: string;
    value: string; // yyyy-mm-dd
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
}

export function DateInput({ id, value, onChange, placeholder, className }: DateInputProps) {
    const [displayValue, setDisplayValue] = useState("");

    // Sync internal state when prop 'value' changes externally
    useEffect(() => {
        if (!value) {
            setDisplayValue("");
            return;
        }
        // Only update if it's different to avoid cursor jumps
        const [y, m, d] = value.split("-");
        const formatted = `${d}/${m}/${y}`;
        if (formatted !== displayValue && value.length === 10) {
            setDisplayValue(formatted);
        }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value;
        let v = rawValue.replace(/\D/g, "");

        // Allow deleting
        if (rawValue.length < displayValue.length && (displayValue.endsWith("/") || displayValue.endsWith("/"))) {
            // handle backspace on slash if needed, but simple slicing is usually fine
        }

        if (v.length > 8) v = v.slice(0, 8);

        let masked = v;
        if (v.length > 2) masked = v.slice(0, 2) + "/" + v.slice(2);
        if (v.length > 4) masked = v.slice(0, 2) + "/" + v.slice(2, 4) + "/" + v.slice(4);

        setDisplayValue(masked);

        // Only prop up if it's a potentially valid date length
        if (v.length === 8) {
            const day = v.slice(0, 2);
            const month = v.slice(2, 4);
            const year = v.slice(4);
            onChange(`${year}-${month}-${day}`);
        } else if (v.length === 0) {
            onChange("");
        }
    };

    return (
        <div className="relative">
            <Input
                id={id}
                type="text"
                inputMode="numeric"
                placeholder={placeholder || "dd/mm/aaaa"}
                value={displayValue}
                onChange={handleChange}
                className={className}
                maxLength={10}
            />
            <Calendar className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none opacity-50" />
        </div>
    );
}
