import { Play } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
    onClick?: (e: React.MouseEvent) => void;
    size?: "sm" | "md";
    className?: string;
}

export function PlayButton({ onClick, size = "md", className }: Props) {
    return (
        <div
            className={cn(
                "bg-black/60 backdrop-blur-xs rounded-full hover:scale-120 active:scale-95 transition-transform duration-300 cursor-pointer border border-white/5",
                size === "sm" ? "p-2" : "p-3",
                className
            )}
            onClick={onClick}>
            <Play
                className={cn("fill-white stroke-white", size === "sm" ? "size-5" : "size-6")}
                strokeWidth={1.5}
            />
        </div>
    );
}
