import { cn } from "@/lib/utils";
import { useTranslation } from 'react-i18next';
import { ClockFading, Home, LogOut, ScrollText, UsersRound, VideoOff } from "lucide-react";
import { useMobileMenu } from "@/hooks/useMobileMenu";
import Hamburger from "hamburger-react";
import { Link, usePage } from "@inertiajs/react";
import { ClientOnly } from "../ClientOnly";

export default function SideNavbar() {
    const { url } = usePage();
    const pathname = new URL(url, 'http://localhost').pathname;
    const { t } = useTranslation();
    const { isOpen, isVisible, toggleMenu } = useMobileMenu();

    const navItems = [
        {
            ico: Home,
            href: '/dashboard',
            text: t('home')
        },
        {
            ico: ClockFading,
            href: '/dashboard/timecodes',
            text: t('timecodes')
        },
        {
            ico: VideoOff,
            href: '/dashboard/movies/sanctions',
            text: t('sanctions')
        },
        {
            ico: UsersRound,
            href: '/dashboard/users',
            text: t('users')
        },
        {
            ico: ScrollText,
            href: '/dashboard/events',
            text: t('events')
        }
    ];

    return (
        <>
            <div className={cn(
                "fixed md:relative max-md:px-4 pt-6 duration-300",
                isVisible ? "left-0 bg-background z-30 h-screen" : "max-md:-left-54"
            )}>
                <div className="flex flex-col space-y-0.5 w-48 sticky top-6">
                    {navItems.map((item, index) => (
                        <Link
                            onClick={() => isOpen && toggleMenu()}
                            key={index}
                            href={item.href}
                            className={cn(
                                'flex items-center gap-2 px-3 py-2 font-medium rounded-md text-sm select-none cursor-pointer',
                                item.href == pathname ? 'bg-primary/95 text-primary-foreground' : 'hover:bg-primary/10'
                            )}>
                            <item.ico size={16} />
                            {item.text}
                        </Link>
                    ))}
                    <a
                        href="/logout"
                        className="flex items-center gap-2 px-3 py-2 font-medium rounded-md text-sm select-none cursor-pointer hover:bg-primary/10">
                        <LogOut size={16} />
                        {t('logout')}
                    </a>
                </div>
            </div>
            {isOpen && <div
                onClick={() => toggleMenu()}
                className={cn("duration-300 fixed top-0 right-0 left-0 bottom-0 bg-black/50 backdrop-blur-xs z-20", !isVisible && 'opacity-0')} />}
            <div className={cn(
                "bg-secondary rounded-full size-12 flex items-center justify-center border-border border gap-2 shadow-md shadow-black/30 overflow-hidden fixed right-8 bottom-8 z-40",
                !isOpen && "md:hidden"
            )}>
                <div className="absolute"><ClientOnly asChild><Hamburger
                    rounded
                    hideOutline
                    size={20}
                    toggled={isOpen}
                    onToggle={() => toggleMenu()}
                /></ClientOnly></div>
            </div>
        </>
    );
}