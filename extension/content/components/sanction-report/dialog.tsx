import { useState } from "preact/hooks";
import { X } from "lucide-react";
import { removeDialog, renderDialog } from "@/utils/dialog";
import { MovieSearchItem } from "@/types/movie";
import i18n from "@/lib/i18n";
import SearchMovie from "../movie-check/search";
import { renderQuestionDialog } from "../question-dialog";
import { LoadingSpinner } from "../ui/loading";
import SanctionReportForm from "./form";

interface RootProps {
    title: string;
    year?: number | null;
};

const SanctionReportDialog = ({ title, year = null }: RootProps) => {
    const [isLoading, setLoading] = useState<boolean>(false);
    const [movie, setMovie] = useState<MovieSearchItem | null>(null);
    const [autoSelect, setAutoSelect] = useState<boolean>(true);

    /**
     * Closes the dialog and shows a message.
     * @param description - message text
     */
    const showMessage = (description: string) => {
        dismissSanctionReportDialog();
        renderQuestionDialog({
            title: i18n.t("reportSanction"),
            description,
            buttons: [{ text: i18n.t("close"), style: "primary" }]
        });
    };

    return (
        <div className="mt-m-4 mt-w-full mt-h-calc_100vh_2rem mt-min-h-60 mt-max-w-xl mt-rounded-2xl mt-bg-background mt-border mt-border-border mt-overflow-hidden mt-relative mt-flex mt-flex-col">
            <X onClick={dismissSanctionReportDialog} size={24} className="mt-absolute mt-top-6 mt-right-6 mt-z-1 mt-text-primary mt-cursor-pointer mt-duration-300 mt-hover:opacity-60" />
            {!movie && <SearchMovie
                title={title}
                year={year}
                heading={i18n.t("reportSanction")}
                autoSelect={autoSelect}
                onSelected={(item) => { setLoading(false); setMovie(item); }}
                onError={showMessage}
                onLoading={setLoading} />}
            {movie && <SanctionReportForm
                movie={movie}
                onChangeMovie={() => { setAutoSelect(false); setMovie(null); }}
                onSuccess={() => showMessage(i18n.t("sanctionReportSent"))}
                onError={showMessage}
                onLoading={setLoading} />}
            <LoadingSpinner isLoading={isLoading} dark />
        </div>
    );
};

/**
 * Renders the SanctionReportDialog in a dialog container.
 * @param props - dialog props
 */
let container: HTMLDivElement;
export const renderSanctionReportDialog = (props: RootProps) => renderDialog("sanction-report", <SanctionReportDialog {...props} />, (e) => container = e);

/**
 * Dismisses the SanctionReportDialog.
 */
export const dismissSanctionReportDialog = () => {
    if (!container) return;
    removeDialog(container);
};
