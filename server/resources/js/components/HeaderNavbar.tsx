import { cn } from "@/lib/utils";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { HTMLAttributeAnchorTarget } from "react";
import Linker from "./Linker";
import FloatingHamburger from "./FloatingHamburger";
import { useMobileMenu } from "@/hooks/useMobileMenu";

export default function HeaderNavbar() {
    const { pathname } = useLocation();
    const { t } = useTranslation();
    const { isOpen, isVisible, toggleMenu } = useMobileMenu();

    const navItems: {
        name: string;
        href: string;
        target?: HTMLAttributeAnchorTarget | undefined;
    }[] = [
            { name: t("home"), href: "/" },
            {
                name: t("download"),
                href: "https://chromewebstore.google.com/detail/oicfghfgplgplodmidellkbfoachacjb?utm_source=movietimecod",
                target: "_blank"
            },
            { name: t("timecodes"), href: "/movies/timecodes" },
            { name: t("faq"), href: "/faq" },
            {
                name: "Telegram",
                href: "https://t.me/+B-6MNbF-t6cyZDVi",
                target: "_blank"
            },
        ];

    return (
        <>
            <header className="sm:my-6 flex items-center justify-center static sm:sticky top-4 left-0 right-0 sm:z-20 px-4">
                <Link to='/' className={cn("flex items-center mb-4 gap-2.5",
                    pathname == '/' && "hidden"
                )}>
                    <div className="sm:hidden size-7 relative select-none">
                        <img src="/images/icon.gif" className="size-full rounded-full absolute z-1" />
                        <div className="size-5 bg-[#598e3f] blur-md rounded-full absolute z-0 -left-0.5 -bottom-0.5 opacity-45" />
                    </div>
                    <div className="sm:hidden text-2xl font-nunito font-extrabold text-shadow-md/40 text-shadow-white/30">Movie Timecode</div>
                </Link>

                <nav className="bg-[#2e2f33] rounded-full h-11 px-1 hidden sm:flex items-center justify-center border-border border gap-1 shadow-md shadow-black/30">{navItems.map((item, index) => <Linker
                    key={index}
                    target={item.target}
                    className={cn(
                        "flex items-center justify-center px-3 h-9 text-sm rounded-full font-normal cursor-pointer select-none",
                        pathname === item.href ? "bg-neutral-900 text-white" : "hover:bg-neutral-900/70 text-white/70 hover:text-white/95 duration-300"
                    )}
                    href={item.href}>{item.name}</Linker>)}
                </nav>
            </header>
            <FloatingHamburger hidden="sm" isOpen={isOpen} onToggle={() => toggleMenu()} />
            {isOpen && <>
                <div className={cn("fixed top-0 left-0 right-0 -bottom-20 bg-background/50 backdrop-blur-md z-20 pointer-events-none duration-300",
                    isVisible ? "opacity-100" : "opacity-0"
                )} />
                <div className={cn("fixed top-0 left-0 right-0 bottom-0 z-30 overflow-hidden duration-300",
                    isVisible ? "opacity-100" : "opacity-0"
                )}>
                    <div className="relative z-10 flex flex-col p-4 gap-1 overflow-auto max-h-screen">{navItems.map((item, index) => <Linker
                        key={index}
                        target={item.target}
                        onClick={() => toggleMenu()}
                        className={cn(
                            "px-4 py-2 text-base rounded-lg font-medium cursor-pointer select-none",
                            pathname === item.href ? "bg-[#2e2f33]/40 text-foreground" : "hover:bg-[#2e2f33]/40 text-foreground/70 hover:text-foreground duration-300"
                        )}
                        href={item.href}>{item.name}</Linker>)}</div>
                </div>
            </>}
        </>
    );
}