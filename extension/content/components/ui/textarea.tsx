import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * shadcn/ui Textarea for content scripts.
 */
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
    return (
        <textarea
            data-slot="textarea"
            className={cn("mt-input mt-textarea", className)}
            {...props}
        />
    );
}

export { Textarea };
