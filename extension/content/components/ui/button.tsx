import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva("mt-button", {
    variants: {
        variant: {
            default: "mt-primary",
            outline: "mt-outline",
            ghost: "",
        },
        size: {
            default: "",
            icon: "mt-icon",
        },
    },
    defaultVariants: {
        variant: "default",
        size: "default",
    },
});

function Button({
    className,
    variant = "default",
    size = "default",
    asChild = false,
    disabled = false,
    onClick,
    onKeyDown,
    ...props
}: React.ComponentProps<"div"> &
    VariantProps<typeof buttonVariants> & {
        asChild?: boolean;
        disabled?: boolean;
    }) {
    const Comp = asChild ? Slot : "div";

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        onKeyDown?.(e);
        if (e.defaultPrevented || disabled) return;
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            e.currentTarget.click();
        }
    };

    return (
        <Comp
            role="button"
            tabIndex={disabled ? -1 : 0}
            aria-disabled={disabled || undefined}
            data-slot="button"
            data-variant={variant}
            data-size={size}
            className={cn(buttonVariants({ variant, size }), disabled && "mt-disabled", className)}
            onClick={disabled ? undefined : onClick}
            onKeyDown={handleKeyDown}
            {...props}
        />
    );
}

export { Button, buttonVariants };
