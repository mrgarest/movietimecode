import { Loader2Icon } from "lucide-react"
import { cn } from "@/lib/utils"

function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
    return (
        <Loader2Icon
            role="status"
            aria-label="Loading"
            className={cn("size-10 animate-spin", className)}
            {...props}
        />
    )
}

function SpinnerFullScreen({ className, ...props }: React.ComponentProps<"svg">) {
    return (
        <div className="pointer-events-auto fixed z-50 top-0 left-0 right-0 bottom-0 bg-black/50 flex items-center justify-center">
            <Spinner
                className={cn("size-20", className)}
                {...props} />
        </div>
    )
}

export { Spinner, SpinnerFullScreen }
