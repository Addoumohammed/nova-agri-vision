import { forwardRef, useId } from "react";
import type { ComponentType } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface TextFieldProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: ComponentType<{ className?: string }>;
  error?: string;
  hint?: string;
  containerClassName?: string;
}

/**
 * Generic labelled input with optional leading icon, error and hint slots.
 * Handles a11y wiring (label/for, aria-invalid, aria-describedby) via useId
 * so consumers only pass content.
 */
export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  function TextField(
    { label, icon: Icon, error, hint, id, className, containerClassName, ...rest },
    ref,
  ) {
    const autoId = useId();
    const inputId = id ?? autoId;
    const errorId = `${inputId}-error`;
    const hintId = `${inputId}-hint`;
    const describedBy = error ? errorId : hint ? hintId : undefined;

    return (
      <div className={cn("space-y-1.5", containerClassName)}>
        <Label htmlFor={inputId}>{label}</Label>
        <div className="relative">
          {Icon && (
            <Icon
              className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
            />
          )}
          <Input
            id={inputId}
            ref={ref}
            aria-invalid={!!error}
            aria-describedby={describedBy}
            className={cn(Icon && "ps-9", className)}
            {...rest}
          />
        </div>
        {error ? (
          <p id={errorId} role="alert" className="text-xs text-destructive">
            {error}
          </p>
        ) : hint ? (
          <p id={hintId} className="text-xs text-muted-foreground">
            {hint}
          </p>
        ) : null}
      </div>
    );
  },
);
