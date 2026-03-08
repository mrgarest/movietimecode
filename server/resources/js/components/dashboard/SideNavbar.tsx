import { cn } from "@/lib/utils";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { ClockFading, Home, LogOut, ScrollText, UsersRound, VideoOff } from "lucide-react";
import { useMobileMenu } from "@/hooks/useMobileMenu";
import Hamburger from "hamburger-react";

export default function SideNavbar() {
    const { pathname } = useLocation();
    const { t } = useTranslation();
    const { isOpen, isVisible, toggleMenu } = useMobileMenu();

    const navItems = [
        {
            ico: Home,
            to: '/dashboard',
            text: t('home')
        },
        {
            ico: ClockFading,
            to: '/dashboard/timecodes',
            text: t('timecodes')
        },
        {
            ico: VideoOff,
            to: '/dashboard/movies/sanctions',
            text: t('sanctions')
        },
        {
            ico: UsersRound,
            to: '/dashboard/users',
            text: t('users')
        },
        {
            ico: ScrollText,
            to: '/dashboard/events',
            text: t('events')
        },
        {
            ico: LogOut,
            to: '/logout',
            text: t('logout')
        },
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
                            to={item.to}
                            className={cn(
                                'flex items-center gap-2 px-3 py-2 font-normal rounded-md text-sm select-none cursor-pointer',
                                item.to == pathname ? 'bg-primary/10 text-primary' : 'hover:bg-neutral-800/50'
                            )}>
                            <item.ico size={16} />
                            {item.text}
                        </Link>
                    ))}
                </div>
            </div>
            {isOpen && <div
                onClick={() => toggleMenu()}
                className={cn("duration-300 fixed top-0 right-0 left-0 bottom-0 bg-black/50 backdrop-blur-xs z-20", !isVisible && 'opacity-0')} />}
            <div className={cn(
                "bg-secondary rounded-full size-12 flex items-center justify-center border-border border gap-2 shadow-md shadow-black/30 overflow-hidden fixed right-8 bottom-8 z-40",
                !isOpen && "md:hidden"
            )}>
                <div className="absolute">
                    <Hamburger
                        rounded
                        hideOutline
                        size={20}
                        toggled={isOpen}
                        onToggle={() => toggleMenu()}
                    />
                </div>
            </div>
        </>
    );
}