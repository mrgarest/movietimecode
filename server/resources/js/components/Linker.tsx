import { Link } from "@inertiajs/react";
import { HTMLAttributeAnchorTarget, MouseEventHandler, ReactNode } from "react";

export default function Linker({ href, target, children, className, onClick }: {
    href: string;
    target?: HTMLAttributeAnchorTarget | undefined;
    children: ReactNode;
    className?: string;
    onClick?: MouseEventHandler | undefined;
}) {
    if (href.startsWith("http://") || href.startsWith("https://")) {
        return (
            <a href={href} target={target} className={className} onClick={onClick}>
                {children}
            </a>
        );
    }

    return (
        <Link href={href} className={className} onClick={onClick}>
            {children}
        </Link>
    );
}

