import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useTranslation } from "react-i18next";
import Cookies from 'js-cookie';
import { useState } from "react";

const COOKIE_KEY = 'legal_age';

interface RootProps {
    href: string
    className?: string | undefined;
    children: React.ReactNode;
}

export function LegalAgeLink({ href, className, children }: RootProps) {
    const { t } = useTranslation();
    const [open, setOpen] = useState<boolean>(false);

    const openUrl = () => window.open(href, '_blank', 'noopener,noreferrer');

    const handleClick = () => Cookies.get(COOKIE_KEY) === '1' ? openUrl() : setOpen(true);

    const handleConfirm = () => {
        Cookies.set(COOKIE_KEY, '1');
        openUrl();
        setOpen(false);
    };

    return (
        <>
            <span
                onClick={handleClick}
                className={className}
            >{children}</span>

            <AlertDialog open={open} onOpenChange={setOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("legalAgeAlert.title")}</AlertDialogTitle>
                        <AlertDialogDescription>{t("legalAgeAlert.description")}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t("no")}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirm}>
                            {t("yes")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}