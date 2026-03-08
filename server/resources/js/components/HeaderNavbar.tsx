import { cn } from "@/lib/utils";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { HTMLAttributeAnchorTarget, useEffect, useState } from "react";
import Linker from "./Linker";
import { useMobileMenu } from "@/hooks/useMobileMenu";
import Hamburger from "hamburger-react";

export default function HeaderNavbar() {
    const { pathname } = useLocation();
    const { t } = useTranslation();
    const { isOpen, isVisible, toggleMenu } = useMobileMenu();
    const [isScrolled, setIsScrolled] = useState<boolean>(false);

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

    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > (pathname == '/' ? 30 : 15));
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, [pathname]);

    return (
        <>
            <header className={cn(
                "sm:my-6 flex items-center justify-between sm:justify-center sticky top-0 sm:top-4 left-0 right-0 z-20 px-4 max-sm:h-14 duration-300",
                isScrolled && "max-sm:backdrop-blur-xl max-sm:bg-black/40 max-sm:border-b max-sm:border-foreground/10"
            )}>
                <Link to='/' className={cn(
                    "flex items-center gap-2.5 duration-300",
                    !isVisible && !isScrolled && pathname == '/' && " opacity-0"
                )}>
                    <div className="sm:hidden size-6 relative select-none">
                        <img src="/images/icon.gif" className="size-full rounded-full absolute z-1" />
                        <div className="size-5 bg-[#598e3f] blur-md rounded-full absolute z-0 -left-0.5 -bottom-0.5 opacity-45" />
                    </div>
                    <div className="sm:hidden text-xl font-nunito font-extrabold text-shadow-md/40 text-shadow-white/30">Movie Timecode</div>
                </Link>
                <div className="sm:hidden"><Hamburger
                    rounded
                    hideOutline
                    size={24}
                    toggled={isOpen}
                    onToggle={() => toggleMenu()}
                /></div>

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
            {isOpen && <>
                <div className={cn("fixed top-0 left-0 right-0 -bottom-20 bg-background/70 backdrop-blur-md z-10 pointer-events-none duration-300",
                    isVisible ? "opacity-100" : "opacity-0"
                )} />
                <div className={cn("fixed top-14 left-0 right-0 bottom-0 z-30 overflow-hidden duration-300",
                    isVisible ? "opacity-100" : "opacity-0"
                )}>
                    <div className="relative z-10 flex flex-col p-2 gap-1 overflow-auto max-h-screen">{navItems.map((item, index) => <Linker
                        key={index}
                        target={item.target}
                        onClick={() => toggleMenu()}
                        className={cn(
                            "px-2 py-2 text-base rounded-lg font-medium cursor-pointer select-none",
                            pathname === item.href ? "bg-[#626262]/40 text-foreground" : "hover:bg-[#626262]/40 text-foreground/70 hover:text-foreground duration-300"
                        )}
                        href={item.href}>{item.name}</Linker>)}</div>
                </div>
            </>}
        </>
    );
}