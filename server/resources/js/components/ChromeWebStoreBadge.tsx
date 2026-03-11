import { useTranslation } from 'react-i18next';

export default function ChromeWebStoreBadge() {
    const { t } = useTranslation();

    return (
        <a
            href="https://chromewebstore.google.com/detail/oicfghfgplgplodmidellkbfoachacjb?utm_source=movietimecod"
            target="_blank"
            rel="noopener noreferrer"
            className="flex gap-3 items-center bg-white shadow-xl/20 shadow-foreground/50 px-3 py-1.5 rounded-lg hover:opacity-80 duration-300 select-none cursor-pointer">
            <img
                className="size-8 pointer-events-none"
                src="/images/google-chrome-web-store_icon.svg" />
            <div className="pointer-events-none">
                <div className="text-sm text-black/80 font-bold">{t("download")}</div>
                <div className="text-xs text-black/60 font-medium">Chrome Web Store</div>
            </div>
        </a>
    );
}