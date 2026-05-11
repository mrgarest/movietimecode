import { PropsWithChildren, useEffect, useState } from "react"

interface ClientOnlyProps extends PropsWithChildren {
    asChild?: boolean
    className?: string
}

export function ClientOnly({ children, asChild = false, className }: ClientOnlyProps) {
    const [isClient, setIsClient] = useState<boolean>(false);
    useEffect(() => setIsClient(true), []);
    
    if (asChild) return isClient ? <>{children}</> : null;
    return <div className={className}>{isClient ? children : null}</div>;
}