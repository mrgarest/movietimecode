import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: ComponentProps<"textarea">) {
    return (
        <textarea
            data-slot="textarea"
            className={cn("mt-input mt-textarea", className)}
            {...(props as object)}
        />
    );
}

export { Textarea };
