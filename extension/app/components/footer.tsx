import i18n from '@/lib/i18n';
import config from 'config';

export const Footer = () => {
    const navItems: {
        name: string;
        href: string;
    }[] = [
            { name: i18n.t("site"), href: config.baseUrl },
            { name: i18n.t("privacyPolicyShort"), href: config.privacyPolicyUrl },
            { name: "Telegram", href: config.telegramChannelUrl },
            { name: "GitHub", href: "https://github.com/mrgarest/movietimecode" }
        ];

    return (
        <div className="text-center font-semibold mt-8 pb-4 space-y-1.5">
            <div className="flex items-center justify-center gap-3">
                {navItems.map((item, index) => <a key={index} href={item.href} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-muted duration-300 hover:text-foreground select-none">{item.name}</a>)}
            </div>
            <div className="text-[10px] text-muted/80 font-medium space-y-0.5">
                <div>{i18n.t("appName")} v{config.version}</div>
                <div>Developed by Garest</div>
            </div>
        </div>
    );
}
