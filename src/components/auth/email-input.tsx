import { forwardRef, useId } from "react";
import { Mail } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface EmailInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  error?: string;
  containerClassName?: string;
}

/**
 * Reusable email field with icon, error slot and correct autofill/keyboard
 * hints for mobile.
 */
export const EmailInput = forwardRef<HTMLInputElement, EmailInputProps>(
  function EmailInput(
    {
      label,
      error,
      id,
      className,
      containerClassName,
      autoComplete = "email",
      placeholder = "you@company.com",
      ...rest
    },
    ref,
  ) {
    const autoId = useId();
    const inputId = id ?? autoId;
    const errorId = `${inputId}-error`;

    return (
      <div className={cn("space-y-1.5", containerClassName)}>
        {label && <Label htmlFor={inputId}>{label}</Label>}
        <div className="relative">
          <Mail
            className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
            aria-hidden="true"
          />
          <Input
            id={inputId}
            ref={ref}
            type="email"
            autoComplete={autoComplete}
            inputMode="email"
            spellCheck={false}
            autoCapitalize="none"
            placeholder={placeholder}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : undefined}
            maxLength={254}
            className={cn("ps-9", className)}
            {...rest}
          />
        </div>
        {error && (
          <p id={errorId} role="alert" className="text-xs text-destructive">
            {error}
          </p>
        )}
      </div>
    );
  },
);
