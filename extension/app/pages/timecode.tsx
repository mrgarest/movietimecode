import { useLocation } from "react-router-dom";
import NotFound from "./not-found";
import config from "config";
import { User } from "@/types/user";
import { useEffect, useState } from "react";
import { Button } from "@/app/components/ui/button";
import { login } from "@/utils/navigation";
import { cn } from "@/lib/utils";
import { MovieSearchItem } from "@/types/movie";
import { Footer } from "@/app/components/footer";
import { getUser } from "@/utils/user";
import i18n from "@/lib/i18n";
import TimecodeEditorPage from "@/app/components/timecode/timecode-editor";
import SearchMoviePage from "@/app/components/timecode/search-movie";

export default function TimecodePage() {
    const [isLoading, setLoading] = useState<boolean>(true);
    const [finalMessage, setFinalMessage] = useState<string | null>(null);
    const [isHideContent, setHideContent] = useState<boolean>(true);
    const [step, setStep] = useState<number>(0);
    const [movie, setMovie] = useState<MovieSearchItem | null>(null);

    // Extracts parameters from URL
    const location = useLocation();
    const searchParams = new URLSearchParams(location.search);
    const timecodeId = searchParams.get("id");
    const query = searchParams.get("q");
    const year = searchParams.get("y");

    useEffect(() => {
        // Removes parameters from URL
        window.history.replaceState(null, "", window.location.href.split("?")[0]);

        /**
         * Checks authorization and launches a method to retrieve data from the backend.
         */
        const init = async () => {
            try {
                const user: User | undefined = await getUser();
                if (!user) {
                    setHideContent(false);
                    setLoading(false);
                    return;
                }
                setStep(timecodeId ? 2 : 1);
            } catch (e) {
                if (config.debug) {
                    console.error(e);
                }
            }
            setHideContent(false);
            setLoading(false);
        };
        init();
    }, []);

    /**
     * Saves the selected movie and proceeds to the next step.
     * @param movie
     */
    const handleSelectedMovie = (movie: MovieSearchItem) => {
        setMovie(movie);
        setStep(2);
    };

    if (!query && !timecodeId) {
        return <NotFound />
    }

    // Displaying the final message
    if (finalMessage != null) {
        return (<div className="min-h-screen flex items-center justify-center"><div className="text-2xl text-foreground font-medium text-center p-4">{finalMessage}</div></div>);
    }

    return (
        <>
            <div className={cn("max-w-160 mx-auto w-full pt-8 gap-8 min-h-screen space-y-8", isHideContent && 'hidden')}>
                {step == 0 && <div className="space-y-4 text-center">
                    <div className="text-2xl text-foreground font-bold">{i18n.t("authorizationRequired")}</div>
                    <div className="text-base text-foreground">{i18n.t("authorizationRequiredDescription")}</div>
                    <Button onClick={() => login()}>{i18n.t("login")}</Button>
                </div>
                }
                {step == 1 && query && <SearchMoviePage
                    query={query}
                    year={Number(year) || null}
                    onSelected={handleSelectedMovie}
                    onMessage={setFinalMessage}
                    onHideContent={setHideContent}
                    onLoading={setLoading} />
                }
                {step == 2 && <TimecodeEditorPage
                    id={Number(timecodeId) || null}
                    movieSearch={movie}
                    onMessage={setFinalMessage}
                    onLoading={setLoading} />
                }
                <Footer />
            </div>
            {isLoading && <div className={cn("fixed top-0 left-0 right-0 bottom-0 z-50 flex items-center justify-center pointer-events-auto overflow-hidden", !isHideContent && "bg-black/50")}>
                <div role="status">
                    <svg aria-hidden="true" className="size-18 text-gray-800 animate-spin fill-white" viewBox="0 0 100 101"
                        fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path
                            d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                            fill="currentColor" />
                        <path
                            d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                            fill="currentFill" />
                    </svg>
                    <span className="sr-only">Loading...</span>
                </div>
            </div>}
        </>
    );
}