import { useTranslation } from "react-i18next";
import MovieSanctionAddForm from "@/components/movies/MovieSanctionAddForm";
import { useState } from "react";
import { SpinnerFullScreen } from "@/components/ui/spinner";
import { MetaTag } from "@/components/MetaTag";
import { router } from "@inertiajs/react";

export default function MovieSanctionAddPage() {
    const { t } = useTranslation();
    const [isLoading, setLoading] = useState<boolean>(false);

    return (
        <>
            <MetaTag title={t('reportSanction')} />
            <div>
                <h1 className="text-2xl font-bold mb-6">{t("reportSanction")}</h1>
                <MovieSanctionAddForm
                    onSuccess={() => router.visit('/dashboard/movies/sanctions')}
                    onLoading={setLoading} />
                {isLoading && <SpinnerFullScreen />}
            </div>
        </>
    );
}