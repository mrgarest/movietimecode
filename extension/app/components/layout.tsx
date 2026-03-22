import { Outlet, Link, useLocation } from "react-router-dom";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Aperture, BotMessageSquare, Command, HardDriveDownload, LucideIcon, Settings, User } from "lucide-react";
import { Footer } from "./footer";
import i18n from "@/lib/i18n";

const navItems: { ico?: LucideIcon; svg?: ReactNode; to: string; text: string; }[] = [
    {
        ico: Settings,
        to: '/settings',
        text: i18n.t('settings')
    },
    {
        ico: Aperture,
        to: '/settings/obs-control',
        text: i18n.t('obsManagement')
    },
    {
        svg: (<svg xmlns="http://www.w3.org/2000/svg" version="1.1" id="Capa_1" x="0px" y="0px" viewBox="0 0 24 24" width="16" height="16"><g id="Layer_1-2"><path fill="currentColor" d="M6,0L1.714,4.286v15.429h5.143V24l4.286-4.286h3.429L22.286,12V0H6z M20.571,11.143l-3.429,3.429h-3.429l-3,3v-3H6.857     V1.714h13.714V11.143z" /><rect fill="currentColor" x="16.286" y="4.714" width="1.714" height="5.143" /><rect x="11.571" fill="currentColor" y="4.714" width="1.714" height="5.143" /></g></svg>),
        to: '/settings/twitch',
        text: "Twitch"
    },
    {
        ico: BotMessageSquare,
        to: '/settings/chatbot',
        text: i18n.t('chatbot')
    },
    {
        ico: Command,
        to: '/settings/hotkeys',
        text: i18n.t('hotkeys')
    },
    {
        ico: User,
        to: '/user',
        text: i18n.t('user')
    },
    {
        ico: HardDriveDownload,
        to: '/backup',
        text: i18n.t('backup')
    }
]

export const SideNavLayout = () => {
    const { pathname } = useLocation();
    return (
        <div className="container pt-6 grid grid-cols-[auto_1fr] gap-8 min-h-screen">
            <div className="relative">
                <div className="flex flex-col space-y-0.5 w-48 sticky top-6">
                    {navItems.map((item, index) => (
                        <Link
                            key={index}
                            to={item.to}
                            className={cn('flex items-center font-medium gap-2 px-3 py-2 rounded-md text-sm select-none cursor-pointer', (item.to == pathname ? 'bg-primary/95 text-primary-foreground' : 'hover:bg-primary/10'))}>
                            {item.ico && <item.ico size={16} />}
                            {item.svg && item.svg}
                            {item.text}
                        </Link>
                    ))}
                </div>
            </div>
            <div className="grid grid-rows-[1fr_auto]">
                <Outlet />
                <Footer />
            </div>
        </div>
    );
}
