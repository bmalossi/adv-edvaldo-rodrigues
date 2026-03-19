import { useCallback } from "react";
import { Input } from "@/components/ui/input";

interface PhoneInputProps {
    id?: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
}

function formatPhone(digits: string): string {
    const d = digits.replace(/\D/g, "").slice(0, 11);
    if (d.length === 0) return "";
    if (d.length <= 2) return `(${d}`;
    if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function PhoneInput({ id, value, onChange, placeholder, className }: PhoneInputProps) {
    const handleChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const raw = e.target.value;
            const digits = raw.replace(/\D/g, "").slice(0, 11);
            onChange(digits);
        },
        [onChange]
    );

    return (
        <Input
            id={id}
            type="tel"
            inputMode="tel"
            className={className}
            value={formatPhone(value)}
            onChange={handleChange}
            placeholder={placeholder || "(11) 98888-8888"}
        />
    );
}
