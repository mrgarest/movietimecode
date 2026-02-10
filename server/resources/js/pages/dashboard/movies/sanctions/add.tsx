import { useTranslation } from "react-i18next";
import MovieSanctionAddForm from "@/components/movies/MovieSanctionAddForm";
import { useState } from "react";
import { SpinnerFullScreen } from "@/components/ui/spinner";
import { useNavigate } from "react-router-dom";
import { useSeo } from "@/hooks/useSeo";

export default function MovieSanctionAddPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { setSeo } = useSeo();
    const [isLoading, setLoading] = useState<boolean>(false);
    setSeo({ title: t('reportSanction') });

    return (
        <div>
            <h1 className="text-2xl font-bold mb-6">{t("reportSanction")}</h1>
            <MovieSanctionAddForm
                onSuccess={() => navigate('/dashboard/movies/sanctions')}
                onLoading={setLoading} />
            {isLoading && <SpinnerFullScreen />}
        </div>
    );
}