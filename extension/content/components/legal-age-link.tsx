import i18n from "@/lib/i18n";
import { ComponentChildren } from 'preact';
import { renderQuestionDialog } from "./question-dialog";

let isLegaAge: boolean = false;

interface RootProps {
    href: string
    className?: string | undefined;
    children: ComponentChildren;
}

export function LegalAgeLink({ href, className, children }: RootProps) {
    const openUrl = () => window.open(href, '_blank', 'noopener,noreferrer');

    /**
     * Asks the user for their age, and after confirmation, redirects them to the appropriate website.
     */
    const handleClick = () => {
        if (isLegaAge) {
            openUrl();
            return;
        }
        renderQuestionDialog({
            title: i18n.t("legalAgeAlert.title"),
            description: i18n.t("legalAgeAlert.description"),
            buttons: [
                {
                    text: i18n.t("no"),
                    style: "outline",
                },
                {
                    text: i18n.t("yes"),
                    style: "primary",
                    onClick: () => {
                        isLegaAge = true;
                        openUrl();
                    }
                }
            ]
        });
    };

    return (
        <span
            onClick={handleClick}
            className={className}
        ><>{children}</></span>
    );
}