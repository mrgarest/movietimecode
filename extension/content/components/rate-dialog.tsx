import { useEffect, useState } from "react";
import { Check, Chrome, Github, Link, LucideIcon } from "lucide-react";
import { removeDialog, renderDialog } from "@/utils/dialog";
import { copy } from "@/utils/helpers";
import i18n from "@/lib/i18n";
import { settings, shouldShowRateDialog } from "@/utils/settings";
import config from "config";
import { Button } from "./ui/button";

interface RootProps {
    onDismiss?: () => void;
};

interface RateItemProps {
    icon: LucideIcon;
    title: string;
    description: string;
    role?: "button" | "link";
    onClick: () => void;
};

const RateItem = ({ icon: Icon, title, description, role = "button", onClick }: RateItemProps) => (
    <Button
        variant="outline"
        role={role}
        className="mt:h-auto mt:justify-start mt:gap-3 mt:px-4 mt:py-3"
        onClick={onClick}>
        <Icon className="mt:size-6 mt:shrink-0" />
        <div className="mt:flex mt:flex-col mt:gap-0.5 mt:text-left">
            <div className="mt:text-sm mt:font-semibold mt:leading-normal">{title}</div>
            <div className="mt:text-xs mt:text-muted mt:font-normal mt:leading-normal">{description}</div>
        </div>
    </Button>
);

const RateLink = ({ href, ...props }: Omit<RateItemProps, "role" | "onClick"> & { href: string }) => (
    <RateItem {...props} role="link" onClick={() => window.open(href, "_blank", "noopener,noreferrer")} />
);

const CopyLinkItem = () => {
    const [status, setStatus] = useState<"copied" | "failed" | null>(null);

    useEffect(() => {
        if (!status) return;
        const timer = setTimeout(() => setStatus(null), 3000);
        return () => clearTimeout(timer);
    }, [status]);

    const handleCopy = async () => setStatus(await copy(config.homepageUrl) ? "copied" : "failed");

    const description = {
        copied: i18n.t("rateDialog.share.copied"),
        failed: i18n.t("rateDialog.share.failed"),
    };

    return (
        <RateItem
            icon={status === "copied" ? Check : Link}
            title={i18n.t("rateDialog.share.title")}
            description={status ? description[status] : i18n.t("rateDialog.share.description")}
            onClick={handleCopy} />
    );
};

const RateDialog = ({ onDismiss }: RootProps) => (
    <div className="mt:m-4 mt:w-full mt:max-w-md mt:max-h-[calc(100vh-2rem)] mt:rounded-2xl mt:bg-background mt:border mt:border-border mt:overflow-auto mt:p-6 mt:flex mt:gap-4 mt:flex-col">
        <div className="mt:text-xl mt:text-foreground mt:font-bold">{i18n.t("rateDialog.title")}</div>
        <div className="mt:text-sm mt:text-muted mt:font-normal mt:leading-normal">{i18n.t("rateDialog.description")}</div>
        <div className="mt:flex mt:flex-col mt:gap-2.5">
            <RateLink
                icon={Chrome}
                title={i18n.t("rateDialog.store.title")}
                description={i18n.t("rateDialog.store.description")}
                href={`${config.chromeWebStoreUrl}/reviews`} />
            <RateLink
                icon={Github}
                title={i18n.t("rateDialog.github.title")}
                description={i18n.t("rateDialog.github.description")}
                href={config.gitHubUrl} />
            <CopyLinkItem />
        </div>
        <div className="mt:flex mt:justify-end">
            <Button onClick={() => { dismissRateDialog(); onDismiss?.(); }}>
                <span>{i18n.t("close")}</span>
            </Button>
        </div>
    </div>
);

/**
 * Renders the RateDialog in a dialog container.
 * @param props - dialog props
 */
let container: HTMLDivElement | undefined;
export const renderRateDialog = (props: RootProps = {}) => {
    if (container?.isConnected) return;
    renderDialog("rate", <RateDialog {...props} />, (e) => container = e);
};

/**
 * Runs the action. If it is time to ask for a rating, shows the RateDialog first and runs the action after it is closed.
 * @param action - action to run
 */
export const runAfterRateDialog = (action: () => void) => {
    if (shouldShowRateDialog()) renderRateDialog({ onDismiss: action });
    else action();
};

/**
 * Dismisses the RateDialog and remembers it, so it is not shown again.
 */
export const dismissRateDialog = () => {
    if (!container) return;
    removeDialog(container);
    container = undefined;
    settings.set({ rateDialogShown: true }).catch((e) => {
        if (config.debug) {
            console.error(e);
        }
    });
};
