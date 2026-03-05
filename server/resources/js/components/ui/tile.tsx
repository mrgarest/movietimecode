import { Loader2Icon, LucideProps } from "lucide-react"
import { cn } from "@/lib/utils"
import { ForwardRefExoticComponent, RefAttributes } from "react";
import { Skeleton } from "./skeleton";

interface RootProps {
    isSkeleton?: boolean;
    ico: ForwardRefExoticComponent<Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>>;
    title: string;
    value: string;
}

export function Tile({ isSkeleton = false, ico: Icon, title, value }: RootProps) {
    return (
        <div className="border border-border rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-center border border-border rounded-xl p-2 bg-neutral-800/50 w-max">
                <Icon size={26} />
            </div>
            <div className="space-y-0.5">
                {isSkeleton ? <Skeleton className="w-full h-6 rounded border-container" /> : <div className="text-base text-foreground font-medium">{value}</div>}
                <div className="text-xs text-muted-foreground font-bold">{title}</div>
            </div>
        </div>
    )
}