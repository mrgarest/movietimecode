import { removeDialog, renderDialog } from "@/utils/dialog";
import SearchMovie from "./search";
import { useState } from "preact/hooks";
import { MovieSearchItem } from "@/types/movie";
import { X } from "lucide-react";
import { renderQuestionDialog } from "../question-dialog";
import Check from "./check";
import i18n from "@/lib/i18n";
import { LoadingSpinner } from "../ui/loading";

interface RootProps {
    title: string;
    year?: number | null;
};

const MovieCheckDialog = ({ title, year = null }: RootProps) => {
    const [isLoading, setLoading] = useState<boolean>(false);
    const [step, setStep] = useState<number>(0);
    const [movie, setMovie] = useState<MovieSearchItem | null>(null);

    /**
     * Saves the selected movie and proceeds to the next step.
     * @param movie - selected movie
     */
    const handleSelectedMovie = (movie: MovieSearchItem) => {
        setLoading(true);
        setMovie(movie);
        setStep(1);
    };

    /**
     * Handles error, closes dialog and shows error message.
     * @param msg - error message
     */
    const handleError = (msg: string) => {
        setStep(-1);
        dismissMovieCheckDialog();
        renderQuestionDialog({
            title: i18n.t("movieCheck"),
            description: msg,
            buttons: [
                {
                    text: i18n.t("close"),
                    style: "primary",
                }
            ]
        });
    };

    return (
        <div className="mt-m-4 mt-w-full mt-h-calc_100vh_2rem mt-min-h-60 mt-max-w-xl mt-rounded-2xl mt-bg-background mt-border mt-border-border mt-overflow-hidden mt-relative mt-flex mt-flex-col">
            <X onClick={dismissMovieCheckDialog} size={24} className="mt-absolute mt-top-6 mt-right-6 mt-z-1 mt-text-primary mt-cursor-pointer mt-duration-300 mt-hover:opacity-60"/>
            {step == 0 && <SearchMovie title={title}
                year={year}
                onSelected={handleSelectedMovie}
                onError={handleError}
                onLoading={setLoading} />}
            {step == 1 && movie && <Check movie={movie}
                onError={handleError}
                onLoading={setLoading} />}
            <LoadingSpinner isLoading={isLoading} />
        </div>
    )
};


/**
 * Renders the MovieCheckDialog in a dialog container.
 * @param props - dialog props
 */
let container: HTMLDivElement;
export const renderMovieCheckDialog = (props: RootProps) => renderDialog("check", <MovieCheckDialog {...props} />, (e) => container = e);

/**
 * Dismisses the MovieCheckDialog.
 */
export const dismissMovieCheckDialog = () => {
    if (!container) return;
    removeDialog(container);
};