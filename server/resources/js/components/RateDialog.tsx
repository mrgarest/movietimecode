import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Chrome, Github, Link, LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface RootProps {
    open: boolean;
    onClose: () => void;
}

interface RateItemProps {
    icon: LucideIcon;
    title: string;
    description: string;
}

const itemClassName = "h-auto justify-start gap-3 px-4 py-3 has-[>svg]:px-4 rounded-2xl whitespace-normal";

const RateItemContent = ({ icon: Icon, title, description }: RateItemProps) => (
    <>
        <Icon className="size-6" />
        <div className="flex flex-col gap-0.5 text-left">
            <div className="text-sm font-semibold">{title}</div>
            <div className="text-xs text-muted-foreground font-normal">{description}</div>
        </div>
    </>
);

const RateLink = ({ href, ...props }: RateItemProps & { href: string }) => (
    <Button asChild variant="outline" className={itemClassName}>
        <a href={href} target="_blank" rel="noopener noreferrer"><RateItemContent {...props} /></a>
    </Button>
);

const CopyLinkItem = () => {
    const { t } = useTranslation();
    const [status, setStatus] = useState<"copied" | "failed" | null>(null);

    useEffect(() => {
        if (!status) return;
        const timer = setTimeout(() => setStatus(null), 3000);
        return () => clearTimeout(timer);
    }, [status]);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(window.location.origin);
            setStatus("copied");
        } catch {
            setStatus("failed");
        }
    };

    const description = {
        copied: t("rateDialog.share.copied"),
        failed: t("rateDialog.share.failed"),
    };

    return (
        <Button variant="outline" className={itemClassName} onClick={handleCopy}>
            <RateItemContent
                icon={status === "copied" ? Check : Link}
                title={t("rateDialog.share.title")}
                description={status ? description[status] : t("rateDialog.share.description")} />
        </Button>
    );
};

export default function RateDialog({ open, onClose }: RootProps) {
    const { t } = useTranslation();

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent
                showCloseButton={false}
                className="sm:max-w-md rounded-2xl max-h-[calc(100vh-2rem)] overflow-auto"
                onInteractOutside={(e) => e.preventDefault()}
                onOpenAutoFocus={(e) => {
                    e.preventDefault();
                    (e.currentTarget as HTMLElement).focus();
                }}>
                <DialogHeader className="text-left">
                    <DialogTitle className="text-xl font-bold">{t("rateDialog.title")}</DialogTitle>
                    <DialogDescription>{t("rateDialog.description")}</DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-2.5">
                    <CopyLinkItem />
                    <RateLink
                        icon={Github}
                        title={t("rateDialog.github.title")}
                        description={t("rateDialog.github.description")}
                        href="https://github.com/mrgarest/movietimecode" />
                    <RateLink
                        icon={Chrome}
                        title={t("rateDialog.store.title")}
                        description={t("rateDialog.store.description")}
                        href="https://chromewebstore.google.com/detail/oicfghfgplgplodmidellkbfoachacjb/reviews" />
                </div>
                <DialogFooter className="flex-row justify-end">
                    <Button onClick={onClose}>{t("close")}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
